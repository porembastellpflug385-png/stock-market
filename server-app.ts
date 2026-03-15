import 'dotenv/config';
import express from "express";
import YahooFinance from "yahoo-finance2";
import {
  addWatchlistAsset,
  listTrackingOverview,
  removeWatchlistAsset,
  runTrackingCycle,
  setWatchlistPriority,
  toggleWatchlistTag,
  type ReportScope,
} from "./tracking-system.js";
import {
  createAnalysisPacket,
  defaultPreferences,
  timeframeMonths,
  type AnalysisPreferences,
  type RawChartPoint,
} from "./src/lib/market-analysis.js";

const yahooFinance = new YahooFinance();

const API_CONFIG = {
  key: "sk-12a7BPJym4RJSfqoVq5EHEEAs4ohQjIAZOA8QWVMNmFA0Fru",
  baseUrl: "https://ai.scd666.com/v1/chat/completions",
};

const TEXT_MODEL = "gpt-5.4";
const IMAGE_MODEL = "gemini-3.1-flash-image-preview";

const defaultServerProvider = {
  baseUrl: API_CONFIG.baseUrl,
  apiKey: API_CONFIG.key,
  model: TEXT_MODEL,
};

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

type AliasAsset = {
  symbol: string;
  shortname: string;
  longname: string;
  exchange: string;
  aliases: string[];
};

const curatedAssets: AliasAsset[] = [
  {
    symbol: 'BTC-USD',
    shortname: 'Bitcoin USD',
    longname: 'Bitcoin / US Dollar',
    exchange: 'CRYPTO',
    aliases: ['bitcoin', 'btc', 'btcusd', 'btc-usd', '比特币', '大饼'],
  },
  {
    symbol: 'ETH-USD',
    shortname: 'Ethereum USD',
    longname: 'Ethereum / US Dollar',
    exchange: 'CRYPTO',
    aliases: ['ethereum', 'eth', 'ethusd', 'eth-usd', '以太坊'],
  },
  {
    symbol: 'TSLA',
    shortname: 'Tesla, Inc.',
    longname: 'Tesla, Inc.',
    exchange: 'NASDAQ',
    aliases: ['tesla', 'tsla', '特斯拉'],
  },
  {
    symbol: 'AAPL',
    shortname: 'Apple Inc.',
    longname: 'Apple Inc.',
    exchange: 'NASDAQ',
    aliases: ['apple', 'aapl', '苹果', '苹果公司'],
  },
  {
    symbol: 'NVDA',
    shortname: 'NVIDIA Corporation',
    longname: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    aliases: ['nvidia', 'nvda', '英伟达', '辉达'],
  },
  {
    symbol: '0700.HK',
    shortname: 'Tencent Holdings Limited',
    longname: 'Tencent Holdings Limited',
    exchange: 'HKEX',
    aliases: ['tencent', '0700.hk', '700.hk', '腾讯', '腾讯控股'],
  },
  {
    symbol: '600519.SS',
    shortname: 'Kweichow Moutai Co., Ltd.',
    longname: 'Kweichow Moutai Co., Ltd.',
    exchange: 'SSE',
    aliases: ['600519.ss', '600519', '贵州茅台', '茅台'],
  },
  {
    symbol: '000420.SZ',
    shortname: 'Jilin Chemical Fibre Co., Ltd.',
    longname: 'Jilin Chemical Fibre Co., Ltd.',
    exchange: 'SZSE',
    aliases: ['000420.sz', '000420', '吉林化纤'],
  },
];

const normalizeAssetQuery = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[（）()]/g, '')
    .replace(/_/g, '-');

const findCuratedMatches = (query: string) => {
  const normalized = normalizeAssetQuery(query);
  if (!normalized) return [];

  const exact = curatedAssets.filter((asset) =>
    [asset.symbol, asset.shortname, asset.longname, ...asset.aliases]
      .map(normalizeAssetQuery)
      .includes(normalized),
  );
  if (exact.length > 0) return exact;

  return curatedAssets.filter((asset) =>
    [asset.symbol, asset.shortname, asset.longname, ...asset.aliases]
      .map(normalizeAssetQuery)
      .some((alias) => alias.includes(normalized) || normalized.includes(alias)),
  );
};

const mapQuoteToSearchResult = (quote: any) => ({
  symbol: quote.symbol,
  shortname: quote.shortName,
  longname: quote.longName,
  exchange: quote.fullExchangeName || quote.exchange,
});

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
      defaultServerProvider.model,
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
  const { snapshot } = { snapshot: bundle.packet.snapshot };
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
`.trim();
};

const generateInstitutionalAnalysis = async (
  ticker: string,
  bundle: Awaited<ReturnType<typeof fetchMarketBundle>>,
  preferences: AnalysisPreferences,
) => {
  const prompt = buildPrompt(ticker, bundle, preferences);
  const result = await generateWithThirdParty({
    messages: [{ role: 'user', content: prompt }],
    config: defaultServerProvider,
    customConfig: { temperature: 0.3 },
  });
  return result.text || buildFallbackAnalysis(ticker, bundle, preferences);
};

const runTrackingWorkflow = async (scope: ReportScope, trigger: 'manual' | 'cron' = 'manual') => {
  const preferences: AnalysisPreferences = {
    ...defaultPreferences,
    timeframe: '6mo',
  };
  const overview = listTrackingOverview();
  const maxAiAssets = Number(process.env.TRACKING_AI_MAX_ASSETS || 6);
  const prioritizedSymbols = overview.watchlist
    .filter((item) => item.priority > 0 || item.tags.includes('重点'))
    .sort((left, right) => right.priority - left.priority || left.addedAt.localeCompare(right.addedAt))
    .slice(0, maxAiAssets)
    .map((item) => item.symbol);
  const prioritizedSet = new Set(prioritizedSymbols);

  return runTrackingCycle({
    scope,
    trigger,
    fetchAsset: async (symbol) => {
      const bundle = await fetchMarketBundle(symbol, preferences.timeframe);
      return {
        quote: {
          symbol: bundle.quote.symbol,
          shortName: bundle.quote.shortName,
          longName: bundle.quote.longName,
          currency: bundle.quote.currency,
          regularMarketPrice: bundle.quote.regularMarketPrice,
          regularMarketChangePercent: bundle.quote.regularMarketChangePercent,
          trailingPE: bundle.quote.trailingPE,
          exchange: bundle.quote.exchange || (bundle.quote as any).fullExchangeName,
        },
        packet: bundle.packet,
      };
    },
    generateAnalysis: async (symbol) => {
      const fullBundle = await fetchMarketBundle(symbol, preferences.timeframe);
      if (!prioritizedSet.has(symbol)) {
        return buildFallbackAnalysis(symbol, fullBundle, preferences);
      }
      return generateInstitutionalAnalysis(symbol, fullBundle, preferences);
    },
  });
};

const isCronAuthorized = (req: express.Request) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const authHeader = req.header('authorization') || '';
  return authHeader === `Bearer ${cronSecret}`;
};

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/api/search/:query", async (req, res) => {
    try {
      const { query } = req.params;
      if (!query || query.trim() === '') {
        return res.json([]);
      }
      const curatedMatches = findCuratedMatches(query);
      if (/[\u4e00-\u9fa5]/.test(query) && curatedMatches.length > 0) {
        return res.json(curatedMatches);
      }

      const results = await yahooFinance.search(query);
      const quotes = results.quotes || [];
      const thirdPartyConfig = extractThirdPartyConfig(req);

      if (quotes.length === 0 && /[\u4e00-\u9fa5]/.test(query)) {
        const result = await generateWithThirdParty({
          messages: [{ role: 'user', content: `What is the Yahoo Finance ticker for "${query}"? Return ticker only, such as 600519.SS, AAPL, 0700.HK or BTC-USD.` }],
          config: thirdPartyConfig || defaultServerProvider,
        });
        const maybeTicker = result.text.trim().replace(/`/g, '');
        if (maybeTicker) {
          try {
            const fallbackQuote = await yahooFinance.quote(maybeTicker);
            if (fallbackQuote?.symbol) {
              return res.json([mapQuoteToSearchResult(fallbackQuote)]);
            }
          } catch (fallbackError) {
            console.error("AI resolve quote failed:", fallbackError);
          }
        }
      }

      const merged = [
        ...curatedMatches,
        ...quotes.map((quote: any) => ({
          symbol: quote.symbol,
          shortname: quote.shortname || quote.shortName,
          longname: quote.longname || quote.longName,
          exchange: quote.exchange || quote.exchDisp || quote.fullExchangeName,
        })),
      ].filter((item, index, array) => item?.symbol && array.findIndex((candidate) => candidate.symbol === item.symbol) === index);

      res.json(merged);
    } catch (error: any) {
      console.error("Error searching:", error);
      if (error.name === 'BadRequestError' || error.message?.includes('Invalid Search Query')) {
        return res.json(findCuratedMatches(req.params.query));
      }
      res.status(500).json({ error: error.message || "Failed to search" });
    }
  });

  app.get("/api/quote/:ticker", async (req, res) => {
    try {
      const bundle = await fetchMarketBundle(req.params.ticker);
      res.json(bundle.quote);
    } catch (error: any) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: error.message || "Failed to fetch quote" });
    }
  });

  app.get("/api/chart/:ticker", async (req, res) => {
    try {
      const bundle = await fetchMarketBundle(req.params.ticker, '6mo');
      res.json(bundle.history);
    } catch (error: any) {
      console.error("Error fetching chart:", error);
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
      const prompt = buildPrompt(ticker, bundle, preferences);
      const result = await generateWithThirdParty({
        messages: [{ role: 'user', content: prompt }],
        config: thirdPartyConfig || defaultServerProvider,
        customConfig: { temperature: 0.3 },
      });

      res.json({
        analysis: result.text || buildFallbackAnalysis(ticker, bundle, preferences),
        source: thirdPartyConfig ? 'third-party' : 'openai',
      });
    } catch (error: any) {
      console.error("Error generating analysis:", error);
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
      res.status(500).json({ error: error.message || "Provider test failed", debug: error.debug });
    }
  });

  app.get("/api/tracking/overview", (_req, res) => {
    try {
      res.json(listTrackingOverview());
    } catch (error: any) {
      console.error("Error loading tracking overview:", error);
      res.status(500).json({ error: error.message || "Failed to load tracking overview" });
    }
  });

  app.get("/api/tracking/strategies", (_req, res) => {
    try {
      res.json(listTrackingOverview().strategies);
    } catch (error: any) {
      console.error("Error loading strategies:", error);
      res.status(500).json({ error: error.message || "Failed to load strategies" });
    }
  });

  app.post("/api/tracking/watchlist", async (req, res) => {
    try {
      const query = String(req.body?.query || req.body?.symbol || '').trim();
      if (!query) {
        return res.status(400).json({ error: "Query or symbol is required" });
      }

      let symbol = query.toUpperCase();
      let name = query;
      const curated = findCuratedMatches(query)[0];
      if (curated) {
        symbol = curated.symbol;
        name = curated.shortname || curated.longname || curated.symbol;
      } else {
        try {
          const results = await yahooFinance.search(query);
          const matched = results.quotes?.[0] as
            | { symbol?: string; shortname?: string; longname?: string }
            | undefined;
          if (matched?.symbol) {
            symbol = matched.symbol;
            name = matched.shortname || matched.longname || matched.symbol;
          }
        } catch (searchError) {
          console.warn(`Search fallback failed for ${query}:`, searchError);
        }
      }

      const state = addWatchlistAsset({
        symbol,
        name,
        tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
        notes: String(req.body?.notes || ''),
      });
      res.json(state);
    } catch (error: any) {
      console.error("Error adding watchlist asset:", error);
      res.status(500).json({ error: error.message || "Failed to add asset to watchlist" });
    }
  });

  app.delete("/api/tracking/watchlist/:symbol", (req, res) => {
    try {
      res.json(removeWatchlistAsset(req.params.symbol));
    } catch (error: any) {
      console.error("Error removing watchlist asset:", error);
      res.status(500).json({ error: error.message || "Failed to remove asset from watchlist" });
    }
  });

  app.patch("/api/tracking/watchlist/:symbol/tags", (req, res) => {
    try {
      const tag = String(req.body?.tag || '').trim();
      if (!tag) {
        return res.status(400).json({ error: "Tag is required" });
      }
      res.json(toggleWatchlistTag(req.params.symbol, tag));
    } catch (error: any) {
      console.error("Error toggling watchlist tag:", error);
      res.status(500).json({ error: error.message || "Failed to update watchlist tag" });
    }
  });

  app.patch("/api/tracking/watchlist/:symbol/priority", (req, res) => {
    try {
      const priority = Number(req.body?.priority);
      if (!Number.isFinite(priority)) {
        return res.status(400).json({ error: "Priority must be a number" });
      }
      res.json(setWatchlistPriority(req.params.symbol, priority));
    } catch (error: any) {
      console.error("Error setting watchlist priority:", error);
      res.status(500).json({ error: error.message || "Failed to update watchlist priority" });
    }
  });

  app.post("/api/tracking/run", async (req, res) => {
    try {
      const scope = (String(req.body?.scope || 'daily') as ReportScope);
      const state = await runTrackingWorkflow(scope, 'manual');
      res.json(state);
    } catch (error: any) {
      console.error("Error running tracking cycle:", error);
      res.status(500).json({ error: error.message || "Failed to run tracking cycle" });
    }
  });

  app.get("/api/tracking/cron/:scope", async (req, res) => {
    try {
      if (!isCronAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized cron request" });
      }

      const rawScope = String(req.params.scope || 'daily');
      const scope: ReportScope =
        rawScope === 'weekly' || rawScope === 'monthly' ? rawScope : 'daily';

      const state = await runTrackingWorkflow(scope, 'cron');
      res.json({
        ok: true,
        scope,
        generatedAt: new Date().toISOString(),
        reports: state.generatedReports.slice(0, 3),
      });
    } catch (error: any) {
      console.error("Error running scheduled tracking cycle:", error);
      res.status(500).json({ error: error.message || "Failed to run scheduled tracking cycle" });
    }
  });

  return app;
}
