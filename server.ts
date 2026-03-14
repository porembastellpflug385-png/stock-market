import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import YahooFinance from "yahoo-finance2";
import {
  createAnalysisPacket,
  defaultPreferences,
  timeframeMonths,
  type AnalysisPreferences,
  type RawChartPoint,
} from "./src/lib/market-analysis";

const yahooFinance = new YahooFinance();
const defaultServerProvider =
  process.env.OPENAI_API_KEY
    ? {
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || process.env.LLM_MODEL || 'gpt-4.1-mini',
      }
    : null;

type FallbackQuote = {
  symbol: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  trailingPE?: number;
  dividendYield?: number;
  exchange?: string;
};

type ThirdPartyLLMConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

type ThirdPartyMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ThirdPartyDebug = {
  requestUrl: string;
  requestBodyPreview: string;
  responseStatus?: number;
  responseContentType?: string | null;
  responsePreview?: string;
};

const normalizeChatCompletionsUrl = (baseUrl: string) => {
  const sanitized = baseUrl.trim().replace(/\/+$/, '');
  if (sanitized.endsWith('/chat/completions')) return sanitized;
  if (sanitized.endsWith('/v1')) return `${sanitized}/chat/completions`;
  return `${sanitized}/v1/chat/completions`;
};

const extractThirdPartyConfig = (req: express.Request): ThirdPartyLLMConfig | null => {
  const bodyConfig = req.body?.providerConfig || {};
  const headerBaseUrl = req.header('x-llm-base-url');
  const headerApiKey = req.header('x-llm-api-key');
  const headerModel = req.header('x-llm-model');

  const baseUrl = String(bodyConfig.baseUrl || headerBaseUrl || '').trim();
  const apiKey = String(bodyConfig.apiKey || headerApiKey || '').trim();
  const model = String(
    bodyConfig.model ||
    headerModel ||
    defaultServerProvider?.model ||
    'gpt-4.1-mini',
  ).trim();

  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey, model };
};

const getTextFromChatResponse = (payload: any) => {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item?.text === 'string') return item.text;
        return '';
      })
      .join('')
      .trim();
  }
  return '';
};

const summarizeNonJsonResponse = (text: string) => {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 160);
  if (/<!doctype html>|<html|<body/i.test(text) || /^The page/i.test(clean)) {
    return `Endpoint returned HTML/text instead of OpenAI JSON. Base URL is likely pointing at a website page, not an API root. Response preview: ${clean}`;
  }
  return `Endpoint did not return valid JSON. Response preview: ${clean}`;
};

const generateWithThirdParty = async ({
  messages,
  config,
  customConfig,
}: {
  messages: ThirdPartyMessage[];
  config: ThirdPartyLLMConfig;
  customConfig?: Record<string, unknown>;
}) => {
  const requestUrl = normalizeChatCompletionsUrl(config.baseUrl);
  const requestBody = {
    model: config.model,
    messages,
    ...(customConfig || {}),
  };
  const debug: ThirdPartyDebug = {
    requestUrl,
    requestBodyPreview: JSON.stringify(requestBody, null, 2).slice(0, 1200),
  };

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  debug.responseStatus = response.status;
  debug.responseContentType = response.headers.get('content-type');
  debug.responsePreview = responseText.slice(0, 600);

  if (!response.ok) {
    const error = new Error(`LLM request failed at ${requestUrl}: ${response.status} ${responseText.slice(0, 240)}`) as Error & { debug?: ThirdPartyDebug };
    error.debug = debug;
    throw error;
  }

  let payload: any;
  try {
    payload = JSON.parse(responseText);
  } catch {
    const error = new Error(`${summarizeNonJsonResponse(responseText)} Request URL: ${requestUrl}`) as Error & { debug?: ThirdPartyDebug };
    error.debug = debug;
    throw error;
  }

  const text = getTextFromChatResponse(payload);
  if (!text) {
    const error = new Error('Third-party LLM returned empty content') as Error & { debug?: ThirdPartyDebug };
    error.debug = debug;
    throw error;
  }
  return { text, debug };
};

const maskModelLabel = (config: ThirdPartyLLMConfig) =>
  `${config.model} @ ${normalizeChatCompletionsUrl(config.baseUrl)}`;

const getRangeMonths = (timeframe?: AnalysisPreferences['timeframe']) =>
  timeframe ? timeframeMonths[timeframe] : timeframeMonths[defaultPreferences.timeframe];

const isMainlandTicker = (ticker: string) => /\.(SS|SZ)$/i.test(ticker);

const toEastmoneySecid = (ticker: string) => {
  const upper = ticker.trim().toUpperCase();
  if (upper.endsWith('.SS')) return `1.${upper.replace('.SS', '')}`;
  if (upper.endsWith('.SZ')) return `0.${upper.replace('.SZ', '')}`;
  return null;
};

const safeNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const eastmoneyPrice = (value: unknown) => {
  const num = safeNumber(value);
  return num == null ? undefined : num / 100;
};

const fetchEastmoneyBundle = async (ticker: string) => {
  const secid = toEastmoneySecid(ticker);
  if (!secid) {
    throw new Error(`Eastmoney fallback does not support ticker ${ticker}`);
  }

  const quoteUrl = new URL('https://push2.eastmoney.com/api/qt/stock/get');
  quoteUrl.searchParams.set('secid', secid);
  quoteUrl.searchParams.set('fields', 'f43,f44,f45,f46,f47,f48,f57,f58,f60,f116,f164,f167,f169,f170');

  const chartUrl = new URL('https://push2his.eastmoney.com/api/qt/stock/kline/get');
  chartUrl.searchParams.set('secid', secid);
  chartUrl.searchParams.set('klt', '101');
  chartUrl.searchParams.set('fqt', '1');
  chartUrl.searchParams.set('lmt', '260');
  chartUrl.searchParams.set('fields1', 'f1,f2,f3,f4,f5,f6');
  chartUrl.searchParams.set('fields2', 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61');

  const [quoteRes, chartRes] = await Promise.all([fetch(quoteUrl), fetch(chartUrl)]);
  const quoteJson = await quoteRes.json();
  const chartJson = await chartRes.json();
  const quoteData = quoteJson?.data;
  const kline = chartJson?.data?.klines;

  if (!quoteData || !Array.isArray(kline) || kline.length === 0) {
    throw new Error(`Eastmoney returned no data for ${ticker}`);
  }

  const quote: FallbackQuote = {
    symbol: quoteData.f57 || ticker,
    shortName: quoteData.f58 || ticker,
    longName: quoteData.f58 || ticker,
    currency: 'CNY',
    regularMarketPrice: eastmoneyPrice(quoteData.f43),
    regularMarketChange: eastmoneyPrice(quoteData.f169),
    regularMarketChangePercent: eastmoneyPrice(quoteData.f170),
    regularMarketDayHigh: eastmoneyPrice(quoteData.f44),
    regularMarketDayLow: eastmoneyPrice(quoteData.f45),
    regularMarketVolume: safeNumber(quoteData.f47),
    marketCap: safeNumber(quoteData.f116),
    trailingPE: eastmoneyPrice(quoteData.f164),
    exchange: ticker.toUpperCase().endsWith('.SS') ? 'SSE' : 'SZSE',
  };

  const history = kline
    .map((line: string) => {
      const [date, open, close, high, low, volume] = line.split(',');
      return {
        date: new Date(date),
        open: Number(open),
        close: Number(close),
        high: Number(high),
        low: Number(low),
        volume: Number(volume),
      };
    })
    .filter((item: any) => Number.isFinite(item.close));

  return {
    quote,
    history,
    packet: createAnalysisPacket(history),
  };
};

const fetchMarketBundle = async (ticker: string, timeframe?: AnalysisPreferences['timeframe']) => {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - getRangeMonths(timeframe));

  try {
    const [quote, chartData] = await Promise.all([
      yahooFinance.quote(ticker),
      yahooFinance.chart(ticker, {
        period1: start,
        period2: end,
        interval: "1d",
      }),
    ]);

    if (!quote) {
      throw new Error("Quote not found. The symbol may be invalid or delisted.");
    }

    const history = ((chartData?.quotes || []) as RawChartPoint[]).filter((point) => point.close != null);
    return {
      quote,
      history,
      packet: createAnalysisPacket(history),
    };
  } catch (error) {
    if (isMainlandTicker(ticker)) {
      console.warn(`Yahoo Finance failed for ${ticker}, falling back to Eastmoney.`);
      return fetchEastmoneyBundle(ticker);
    }
    throw error;
  }
};

const formatNumber = (value?: number | null) => {
  if (value == null || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
};

const buildFallbackAnalysis = (ticker: string, bundle: Awaited<ReturnType<typeof fetchMarketBundle>>, preferences: AnalysisPreferences) => {
  const { quote, snapshot } = { quote: bundle.quote, snapshot: bundle.packet.snapshot };
  const focus = preferences.customFocus?.trim() || '未指定额外关注点';
  return [
    `## ${ticker} 专业盘面分析摘要`,
    ``,
    `- 综合信号评分：${snapshot.signalScore}/100（${snapshot.signalLabel}）`,
    `- 趋势状态：${snapshot.trend.regime}，EMA20 ${formatNumber(snapshot.trend.ema20)}，EMA50 ${formatNumber(snapshot.trend.ema50)}`,
    `- 动量状态：RSI ${formatNumber(snapshot.momentum.rsi14)}，MACD ${formatNumber(snapshot.momentum.macd)} / Signal ${formatNumber(snapshot.momentum.signal)}`,
    `- 波动状态：ATR14 ${formatNumber(snapshot.volatility.atr14)}，年化波动率 ${formatNumber(snapshot.volatility.annualizedVolatility)}%`,
    `- 量价状态：相对量能 ${formatNumber(snapshot.volume.relativeVolume)} 倍，${snapshot.volume.label}`,
    ``,
    `### 关键价位`,
    `- 支撑位：${formatNumber(snapshot.supportResistance.support)}`,
    `- 阻力位：${formatNumber(snapshot.supportResistance.resistance)}`,
    `- 布林带位置：${snapshot.bollinger.positionLabel}`,
    ``,
    `### 周期表现`,
    `- 5日收益：${formatNumber(snapshot.returns.week)}%`,
    `- 21日收益：${formatNumber(snapshot.returns.month)}%`,
    `- 63日收益：${formatNumber(snapshot.returns.quarter)}%`,
    ``,
    `### 交易执行建议`,
    `- 风险偏好：${preferences.riskProfile}`,
    `- 用户自定义关注：${focus}`,
    `- 若价格有效站稳 EMA20 且 MACD 柱线继续扩张，可考虑顺势跟踪。`,
    `- 若跌破支撑位并伴随放量，优先控制仓位并等待结构修复。`,
    `- 由于未启用服务端 OpenAI 配置，以上为基于技术指标的规则化分析。`,
  ].join('\n');
};

const buildPrompt = (ticker: string, bundle: Awaited<ReturnType<typeof fetchMarketBundle>>, preferences: AnalysisPreferences) => {
  const { quote, packet } = bundle;
  const { snapshot, series } = packet;
  const recentSeries = series.slice(-20);
  const selectedDimensions = preferences.dimensions.join('、');

  return `
你是一名机构级多资产研究主管，请用专业、克制、可执行的中文输出 Markdown 分析报告。

任务目标：
针对 ${ticker} 生成一份“实时盘面 + 量化 + 风险控制”专业分析，避免空泛判断，必须引用输入数据得出结论。

用户偏好：
- 分析周期：${preferences.timeframe}
- 风险偏好：${preferences.riskProfile}
- 重点维度：${selectedDimensions}
- 自定义关注点：${preferences.customFocus || '无'}

实时行情：
- 名称：${quote.shortName || quote.longName || ticker}
- 最新价：${quote.regularMarketPrice} ${quote.currency || ''}
- 当日涨跌幅：${quote.regularMarketChangePercent?.toFixed(2) || 'N/A'}%
- 当日高低：${quote.regularMarketDayHigh || 'N/A'} / ${quote.regularMarketDayLow || 'N/A'}
- 成交量：${quote.regularMarketVolume || 'N/A'}
- 市值：${quote.marketCap || 'N/A'}
- PE：${quote.trailingPE || 'N/A'}
- 52周区间：${quote.fiftyTwoWeekLow || 'N/A'} - ${quote.fiftyTwoWeekHigh || 'N/A'}

量化快照：
- 综合信号评分：${snapshot.signalScore}/100（${snapshot.signalLabel}）
- 趋势：${snapshot.trend.regime}，SMA20=${snapshot.trend.sma20 ?? 'N/A'}，EMA20=${snapshot.trend.ema20 ?? 'N/A'}，EMA50=${snapshot.trend.ema50 ?? 'N/A'}
- 动量：RSI14=${snapshot.momentum.rsi14 ?? 'N/A'}，MACD=${snapshot.momentum.macd ?? 'N/A'}，Signal=${snapshot.momentum.signal ?? 'N/A'}，Histogram=${snapshot.momentum.histogram ?? 'N/A'}
- 波动：ATR14=${snapshot.volatility.atr14 ?? 'N/A'}，年化波动率=${snapshot.volatility.annualizedVolatility ?? 'N/A'}%
- 量能：最新成交量=${snapshot.volume.latest}，20日均量=${snapshot.volume.average20 ?? 'N/A'}，相对量能=${snapshot.volume.relativeVolume ?? 'N/A'}
- 支撑阻力：支撑=${snapshot.supportResistance.support ?? 'N/A'}，阻力=${snapshot.supportResistance.resistance ?? 'N/A'}
- 布林带：上轨=${snapshot.bollinger.upper ?? 'N/A'}，中轨=${snapshot.bollinger.middle ?? 'N/A'}，下轨=${snapshot.bollinger.lower ?? 'N/A'}，位置=${snapshot.bollinger.positionLabel}
- 收益表现：5日=${snapshot.returns.week ?? 'N/A'}%，21日=${snapshot.returns.month ?? 'N/A'}%，63日=${snapshot.returns.quarter ?? 'N/A'}%

最近20个交易日数据（日期 | 收盘 | RSI | MACD柱线 | 成交量）：
${recentSeries.map((item) => `${item.date} | ${item.close} | ${item.rsi14 ?? 'N/A'} | ${item.macdHistogram ?? 'N/A'} | ${item.volume}`).join('\n')}

请严格按下面结构输出：
1. 市场结论摘要
2. 技术指标拆解
3. 量化执行框架
4. 风险点与反证条件
5. 操作建议

写作要求：
- 每一部分都要引用上面的具体数值。
- 必须给出支撑位、阻力位、仓位建议、止损/止盈思路。
- 如果指标互相矛盾，必须指出矛盾，不允许强行下结论。
- 如果用户自定义关注点存在，请单独回应。
`.trim();
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/search/:query", async (req, res) => {
    try {
      const { query } = req.params;
      if (!query || query.trim() === '') {
        return res.json([]);
      }
      const results = await yahooFinance.search(query);
      const quotes = results.quotes || [];
      const thirdPartyConfig = extractThirdPartyConfig(req);

      if (quotes.length === 0 && /[\u4e00-\u9fa5]/.test(query) && (thirdPartyConfig || defaultServerProvider)) {
        const tickerResolvePrompt = `What is the Yahoo Finance ticker for "${query}"? Return ticker only, such as 600519.SS, AAPL, 0700.HK or BTC-USD.`;
        const maybeTicker = (
          await generateWithThirdParty({
            messages: [{ role: 'user', content: tickerResolvePrompt }],
            config: thirdPartyConfig || defaultServerProvider!,
          })
        ).text.trim().replace(/`/g, '');
        if (maybeTicker) {
          try {
            const fallbackQuote = await yahooFinance.quote(maybeTicker);
            if (fallbackQuote?.symbol) {
              return res.json([{
                symbol: fallbackQuote.symbol,
                shortname: fallbackQuote.shortName,
                longname: fallbackQuote.longName,
                exchange: fallbackQuote.fullExchangeName || fallbackQuote.exchange,
              }]);
            }
          } catch (fallbackError) {
            console.error("AI resolve quote failed:", fallbackError);
          }
        }
      }

      res.json(quotes);
    } catch (error: any) {
      console.error("Error searching:", error);
      // Return empty array instead of 500 for invalid queries
      if (error.name === 'BadRequestError' || error.message?.includes('Invalid Search Query')) {
        return res.json([]);
      }
      res.status(500).json({ error: error.message || "Failed to search" });
    }
  });

  app.get("/api/quote/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const quote = await yahooFinance.quote(ticker);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found. The symbol may be invalid or delisted." });
      }
      res.json(quote);
    } catch (error: any) {
      console.error("Error fetching quote:", error);
      if (error.message?.includes('No data found') || error.message?.includes('delisted')) {
         return res.status(404).json({ error: "No quote data found. The symbol may be delisted or invalid." });
      }
      res.status(500).json({ error: error.message || "Failed to fetch quote" });
    }
  });

  app.get("/api/chart/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 6); // 6 months of data
      
      const chartData = await yahooFinance.chart(ticker, {
        period1: start,
        period2: end,
        interval: "1d"
      });
      res.json(chartData?.quotes || []);
    } catch (error: any) {
      console.error("Error fetching chart:", error);
      if (error.message?.includes('No data found') || error.message?.includes('delisted')) {
         return res.status(404).json({ error: "No chart data found. The symbol may be delisted or invalid." });
      }
      res.status(500).json({ error: error.message || "Failed to fetch chart" });
    }
  });

  app.get("/api/asset/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const timeframe = (req.query.timeframe as AnalysisPreferences['timeframe']) || defaultPreferences.timeframe;
      const bundle = await fetchMarketBundle(ticker, timeframe);
      res.json({
        quote: bundle.quote,
        series: bundle.packet.series,
        indicators: bundle.packet.snapshot,
      });
    } catch (error: any) {
      console.error("Error fetching asset bundle:", error);
      if (error.message?.includes('No data found') || error.message?.includes('delisted') || error.message?.includes('Quote not found')) {
        return res.status(404).json({ error: "No market data found. The symbol may be delisted or invalid." });
      }
      res.status(500).json({ error: error.message || "Failed to fetch asset data" });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const ticker = String(req.body?.ticker || '').trim().toUpperCase();
      if (!ticker) {
        return res.status(400).json({ error: "Ticker is required" });
      }

      const preferences: AnalysisPreferences = {
        ...defaultPreferences,
        ...(req.body?.preferences || {}),
        customFocus: String(req.body?.preferences?.customFocus || ''),
        dimensions: Array.isArray(req.body?.preferences?.dimensions) && req.body.preferences.dimensions.length
          ? req.body.preferences.dimensions
          : defaultPreferences.dimensions,
      };

      const bundle = await fetchMarketBundle(ticker, preferences.timeframe);
      const thirdPartyConfig = extractThirdPartyConfig(req);
      if (!thirdPartyConfig && !defaultServerProvider) {
        return res.json({ analysis: buildFallbackAnalysis(ticker, bundle, preferences), source: 'rules' });
      }

      const prompt = buildPrompt(ticker, bundle, preferences);
      const activeProvider = thirdPartyConfig || defaultServerProvider!;
      const analysisResult = await generateWithThirdParty({
        messages: [{ role: 'user', content: prompt }],
        config: activeProvider,
        customConfig: { temperature: 0.3 },
      });

      res.json({
        analysis: analysisResult.text || buildFallbackAnalysis(ticker, bundle, preferences),
        source: thirdPartyConfig ? 'third-party' : 'openai',
      });
    } catch (error: any) {
      console.error("Error generating analysis:", error);
      if (error.message?.includes('No data found') || error.message?.includes('delisted')) {
        return res.status(404).json({ error: "No market data found. The symbol may be delisted or invalid." });
      }
      res.status(500).json({ error: error.message || "Failed to generate analysis" });
    }
  });

  app.post("/api/provider/test", async (req, res) => {
    try {
      const thirdPartyConfig = extractThirdPartyConfig(req);
      if (!thirdPartyConfig) {
        return res.status(400).json({ error: "Base URL and API Key are required" });
      }

      const result = await generateWithThirdParty({
        messages: [{ role: 'user', content: 'Reply with exactly: CONNECTED' }],
        config: thirdPartyConfig,
      });

      res.json({
        ok: true,
        provider: maskModelLabel(thirdPartyConfig),
        requestUrl: normalizeChatCompletionsUrl(thirdPartyConfig.baseUrl),
        preview: result.text.slice(0, 120),
        debug: result.debug,
      });
    } catch (error: any) {
      console.error("Error testing provider:", error);
      res.status(500).json({
        error: error.message || "Provider test failed",
        debug: error.debug,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
