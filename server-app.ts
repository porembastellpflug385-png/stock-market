import 'dotenv/config';
import express from "express";
import YahooFinance from "yahoo-finance2";
import {
  evaluateScannerTemplate,
  getScannerUniverse,
  getScannerUniverseSync,
  scannerTemplates,
  type ScannerMarket,
  type ScannerTemplateId,
} from "./market-scanner.js";
import {
  addWatchlistAsset,
  listTrackingOverview,
  normalizeTrackingState,
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
  key: process.env.OPENAI_API_KEY || '',
  baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
};

/**
 * API 端点模式：
 * - 'chat-completions'（默认）→ POST /v1/chat/completions，请求体 { model, messages }
 * - 'responses' → POST /v1/responses，请求体 { model, input, instructions }
 *
 * 绝大多数 OpenAI 兼容代理（包括 ai.scd666.com）只支持 chat-completions。
 * 仅当你确认代理支持 Responses API 时才设为 'responses'。
 */
type ApiEndpointMode = 'chat-completions' | 'responses';
const API_ENDPOINT_MODE: ApiEndpointMode =
  (process.env.OPENAI_API_ENDPOINT || '').toLowerCase() === 'responses'
    ? 'responses'
    : 'chat-completions';

const TEXT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gpt-4o';
const VERIFIED_TEXT_MODEL = process.env.VERIFIED_TEXT_MODEL || TEXT_MODEL;

/**
 * 场景化模型分配：
 * - ANALYSIS_MODEL:  单次股票分析（/api/analyze），用最强模型，不怕慢
 * - TRACKING_MODEL:  日报/周报/月报（/api/tracking/run），要快，受 Vercel 时间限制
 * - SCANNER_MODEL:   扫描精筛（/api/scanner/refine），输出 JSON，要准
 */
const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL || TEXT_MODEL;
const TRACKING_MODEL = process.env.TRACKING_MODEL || VERIFIED_TEXT_MODEL;
const SCANNER_MODEL = process.env.SCANNER_MODEL || TEXT_MODEL;

const DEFAULT_TEXT_MODEL_FALLBACKS = Array.from(
  new Set([VERIFIED_TEXT_MODEL, TEXT_MODEL].filter(Boolean)),
);
const DEFAULT_EXTERNAL_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 80000;
const DEFAULT_SCANNER_UNIVERSE_LIMIT = Number(process.env.SCANNER_UNIVERSE_LIMIT) || (process.env.VERCEL === '1' ? 35 : 60);

const defaultServerProvider = {
  baseUrl: API_CONFIG.baseUrl,
  apiKey: API_CONFIG.key,
  model: TEXT_MODEL,
};

if (!API_CONFIG.key) {
  console.warn(
    '⚠️  OPENAI_API_KEY 未设置，所有 AI 分析功能将不可用。请在 .env 或环境变量中配置。',
  );
}
console.log(`🔧 LLM config → endpoint: ${API_ENDPOINT_MODE}, baseUrl: ${API_CONFIG.baseUrl}`);
console.log(`   单次分析: ${ANALYSIS_MODEL}, 日报/周报: ${TRACKING_MODEL}, 扫描精筛: ${SCANNER_MODEL}, 超时: ${DEFAULT_EXTERNAL_TIMEOUT_MS}ms`);

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

const normalizeApiUrl = (baseUrl: string, mode: ApiEndpointMode = API_ENDPOINT_MODE) => {
  const sanitized = baseUrl.trim().replace(/\/+$/, '');
  if (mode === 'responses') {
    if (sanitized.endsWith('/responses')) return sanitized;
    if (sanitized.endsWith('/chat/completions')) return sanitized.replace('/chat/completions', '/responses');
    if (sanitized.endsWith('/v1')) return `${sanitized}/responses`;
    return `${sanitized}/v1/responses`;
  }
  // chat-completions mode
  if (sanitized.endsWith('/chat/completions')) return sanitized;
  if (sanitized.endsWith('/responses')) return sanitized.replace('/responses', '/chat/completions');
  if (sanitized.endsWith('/v1')) return `${sanitized}/chat/completions`;
  return `${sanitized}/v1/chat/completions`;
};

/** 向后兼容别名 */
const normalizeChatCompletionsUrl = (baseUrl: string) => normalizeApiUrl(baseUrl);

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

/**
 * 从 Chat Completions 响应中提取文本
 * 格式：{ choices: [{ message: { content: "..." } }] }
 */
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

/**
 * 从 Responses API 响应中提取文本
 * 格式：{ output: [{ type: "message", content: [{ type: "output_text", text: "..." }] }] }
 * 或简化：{ output_text: "..." }
 */
const getTextFromResponsesApi = (payload: any) => {
  // 快捷路径：output_text 顶层字段
  if (typeof payload?.output_text === 'string' && payload.output_text) {
    return payload.output_text;
  }
  // 完整路径：遍历 output 数组
  if (Array.isArray(payload?.output)) {
    const texts: string[] = [];
    for (const item of payload.output) {
      if (item?.type === 'message' && Array.isArray(item?.content)) {
        for (const block of item.content) {
          if (block?.type === 'output_text' && typeof block?.text === 'string') {
            texts.push(block.text);
          }
        }
      }
    }
    if (texts.length > 0) return texts.join('').trim();
  }
  return '';
};

/** 自动根据当前 API 模式提取文本 */
const getTextFromLlmResponse = (payload: any, mode: ApiEndpointMode = API_ENDPOINT_MODE) => {
  if (mode === 'responses') {
    // 先尝试 responses 格式，fallback 到 chat 格式（某些代理可能混用）
    return getTextFromResponsesApi(payload) || getTextFromChatResponse(payload);
  }
  return getTextFromChatResponse(payload) || getTextFromResponsesApi(payload);
};

const summarizeNonJsonResponse = (text: string) => {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 160);
  if (/<!doctype html>|<html|<body/i.test(text) || /^The page/i.test(clean)) {
    return `Endpoint returned HTML/text instead of OpenAI JSON. Base URL is likely pointing at a website page, not an API root. Response preview: ${clean}`;
  }
  return `Endpoint did not return valid JSON. Response preview: ${clean}`;
};

const tryParseJsonFragment = (text: string) => {
  const trimmed = text.trim();

  // 1. 直接尝试解析
  try {
    return JSON.parse(trimmed);
  } catch { /* continue */ }

  // 2. 尝试从 ```json ... ``` 代码块中提取
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch { /* continue */ }
  }

  // 3. 查找最外层的 [...] 或 {...}
  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    try {
      return JSON.parse(trimmed.slice(arrayStart, arrayEnd + 1));
    } catch { /* continue */ }
  }
  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart !== -1 && objectEnd > objectStart) {
    try {
      return JSON.parse(trimmed.slice(objectStart, objectEnd + 1));
    } catch { /* continue */ }
  }

  throw new Error(`Failed to parse JSON fragment from model output. Preview: ${trimmed.slice(0, 200)}`);
};

const summarizeValidationGroup = (items: Array<{ returnPct: number; drawdownPct: number }>) => {
  if (items.length === 0) {
    return { count: 0, winRate: 0, avgReturn: 0, avgDrawdown: 0, riskReward: 0 };
  }

  const avgReturn = items.reduce((sum, item) => sum + item.returnPct, 0) / items.length;
  const avgDrawdown = items.reduce((sum, item) => sum + Math.abs(item.drawdownPct), 0) / items.length;
  return {
    count: items.length,
    winRate: Math.round((items.filter((item) => item.returnPct > 0).length / items.length) * 100),
    avgReturn: Number(avgReturn.toFixed(2)),
    avgDrawdown: Number(avgDrawdown.toFixed(2)),
    riskReward: Number((avgReturn / Math.max(avgDrawdown, 0.01)).toFixed(2)),
  };
};

const isTransientLlmError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return (/LLM request failed/i.test(message) && /( 429 )|upstream_error|负载已饱和|model_not_found/i.test(message))
    || /超时|timeout/i.test(message);
};

const isRetryableOrRoutingError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /model_not_found|upstream_error|负载已饱和|does not exist|unsupported|429|超时|timeout/i.test(message);
};

const buildRuleBasedRefinements = (candidates: any[]) =>
  candidates
    .map((item) => {
      const opportunityScore = Math.max(0, Math.min(100, Number(item.opportunityScore || 0)));
      const riskScore = Math.max(0, Math.min(100, Number(item.riskScore || 0)));
      const aiScore = Math.max(0, Math.min(100, Math.round(opportunityScore * 0.78 + (100 - riskScore) * 0.22)));
      return {
        symbol: String(item.symbol || '').toUpperCase(),
        aiScore,
        conviction: aiScore >= 82 ? 'high' : aiScore >= 66 ? 'medium' : 'low',
        recommendation: aiScore >= 80 ? 'focus' : aiScore >= 62 ? 'watch' : 'skip',
        shouldPromote: aiScore >= 78,
        summary: `规则降级评估：机会分 ${opportunityScore}，风险分 ${riskScore}，建议${aiScore >= 80 ? '优先关注' : aiScore >= 62 ? '继续观察' : '暂缓处理'}。`,
        risks: [
          '本次为规则降级结果，未经过大模型复核。',
          riskScore >= 65 ? '波动和回撤风险偏高。' : '需等待更多量价确认。',
        ].slice(0, riskScore >= 65 ? 2 : 1),
      };
    })
    .filter((item) => item.symbol)
    .sort((left, right) => right.aiScore - left.aiScore);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} 超时（>${Math.round(ms / 1000)}s）`)), ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const buildRequestBody = (
  model: string,
  messages: ThirdPartyMessage[],
  customConfig?: Record<string, unknown>,
  mode: ApiEndpointMode = API_ENDPOINT_MODE,
) => {
  const { temperature, max_tokens, ...rest } = (customConfig || {}) as Record<string, unknown>;

  if (mode === 'responses') {
    // Responses API: 用 input 代替 messages
    // system 消息转为 instructions 参数
    const systemMsg = messages.find((m) => m.role === 'system');
    const nonSystemMsgs = messages.filter((m) => m.role !== 'system');

    // input 可以是字符串（单条 user 消息）或数组
    const input = nonSystemMsgs.length === 1 && nonSystemMsgs[0].role === 'user'
      ? nonSystemMsgs[0].content
      : nonSystemMsgs.map((m) => ({ role: m.role, content: m.content }));

    return {
      model,
      input,
      ...(systemMsg ? { instructions: systemMsg.content } : {}),
      ...(temperature != null ? { temperature } : {}),
      ...(max_tokens != null ? { max_output_tokens: max_tokens } : {}),
      ...rest,
    };
  }

  // Chat Completions
  return {
    model,
    messages,
    ...(temperature != null ? { temperature } : {}),
    ...(max_tokens != null ? { max_tokens } : {}),
    ...rest,
  };
};

const generateWithThirdParty = async ({
  messages,
  config,
  customConfig,
  mode = API_ENDPOINT_MODE,
}: {
  messages: ThirdPartyMessage[];
  config: ThirdPartyLLMConfig;
  customConfig?: Record<string, unknown>;
  mode?: ApiEndpointMode;
}) => {
  const requestUrl = normalizeApiUrl(config.baseUrl, mode);
  const requestBody = buildRequestBody(config.model, messages, customConfig, mode);
  const debug: ThirdPartyDebug = {
    requestUrl,
    requestBodyPreview: JSON.stringify(requestBody, null, 2).slice(0, 1200),
  };

  let lastError: (Error & { debug?: ThirdPartyDebug }) | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
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
      lastError = error;
      const modelUnavailable = /model_not_found|does not exist|unsupported/i.test(responseText);
      const retryable =
        !modelUnavailable &&
        (response.status === 429 || response.status >= 500 || /upstream_error|负载已饱和/i.test(responseText));
      if (retryable && attempt < 3) {
        const delayMs = 1500 * attempt;
        console.warn(`LLM 请求失败 (${response.status})，${delayMs}ms 后重试 (attempt ${attempt}/3)`);
        await sleep(delayMs);
        continue;
      }
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

    const text = getTextFromLlmResponse(payload, mode);
    if (!text) {
      const error = new Error('Third-party LLM returned empty content') as Error & { debug?: ThirdPartyDebug };
      error.debug = debug;
      throw error;
    }
    return { text, debug };
  }

  throw lastError || new Error('Third-party LLM request failed');
};

const generateWithDefaultProvider = async ({
  messages,
  customConfig,
}: {
  messages: ThirdPartyMessage[];
  customConfig?: Record<string, unknown>;
}) => {
  if (!defaultServerProvider.apiKey) {
    throw new Error('OPENAI_API_KEY 未配置，无法调用 AI 服务。请在环境变量中设置 OPENAI_API_KEY。');
  }

  let lastError: unknown = null;
  const models = Array.from(new Set(DEFAULT_TEXT_MODEL_FALLBACKS.filter(Boolean)));

  for (const model of models) {
    try {
      const result = await generateWithThirdParty({
        messages,
        config: {
          ...defaultServerProvider,
          model,
        },
        customConfig,
      });
      return {
        ...result,
        modelUsed: model,
      };
    } catch (error) {
      lastError = error;
      if (model !== models[models.length - 1] && isRetryableOrRoutingError(error)) {
        console.warn(`Model ${model} failed (${error instanceof Error ? error.message.slice(0, 120) : 'unknown'}), trying next fallback model.`);
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('No default LLM models available');
};

/**
 * 指定模型调用，失败后按 fallback 链兜底。
 * 用于场景化模型分配：单次分析用 gpt-5.4，日报用 claude 等。
 */
const generateWithModel = async ({
  model,
  messages,
  customConfig,
}: {
  model: string;
  messages: ThirdPartyMessage[];
  customConfig?: Record<string, unknown>;
}) => {
  if (!defaultServerProvider.apiKey) {
    throw new Error('OPENAI_API_KEY 未配置，无法调用 AI 服务。');
  }

  // 先用指定模型
  try {
    const result = await generateWithThirdParty({
      messages,
      config: { ...defaultServerProvider, model },
      customConfig,
    });
    return { ...result, modelUsed: model };
  } catch (primaryError) {
    // 指定模型失败，尝试 fallback 链中的其他模型
    const fallbacks = DEFAULT_TEXT_MODEL_FALLBACKS.filter((m) => m !== model);
    if (fallbacks.length === 0) throw primaryError;

    console.warn(`指定模型 ${model} 失败（${primaryError instanceof Error ? primaryError.message.slice(0, 100) : 'unknown'}），尝试 fallback: ${fallbacks.join(', ')}`);

    for (const fallbackModel of fallbacks) {
      try {
        const result = await generateWithThirdParty({
          messages,
          config: { ...defaultServerProvider, model: fallbackModel },
          customConfig,
        });
        return { ...result, modelUsed: fallbackModel };
      } catch (fallbackError) {
        console.warn(`Fallback 模型 ${fallbackModel} 也失败`);
        continue;
      }
    }
    throw primaryError;
  }
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
    trailingPE: safeNumber(quoteData.f164),  // PE 不需要除以 100
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

type AnalysisBundleLike = {
  quote: Awaited<ReturnType<typeof fetchMarketBundle>>['quote'];
  packet: Awaited<ReturnType<typeof fetchMarketBundle>>['packet'];
};

const buildFallbackAnalysis = (ticker: string, bundle: AnalysisBundleLike, preferences: AnalysisPreferences) => {
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

const SYSTEM_PROMPT_ANALYSIS = `你是一名机构级多资产研究主管。请用专业、克制、可执行的中文输出 Markdown 分析报告。
要求：
- 避免空泛判断，必须引用输入数据得出结论。
- 给出明确的操作方向和关键价位。
- 结论之间需要有逻辑链条，而非简单罗列指标。`;

const buildPromptMessages = (ticker: string, bundle: AnalysisBundleLike, preferences: AnalysisPreferences): ThirdPartyMessage[] => {
  const { quote, packet } = bundle;
  const { snapshot, series } = packet;
  const recentSeries = series.slice(-20);
  const selectedDimensions = preferences.dimensions.join('、');

  const userContent = [
    `针对 ${ticker} 生成一份"实时盘面 + 量化 + 风险控制"专业分析。`,
    '',
    '用户偏好：',
    `- 分析周期：${preferences.timeframe}`,
    `- 风险偏好：${preferences.riskProfile}`,
    `- 重点维度：${selectedDimensions}`,
    `- 自定义关注点：${preferences.customFocus || '无'}`,
    '',
    '实时行情：',
    `- 名称：${quote.shortName || quote.longName || ticker}`,
    `- 最新价：${quote.regularMarketPrice} ${quote.currency || ''}`,
    `- 当日涨跌幅：${quote.regularMarketChangePercent?.toFixed(2) || 'N/A'}%`,
    `- 当日高低：${quote.regularMarketDayHigh || 'N/A'} / ${quote.regularMarketDayLow || 'N/A'}`,
    `- 成交量：${quote.regularMarketVolume || 'N/A'}`,
    `- 市值：${quote.marketCap || 'N/A'}`,
    `- PE：${quote.trailingPE || 'N/A'}`,
    `- 52周区间：${quote.fiftyTwoWeekLow || 'N/A'} - ${quote.fiftyTwoWeekHigh || 'N/A'}`,
    '',
    '量化快照：',
    `- 综合信号评分：${snapshot.signalScore}/100（${snapshot.signalLabel}）`,
    `- 趋势：${snapshot.trend.regime}，SMA20=${snapshot.trend.sma20 ?? 'N/A'}，EMA20=${snapshot.trend.ema20 ?? 'N/A'}，EMA50=${snapshot.trend.ema50 ?? 'N/A'}`,
    `- 动量：RSI14=${snapshot.momentum.rsi14 ?? 'N/A'}，MACD=${snapshot.momentum.macd ?? 'N/A'}，Signal=${snapshot.momentum.signal ?? 'N/A'}，Histogram=${snapshot.momentum.histogram ?? 'N/A'}`,
    `- 波动：ATR14=${snapshot.volatility.atr14 ?? 'N/A'}，年化波动率=${snapshot.volatility.annualizedVolatility ?? 'N/A'}%`,
    `- 量能：最新成交量=${snapshot.volume.latest}，20日均量=${snapshot.volume.average20 ?? 'N/A'}，相对量能=${snapshot.volume.relativeVolume ?? 'N/A'}`,
    `- 支撑阻力：支撑=${snapshot.supportResistance.support ?? 'N/A'}，阻力=${snapshot.supportResistance.resistance ?? 'N/A'}`,
    `- 布林带：上轨=${snapshot.bollinger.upper ?? 'N/A'}，中轨=${snapshot.bollinger.middle ?? 'N/A'}，下轨=${snapshot.bollinger.lower ?? 'N/A'}，位置=${snapshot.bollinger.positionLabel}`,
    `- 收益表现：5日=${snapshot.returns.week ?? 'N/A'}%，21日=${snapshot.returns.month ?? 'N/A'}%，63日=${snapshot.returns.quarter ?? 'N/A'}%`,
    '',
    '最近20个交易日数据（日期 | 收盘 | RSI | MACD柱线 | 成交量）：',
    ...recentSeries.map((item) => `${item.date} | ${item.close} | ${item.rsi14 ?? 'N/A'} | ${item.macdHistogram ?? 'N/A'} | ${item.volume}`),
    '',
    '请严格按下面结构输出：',
    '1. 市场结论摘要',
    '2. 技术指标拆解',
    '3. 量化执行框架',
    '4. 风险点与反证条件',
    '5. 操作建议',
  ].join('\n');

  return [
    { role: 'system' as const, content: SYSTEM_PROMPT_ANALYSIS },
    { role: 'user' as const, content: userContent },
  ];
};

/** @deprecated 保留向后兼容，内部调用 buildPromptMessages 拼接 */
const buildPrompt = (ticker: string, bundle: AnalysisBundleLike, preferences: AnalysisPreferences) => {
  const msgs = buildPromptMessages(ticker, bundle, preferences);
  return msgs.map((m) => m.content).join('\n\n');
};

/** 单次股票分析 — 使用 ANALYSIS_MODEL（默认 gpt-5.4），不怕慢，追求质量 */
const generateInstitutionalAnalysis = async (
  ticker: string,
  bundle: AnalysisBundleLike,
  preferences: AnalysisPreferences,
) => {
  const messages = buildPromptMessages(ticker, bundle, preferences);
  const result = await withTimeout(
    generateWithModel({
      model: ANALYSIS_MODEL,
      messages,
      customConfig: { temperature: 0.3, max_tokens: 4096 },
    }),
    DEFAULT_EXTERNAL_TIMEOUT_MS,
    `${ticker} AI 分析 (${ANALYSIS_MODEL})`,
  );
  if (!result.text) {
    throw new Error(`${ticker} AI 分析返回空内容（模型: ${result.modelUsed}）`);
  }
  return result.text;
};


const runTrackingWorkflow = async (
  scope: ReportScope,
  trigger: 'manual' | 'cron' = 'manual',
  providedState?: ReturnType<typeof normalizeTrackingState>,
  mode: 'fast' | 'full' = 'full',
) => {
  const preferences: AnalysisPreferences = {
    ...defaultPreferences,
    timeframe: '6mo',
  };
  const overview = providedState || listTrackingOverview();
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
    mode,
    initialState: overview,
    persist: !providedState,
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
    generateAnalysis: async (symbol, bundle) => {
      if (!prioritizedSet.has(symbol)) {
        return buildFallbackAnalysis(symbol, bundle, preferences);
      }
      // 日报/周报/月报 — 使用 TRACKING_MODEL（默认 claude-opus-4-6），快速出结果
      try {
        const messages = buildPromptMessages(symbol, bundle, preferences);
        const result = await generateWithModel({
          model: TRACKING_MODEL,
          messages,
          customConfig: { temperature: 0.3, max_tokens: 2048 },
        });
        if (!result.text) {
          throw new Error(`${symbol} AI 返回空内容`);
        }
        return result.text;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`${symbol} AI 分析失败 (${TRACKING_MODEL}): ${errMsg}，使用规则分析替代`);
        return [
          `> ⚠️ ${symbol} 的 AI 分析请求失败（${errMsg.slice(0, 80)}），以下为规则化分析。`,
          '',
          buildFallbackAnalysis(symbol, bundle, preferences),
        ].join('\n');
      }
    },
  });
};

const runWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
) => {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += limit) {
    const batch = items.slice(index, index + limit);
    const settled = await Promise.allSettled(batch.map(worker));
    settled.forEach((entry) => {
      if (entry.status === 'fulfilled') {
        results.push(entry.value);
      }
    });
  }
  return results;
};

const daysBetween = (from: string, to = new Date().toISOString()) =>
  Math.max(0, (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));

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
        const result = thirdPartyConfig
          ? await generateWithThirdParty({
              messages: [{ role: 'user', content: `What is the Yahoo Finance ticker for "${query}"? Return ticker only, such as 600519.SS, AAPL, 0700.HK or BTC-USD.` }],
              config: thirdPartyConfig,
            })
          : await generateWithDefaultProvider({
              messages: [{ role: 'user', content: `What is the Yahoo Finance ticker for "${query}"? Return ticker only, such as 600519.SS, AAPL, 0700.HK or BTC-USD.` }],
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

      const bundle = await withTimeout(
        fetchMarketBundle(ticker, preferences.timeframe),
        DEFAULT_EXTERNAL_TIMEOUT_MS,
        `${ticker} 行情抓取`,
      );
      const thirdPartyConfig = extractThirdPartyConfig(req);
      const messages = buildPromptMessages(ticker, bundle, preferences);
      try {
        const result = thirdPartyConfig
          ? await withTimeout(
              generateWithThirdParty({
                messages,
                config: thirdPartyConfig,
                customConfig: { temperature: 0.3, max_tokens: 4096 },
              }),
              DEFAULT_EXTERNAL_TIMEOUT_MS,
              `${ticker} 第三方 AI 分析`,
            )
          : await withTimeout(
              generateWithModel({
                model: ANALYSIS_MODEL,
                messages,
                customConfig: { temperature: 0.3, max_tokens: 4096 },
              }),
              DEFAULT_EXTERNAL_TIMEOUT_MS,
              `${ticker} AI 分析 (${ANALYSIS_MODEL})`,
            );

        if (!result.text) {
          throw new Error(`AI 返回空内容`);
        }

        res.json({
          analysis: result.text,
          source: thirdPartyConfig ? 'third-party' : 'openai',
          modelUsed: 'modelUsed' in result ? result.modelUsed : (thirdPartyConfig?.model || defaultServerProvider.model),
        });
      } catch (error) {
        if (isTransientLlmError(error)) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.warn(`AI 分析失败 (${ticker}): ${errMsg}`);
          return res.status(503).json({
            error: `AI 服务暂时不可用：${errMsg}`,
            retryable: true,
            fallbackAnalysis: buildFallbackAnalysis(ticker, bundle, preferences),
            source: 'rules-fallback',
          });
        }
        throw error;
      }
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

  app.get("/api/scanner/templates", (_req, res) => {
    res.json({
      templates: scannerTemplates,
      markets: ['US', 'CN', 'HK', 'ETF', 'CRYPTO'],
      universeSize: getScannerUniverseSync().length,
    });
  });

  app.post("/api/scanner/run", async (req, res) => {
    try {
      const templateId = String(req.body?.templateId || 'trend-follow') as ScannerTemplateId;
      const limit = Math.max(10, Math.min(80, Number(req.body?.limit || 40)));
      const requestedMarkets = Array.isArray(req.body?.markets)
        ? req.body.markets.map((item: unknown) => String(item).toUpperCase())
        : [];
      const markets = requestedMarkets.filter((item): item is ScannerMarket =>
        ['US', 'CN', 'HK', 'ETF', 'CRYPTO'].includes(item),
      );

      const requestedUniverse = await getScannerUniverse(markets);
      const universe = requestedUniverse.slice(0, DEFAULT_SCANNER_UNIVERSE_LIMIT);
      const results = await runWithConcurrency(universe, 4, async (asset) => {
        const bundle = await withTimeout(
          fetchMarketBundle(asset.symbol, '6mo'),
          10000,
          `${asset.symbol} 扫描行情`,
        );
        return evaluateScannerTemplate(templateId, asset, bundle.packet, {
          regularMarketPrice: bundle.quote.regularMarketPrice,
          regularMarketChangePercent: bundle.quote.regularMarketChangePercent,
        });
      });

      const candidates = results
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((left, right) => right.opportunityScore - left.opportunityScore || left.riskScore - right.riskScore)
        .slice(0, limit);

      res.json({
        template: scannerTemplates.find((item) => item.id === templateId) || scannerTemplates[3],
        markets: markets.length ? markets : ['US', 'CN', 'HK', 'ETF', 'CRYPTO'],
        scanned: universe.length,
        requestedScanned: requestedUniverse.length,
        candidates,
      });
    } catch (error: any) {
      console.error("Error running scanner:", error);
      res.status(500).json({ error: error.message || "Failed to run market scanner" });
    }
  });

  app.post("/api/scanner/refine", async (req, res) => {
    try {
      const candidates = Array.isArray(req.body?.candidates) ? req.body.candidates.slice(0, process.env.VERCEL === '1' ? 12 : 20) : [];
      if (candidates.length === 0) {
        return res.status(400).json({ error: "Candidates are required" });
      }

      const topN = Math.max(1, Math.min(10, Number(req.body?.topN || 6)));
      const systemMsg = '你是一名机构级投资研究主管。请只输出 JSON 数组，不要输出 Markdown、解释或代码块。';
      const userMsg = [
        '请对下面规则扫描选出的候选标的做二次精筛。',
        '每个对象必须包含字段：symbol, aiScore, conviction, recommendation, shouldPromote, summary, risks。',
        '字段要求：',
        '- aiScore: 0-100 的整数',
        '- conviction: 只能是 high / medium / low',
        '- recommendation: 只能是 focus / watch / skip',
        '- shouldPromote: 布尔值，表示是否值得进入重点候选',
        '- summary: 一句中文判断',
        '- risks: 中文字符串数组，最多 3 条',
        `请从下面候选中精筛出最值得关注的前 ${topN} 个，其余也要给出评估。`,
        '',
        JSON.stringify(candidates, null, 2),
      ].join('\n');

      try {
        const result = await withTimeout(
          generateWithModel({
            model: SCANNER_MODEL,
            messages: [
              { role: 'system', content: systemMsg },
              { role: 'user', content: userMsg },
            ],
            customConfig: { temperature: 0.2, max_tokens: 4096 },
          }),
          DEFAULT_EXTERNAL_TIMEOUT_MS,
          `扫描 AI 精筛 (${SCANNER_MODEL})`,
        );

        const parsed = tryParseJsonFragment(result.text);
        if (!Array.isArray(parsed)) {
          throw new Error('Model did not return an array');
        }

        const refined = parsed
          .filter((item) => item && typeof item.symbol === 'string')
          .map((item) => ({
            symbol: String(item.symbol).toUpperCase(),
            aiScore: Math.max(0, Math.min(100, Number(item.aiScore || 0))),
            conviction:
              item.conviction === 'high' || item.conviction === 'low' ? item.conviction : 'medium',
            recommendation:
              item.recommendation === 'focus' || item.recommendation === 'skip' ? item.recommendation : 'watch',
            shouldPromote: Boolean(item.shouldPromote),
            summary: String(item.summary || ''),
            risks: Array.isArray(item.risks) ? item.risks.slice(0, 3).map((risk) => String(risk)) : [],
          }))
          .sort((left, right) => right.aiScore - left.aiScore);

        return res.json({
          refined,
          topN,
          model: result.modelUsed,
        });
      } catch (error) {
        if (isTransientLlmError(error)) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.warn(`AI 精筛失败: ${errMsg}`);
          return res.status(503).json({
            error: `AI 精筛服务暂时不可用：${errMsg}`,
            retryable: true,
            fallbackRefined: buildRuleBasedRefinements(candidates),
            topN,
            model: 'rules-fallback',
          });
        }
        throw error;
      }
    } catch (error: any) {
      console.error("Error refining scanner candidates:", error);
      res.status(500).json({ error: error.message || "Failed to refine scanner candidates" });
    }
  });

  app.post("/api/scanner/validate", async (req, res) => {
    try {
      const snapshots = Array.isArray(req.body?.snapshots) ? req.body.snapshots.slice(0, 30) : [];
      if (snapshots.length === 0) {
        return res.json({ snapshots: [], summary: null });
      }

      const buildWindowReturn = (
        history: Array<{ date: string | Date; close?: number }>,
        scannedAt: string,
        entryPrice: number,
        targetDays: number,
      ) => {
        const scannedAtMs = new Date(scannedAt).getTime();
        const targetMs = scannedAtMs + targetDays * 24 * 60 * 60 * 1000;
        const targetPoint = history.find((item) => new Date(item.date).getTime() >= targetMs);
        if (!targetPoint?.close || !Number.isFinite(Number(targetPoint.close))) {
          return null;
        }
        return Number((((Number(targetPoint.close) - entryPrice) / entryPrice) * 100).toFixed(2));
      };

      const validatedSnapshots = [];
      for (const snapshot of snapshots) {
        const scannedAt = String(snapshot.scannedAt || new Date().toISOString());
        const candidates = Array.isArray(snapshot.candidates) ? snapshot.candidates.slice(0, 20) : [];
        const refinements = Array.isArray(snapshot.refinements) ? snapshot.refinements : [];
        const refinementMap = new Map(
          refinements
            .filter((item) => item && typeof item.symbol === 'string')
            .map((item) => [String(item.symbol).toUpperCase(), item]),
        );

        const validatedCandidates = await runWithConcurrency(candidates, 5, async (candidate: any) => {
          const symbol = String(candidate.symbol || '').toUpperCase();
          const entryPrice = Number(candidate.metrics?.price || 0);
          if (!symbol || !entryPrice) return null;

          const bundle = await fetchMarketBundle(symbol, '6mo');
          const currentPrice = bundle.quote.regularMarketPrice ?? bundle.packet.snapshot.price ?? entryPrice;
          const currentReturnPct = entryPrice ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
          const lowsSinceEntry = bundle.history
            .filter((item) => new Date(item.date).getTime() >= new Date(scannedAt).getTime())
            .map((item) => Number(item.low ?? item.close ?? currentPrice))
            .filter((item) => Number.isFinite(item));
          const minPrice = lowsSinceEntry.length ? Math.min(...lowsSinceEntry) : currentPrice;
          const maxDrawdownPct = entryPrice ? ((minPrice - entryPrice) / entryPrice) * 100 : 0;
          const elapsedDays = daysBetween(scannedAt);
          const refinement = refinementMap.get(symbol);
          const day1ReturnPct = elapsedDays >= 1 ? buildWindowReturn(bundle.history, scannedAt, entryPrice, 1) : null;
          const day5ReturnPct = elapsedDays >= 5 ? buildWindowReturn(bundle.history, scannedAt, entryPrice, 5) : null;
          const day20ReturnPct = elapsedDays >= 20 ? buildWindowReturn(bundle.history, scannedAt, entryPrice, 20) : null;

          return {
            symbol,
            currentPrice,
            currentReturnPct: Number(currentReturnPct.toFixed(2)),
            maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
            elapsedDays: Number(elapsedDays.toFixed(1)),
            day1Qualified: elapsedDays >= 1,
            day5Qualified: elapsedDays >= 5,
            day20Qualified: elapsedDays >= 20,
            day1ReturnPct,
            day5ReturnPct,
            day20ReturnPct,
            positive: currentReturnPct > 0,
            refinement,
          };
        });

        validatedSnapshots.push({
          ...snapshot,
          validations: validatedCandidates.filter(Boolean),
        });
      }

      const allValidations = validatedSnapshots.flatMap((snapshot) => snapshot.validations || []);
      const rulesOnly = allValidations.filter((item: any) => !item.refinement);
      const aiReviewed = allValidations.filter((item: any) => item.refinement);
      const aiPromoted = allValidations.filter((item: any) => item.refinement?.shouldPromote);
      const horizonKeys = [
        { key: 'day1ReturnPct', label: '1日' },
        { key: 'day5ReturnPct', label: '5日' },
        { key: 'day20ReturnPct', label: '20日' },
      ] as const;
      const summarizeByReturnKey = (items: any[], key: 'currentReturnPct' | 'day1ReturnPct' | 'day5ReturnPct' | 'day20ReturnPct') =>
        summarizeValidationGroup(
          items
            .filter((item) => typeof item[key] === 'number')
            .map((item) => ({
              returnPct: Number(item[key]),
              drawdownPct: Number(item.maxDrawdownPct || 0),
            })),
        );

      const templates = validatedSnapshots.map((snapshot: any) => {
        const validations = Array.isArray(snapshot.validations) ? snapshot.validations : [];
        return {
          templateId: String(snapshot.templateId || ''),
          templateName: String(snapshot.templateName || ''),
          count: validations.length,
          rulesOnly: summarizeByReturnKey(validations.filter((item: any) => !item.refinement), 'currentReturnPct'),
          aiReviewed: summarizeByReturnKey(validations.filter((item: any) => item.refinement), 'currentReturnPct'),
          aiPromoted: summarizeByReturnKey(validations.filter((item: any) => item.refinement?.shouldPromote), 'currentReturnPct'),
        };
      });

      res.json({
        snapshots: validatedSnapshots,
        summary: {
          rulesOnly: summarizeByReturnKey(rulesOnly, 'currentReturnPct'),
          aiReviewed: summarizeByReturnKey(aiReviewed, 'currentReturnPct'),
          aiPromoted: summarizeByReturnKey(aiPromoted, 'currentReturnPct'),
          horizons: Object.fromEntries(
            horizonKeys.map(({ key, label }) => [
              label,
              {
                rulesOnly: summarizeByReturnKey(rulesOnly, key),
                aiReviewed: summarizeByReturnKey(aiReviewed, key),
                aiPromoted: summarizeByReturnKey(aiPromoted, key),
              },
            ]),
          ),
          templates,
        },
      });
    } catch (error: any) {
      console.error("Error validating scanner snapshots:", error);
      res.status(500).json({ error: error.message || "Failed to validate scanner snapshots" });
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
      const providedState = req.body?.state ? normalizeTrackingState(req.body.state) : null;
      const mode = String(req.body?.mode || 'full') === 'fast' ? 'fast' : 'full';
      const state = await runTrackingWorkflow(scope, 'manual', providedState || undefined, mode);
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