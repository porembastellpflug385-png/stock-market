import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BrainCircuit,
  Gauge,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Waves,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  defaultPreferences,
  type AnalysisDimension,
  type AnalysisPreferences,
  type IndicatorSnapshot,
  type MarketPoint,
} from './lib/market-analysis';

type Quote = {
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

type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

type ProviderDebugInfo = {
  requestUrl?: string;
  requestBodyPreview?: string;
  responseStatus?: number;
  responseContentType?: string | null;
  responsePreview?: string;
};

const providerStorageKey = 'market-analyzer-provider-config';
const defaultProviderConfig: ProviderConfig = {
  baseUrl: '',
  apiKey: '',
  model: 'gpt-4.1-mini',
};

const dimensionOptions: Array<{ value: AnalysisDimension; label: string }> = [
  { value: 'trend', label: '趋势结构' },
  { value: 'momentum', label: '动量拐点' },
  { value: 'volatility', label: '波动风险' },
  { value: 'volume', label: '量价共振' },
  { value: 'supportResistance', label: '支撑阻力' },
  { value: 'valuation', label: '估值视角' },
  { value: 'macro', label: '宏观周期' },
  { value: 'quant', label: '量化执行' },
];

const timeframeOptions: Array<{ value: AnalysisPreferences['timeframe']; label: string }> = [
  { value: '1mo', label: '1个月' },
  { value: '3mo', label: '3个月' },
  { value: '6mo', label: '6个月' },
  { value: '1y', label: '1年' },
];

const riskOptions: Array<{ value: AnalysisPreferences['riskProfile']; label: string }> = [
  { value: 'conservative', label: '稳健' },
  { value: 'balanced', label: '平衡' },
  { value: 'aggressive', label: '进取' },
];

const formatNumber = (num?: number | null, digits = 2) => {
  if (num == null || Number.isNaN(num)) return 'N/A';
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: digits }).format(num);
};

const formatCompact = (num?: number | null) => {
  if (num == null || Number.isNaN(num)) return 'N/A';
  if (Math.abs(num) >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  return formatNumber(num);
};

const metricTone = (score: number) =>
  score >= 75 ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' :
  score >= 60 ? 'border-sky-400/20 bg-sky-400/10 text-sky-300' :
  score >= 45 ? 'border-amber-300/20 bg-amber-300/10 text-amber-200' :
  'border-rose-400/20 bg-rose-400/10 text-rose-300';

const readApiPayload = async (response: Response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
};

const getPayloadError = (payload: any, fallback: string) => {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
  return fallback;
};

const normalizeSearchResults = (payload: any) => {
  if (!Array.isArray(payload)) return [];
  return payload.filter((item) => item && typeof item.symbol === 'string').slice(0, 8);
};

const hasAssetPayloadShape = (payload: any) =>
  payload &&
  typeof payload === 'object' &&
  payload.quote &&
  typeof payload.quote === 'object' &&
  typeof payload.quote.symbol === 'string' &&
  Array.isArray(payload.series) &&
  payload.indicators &&
  typeof payload.indicators === 'object';

const hasAnalysisPayloadShape = (payload: any) =>
  payload &&
  typeof payload === 'object' &&
  typeof payload.analysis === 'string';

const getProviderText = (payload: any) => {
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

function App() {
  const [ticker, setTicker] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [series, setSeries] = useState<MarketPoint[]>([]);
  const [indicators, setIndicators] = useState<IndicatorSnapshot | null>(null);
  const [analysis, setAnalysis] = useState('');
  const [analysisSource, setAnalysisSource] = useState<'openai' | 'rules' | 'third-party' | null>(null);

  const [preferences, setPreferences] = useState<AnalysisPreferences>(defaultPreferences);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(defaultProviderConfig);
  const [testingProvider, setTestingProvider] = useState(false);
  const [providerTestStatus, setProviderTestStatus] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [providerDebugInfo, setProviderDebugInfo] = useState<ProviderDebugInfo | null>(null);
  const [testTransport, setTestTransport] = useState<'server' | 'browser'>('browser');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(providerStorageKey);
      if (saved) {
        setProviderConfig({ ...defaultProviderConfig, ...JSON.parse(saved) });
      }
    } catch (storageError) {
      console.error('Load provider config failed:', storageError);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/search/${encodeURIComponent(searchQuery.trim())}`, {
          headers: getLLMHeaders(),
        });
        if (res.ok) {
          const data = await readApiPayload(res);
          const results = normalizeSearchResults(data);
          setSearchResults(results);
          setShowDropdown(results.length > 0);
        } else {
          const payload = await readApiPayload(res);
          console.error('Search request failed:', getPayloadError(payload, `HTTP ${res.status}`));
        }
      } catch (fetchError) {
        console.error('Search failed:', fetchError);
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!ticker || !autoRefresh) return;
    const interval = window.setInterval(() => {
      runWorkflow(ticker, false);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [ticker, autoRefresh, preferences]);

  const hasCustomProvider = Boolean(providerConfig.baseUrl.trim() && providerConfig.apiKey.trim());

  const getLLMHeaders = () =>
    hasCustomProvider
      ? {
          'x-llm-base-url': providerConfig.baseUrl.trim(),
          'x-llm-api-key': providerConfig.apiKey.trim(),
          'x-llm-model': providerConfig.model.trim() || defaultProviderConfig.model,
        }
      : {};

  const callCustomProviderDirect = async (
    messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }>,
    customConfig?: Record<string, unknown>,
  ) => {
    const requestUrl = providerConfig.baseUrl.trim();
    const requestBody = {
      model: providerConfig.model.trim() || defaultProviderConfig.model,
      messages,
      ...(customConfig || {}),
    };

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${providerConfig.apiKey.trim()}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    setProviderDebugInfo({
      requestUrl,
      requestBodyPreview: JSON.stringify(requestBody, null, 2).slice(0, 1200),
      responseStatus: response.status,
      responseContentType: response.headers.get('content-type'),
      responsePreview: responseText.slice(0, 600),
    });

    if (!response.ok) {
      throw new Error(`第三方接口请求失败：${response.status} ${responseText.slice(0, 240)}`);
    }

    let payload: any;
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new Error(`第三方接口返回了非 JSON 内容：${responseText.slice(0, 240)}`);
    }

    const text = getProviderText(payload);
    if (!text) {
      throw new Error('第三方接口返回为空内容');
    }

    return text;
  };

  const testCustomProviderDirect = async () => {
    const requestUrl = providerConfig.baseUrl.trim();
    const requestBody = {
      model: providerConfig.model.trim() || defaultProviderConfig.model,
      messages: [{ role: 'user', content: 'Reply with exactly: CONNECTED' }],
    };
    const res = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${providerConfig.apiKey.trim()}`,
      },
      body: JSON.stringify(requestBody),
    });
    const text = await res.text();
    setProviderDebugInfo({
      requestUrl,
      requestBodyPreview: JSON.stringify(requestBody, null, 2).slice(0, 1200),
      responseStatus: res.status,
      responseContentType: res.headers.get('content-type'),
      responsePreview: text.slice(0, 600),
    });
    if (!res.ok) {
      throw new Error(`浏览器直连失败：${res.status} ${text.slice(0, 240)}`);
    }
    return text;
  };

  const handleSelectResult = (symbol: string) => {
    setTicker(symbol);
    setSearchQuery(symbol);
    setShowDropdown(false);
    runWorkflow(symbol);
  };

  const handleSearch = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    let symbolToUse = query;
    if (searchResults.length > 0 && searchQuery !== ticker) {
      symbolToUse = searchResults[0].symbol;
    } else {
      try {
        const res = await fetch(`/api/search/${encodeURIComponent(query)}`, {
          headers: getLLMHeaders(),
        });
        if (res.ok) {
          const data = await readApiPayload(res);
          const results = normalizeSearchResults(data);
          if (results[0]?.symbol) {
            symbolToUse = results[0].symbol;
          }
        }
      } catch (fetchError) {
        console.error('Resolve symbol failed:', fetchError);
      }
    }

    if (/[\u4e00-\u9fa5]/.test(symbolToUse) && hasCustomProvider) {
      try {
        const resolved = await callCustomProviderDirect([
          {
            role: 'user',
            content: `What is the Yahoo Finance ticker symbol for "${symbolToUse}"? Return ticker only, such as 600519.SS, AAPL, 0700.HK or BTC-USD.`,
          },
        ]);
        const clean = resolved.trim().replace(/`/g, '');
        if (clean) {
          symbolToUse = clean;
        }
      } catch (resolveError) {
        console.error('Custom provider symbol resolve failed:', resolveError);
      }
    }

    setTicker(symbolToUse);
    setSearchQuery(symbolToUse);
    setShowDropdown(false);
    runWorkflow(symbolToUse);
  };

  const runWorkflow = async (symbol: string, includeAnalysis = true) => {
    const formattedTicker = symbol.trim().toUpperCase();
    setLoading(true);
    setError(null);

    try {
      const assetRes = await fetch(
        `/api/asset/${encodeURIComponent(formattedTicker)}?timeframe=${preferences.timeframe}`,
      );
      if (!assetRes.ok) {
        const payload = await readApiPayload(assetRes);
        throw new Error(payload.error || '获取行情失败');
      }

      const payload = await readApiPayload(assetRes);
      if (!hasAssetPayloadShape(payload)) {
        throw new Error(
          getPayloadError(
            payload,
            '行情接口返回格式异常，可能部署时把 /api 请求重写到了首页，请检查 Vercel 路由配置。',
          ),
        );
      }
      setQuote(payload.quote);
      setSeries(payload.series || []);
      setIndicators(payload.indicators || null);

      if (includeAnalysis) {
        await runAnalysis(formattedTicker);
      }
    } catch (workflowError: any) {
      setError(workflowError.message || '分析流程执行失败');
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async (symbol: string) => {
    setAnalyzing(true);
    setAnalysis('');
    setAnalysisSource(null);
    try {
      if (hasCustomProvider) {
        const recentSeries = series.slice(-20);
        const summaryPrompt = [
          `你是一名机构级多资产研究主管，请用专业、克制、可执行的中文输出 Markdown 分析报告。`,
          `目标资产：${symbol}`,
          `名称：${quote?.shortName || quote?.longName || symbol}`,
          `最新价：${quote?.regularMarketPrice ?? 'N/A'} ${quote?.currency || ''}`,
          `当日涨跌幅：${quote?.regularMarketChangePercent ?? 'N/A'}%`,
          `市值：${quote?.marketCap ?? 'N/A'}`,
          `PE：${quote?.trailingPE ?? 'N/A'}`,
          `风险偏好：${preferences.riskProfile}`,
          `分析周期：${preferences.timeframe}`,
          `重点维度：${preferences.dimensions.join('、')}`,
          `自定义关注点：${preferences.customFocus || '无'}`,
          `趋势状态：${indicators?.trend.regime || 'N/A'}`,
          `RSI14：${indicators?.momentum.rsi14 ?? 'N/A'}`,
          `MACD：${indicators?.momentum.macd ?? 'N/A'} / Signal ${indicators?.momentum.signal ?? 'N/A'}`,
          `波动率：${indicators?.volatility.annualizedVolatility ?? 'N/A'}%`,
          `支撑位：${indicators?.supportResistance.support ?? 'N/A'}`,
          `阻力位：${indicators?.supportResistance.resistance ?? 'N/A'}`,
          `综合信号评分：${indicators?.signalScore ?? 'N/A'} / ${indicators?.signalLabel || 'N/A'}`,
          `最近20个交易日数据：`,
          recentSeries.map((item) => `${item.date} | close ${item.close} | rsi ${item.rsi14 ?? 'N/A'} | macdHist ${item.macdHistogram ?? 'N/A'} | volume ${item.volume}`).join('\n'),
          `请输出：1. 市场结论摘要 2. 技术指标拆解 3. 量化执行框架 4. 风险点与反证条件 5. 操作建议`,
        ].join('\n');

        const text = await callCustomProviderDirect(
          [{ role: 'user', content: summaryPrompt }],
          { temperature: 0.3 },
        );
        setAnalysis(text);
        setAnalysisSource('third-party');
        return;
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol, preferences, providerConfig }),
      });

      if (!res.ok) {
        const payload = await readApiPayload(res);
        throw new Error(payload.error || 'AI 分析失败');
      }

      const payload = await readApiPayload(res);
      if (!hasAnalysisPayloadShape(payload)) {
        throw new Error(
          getPayloadError(
            payload,
            'AI 分析接口返回格式异常，可能部署时把 /api 请求重写到了首页，请检查 Vercel 路由配置。',
          ),
        );
      }
      setAnalysis(payload.analysis || '');
      setAnalysisSource(payload.source || null);
    } catch (analysisError: any) {
      setAnalysis(analysisError.message || 'AI 分析失败');
      setAnalysisSource(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleDimension = (dimension: AnalysisDimension) => {
    setPreferences((current) => {
      const exists = current.dimensions.includes(dimension);
      const nextDimensions = exists
        ? current.dimensions.filter((item) => item !== dimension)
        : [...current.dimensions, dimension];
      return {
        ...current,
        dimensions: nextDimensions.length ? nextDimensions : [dimension],
      };
    });
  };

  const changePreference = <K extends keyof AnalysisPreferences>(key: K, value: AnalysisPreferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const changeProviderConfig = <K extends keyof ProviderConfig>(key: K, value: ProviderConfig[K]) => {
    setProviderConfig((current) => ({ ...current, [key]: value }));
  };

  const saveProviderConfig = () => {
    window.localStorage.setItem(
      providerStorageKey,
      JSON.stringify({
        baseUrl: providerConfig.baseUrl.trim(),
        apiKey: providerConfig.apiKey.trim(),
        model: providerConfig.model.trim() || defaultProviderConfig.model,
      }),
    );
    setShowSettings(false);
  };

  const clearProviderConfig = () => {
    window.localStorage.removeItem(providerStorageKey);
    setProviderConfig(defaultProviderConfig);
    setProviderTestStatus(null);
    setProviderDebugInfo(null);
  };

  const testProviderConnection = async () => {
    if (!providerConfig.baseUrl.trim() || !providerConfig.apiKey.trim()) {
      setProviderTestStatus('请先填写 Base URL 和 API Key。');
      return;
    }

    setTestingProvider(true);
    setProviderTestStatus(null);
    setProviderDebugInfo(null);
    try {
      if (testTransport === 'server') {
        const res = await fetch('/api/provider/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerConfig, debugMode }),
        });
        const payload = await readApiPayload(res);
        if (payload.debug) {
          setProviderDebugInfo(payload.debug);
        }
        if (!res.ok) {
          throw new Error(payload.error || '连接测试失败');
        }
        setProviderTestStatus(`服务端连接成功：${payload.provider}，请求 ${payload.requestUrl}，返回 ${payload.preview}`);
      } else {
        const text = await testCustomProviderDirect();
        setProviderTestStatus(`浏览器直连成功：请求 ${providerConfig.baseUrl.trim()}，返回 ${text.slice(0, 120)}`);
      }
    } catch (testError: any) {
      if (
        testTransport === 'server' &&
        typeof testError?.message === 'string' &&
        /NOT_FOUND|404|could not be found/i.test(testError.message)
      ) {
        try {
          const text = await testCustomProviderDirect();
          setTestTransport('browser');
          setProviderTestStatus(`服务端转发不可用，但浏览器直连成功。该网关将自动按浏览器直连方式使用。返回 ${text.slice(0, 120)}`);
          return;
        } catch {
          // keep original server-side failure below
        }
      }
      setProviderTestStatus(`连接失败：${testError.message || '未知错误'}`);
    } finally {
      setTestingProvider(false);
    }
  };

  const renderAnalysis = (text: string) =>
    text.split('\n').map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={`space-${index}`} className="h-3" />;
      if (trimmed.startsWith('## ')) {
        return <h3 key={index} className="mt-5 mb-2 text-lg font-semibold text-slate-50">{trimmed.slice(3)}</h3>;
      }
      if (trimmed.startsWith('### ')) {
        return <h4 key={index} className="mt-4 mb-2 text-sm font-semibold text-slate-200">{trimmed.slice(4)}</h4>;
      }
      if (trimmed.startsWith('- ')) {
        return <div key={index} className="mb-2 flex gap-2 text-sm text-slate-300"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-300/70" /><span>{trimmed.slice(2)}</span></div>;
      }
      return <p key={index} className="mb-2 text-sm leading-6 text-slate-300">{trimmed}</p>;
    });

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[-8%] h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute right-[8%] top-[10%] h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-[8%] left-[28%] h-96 w-96 rounded-full bg-cyan-300/6 blur-3xl" />
      </div>
      <header className="sticky top-0 z-20 border-b border-white/8 bg-slate-950/55 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-sky-200 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Realtime Intelligence</p>
              <h1 className="text-2xl font-black tracking-tight text-slate-50">Market Analyzer Pro</h1>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative w-full lg:w-auto" ref={searchRef}>
            <div className="relative rounded-[28px] border border-white/10 bg-white/6 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="输入股票/加密资产，如 AAPL、BTC-USD、贵州茅台"
                className="w-full rounded-[22px] border border-transparent bg-transparent py-3.5 pl-12 pr-32 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300/20 focus:bg-white/4 lg:w-[420px]"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[18px] border border-sky-300/20 bg-sky-100 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '启动分析'}
              </button>
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full z-30 mt-3 w-full overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur-2xl">
                {searchResults.map((result, index) => (
                  <button
                    type="button"
                    key={`${result.symbol}-${index}`}
                    onClick={() => handleSelectResult(result.symbol)}
                    className="flex w-full items-center justify-between border-b border-white/6 px-4 py-3 text-left transition hover:bg-white/6 last:border-0"
                  >
                    <div>
                      <div className="font-semibold text-slate-100">{result.symbol}</div>
                      <div className="max-w-[260px] truncate text-xs text-slate-500">
                        {result.shortname || result.longname || result.exchange}
                      </div>
                    </div>
                    <div className="rounded-full border border-white/8 bg-white/6 px-2.5 py-1 text-xs font-medium text-slate-400">
                      {result.exchange}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">机构级多维盘面台</p>
                <h2 className="text-3xl font-black tracking-tight text-slate-50">
                  {quote ? quote.symbol : '让 AI + 量化指标一起做专业分析'}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-400">
                  新版支持 MACD、RSI、布林带、ATR、均线结构、量价相对强弱，并允许你按风险偏好和自定义关注点重组分析维度。
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  <Settings2 className="h-4 w-4" />
                  API 设置
                </button>
                <button
                  type="button"
                  onClick={() => ticker && runWorkflow(ticker)}
                  disabled={!ticker || loading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  刷新并重算
                </button>
                <button
                  type="button"
                  onClick={() => ticker && runAnalysis(ticker)}
                  disabled={!ticker || analyzing}
                  className="inline-flex items-center gap-2 rounded-2xl border border-sky-300/20 bg-sky-100 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <BrainCircuit className="h-4 w-4" />
                  重新生成 AI 报告
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard
                title="实时搜索"
                value={isSearching ? '匹配中...' : '已就绪'}
                subtitle="股票 / 港股 / A股 / 加密货币"
                icon={<Search className="h-4 w-4" />}
              />
              <InfoCard
                title="自动刷新"
                value={autoRefresh ? '每60秒' : '已关闭'}
                subtitle="面向盯盘场景"
                icon={<Waves className="h-4 w-4" />}
              />
              <InfoCard
                title="分析模式"
                value={analysisSource === 'third-party' ? '第三方模型' : analysisSource === 'openai' ? 'OpenAI 专业推理' : analysisSource === 'rules' ? '规则引擎' : '待生成'}
                subtitle={hasCustomProvider ? '优先走自定义 Base URL + API Key' : '默认走服务端 OpenAI'}
                icon={<BrainCircuit className="h-4 w-4" />}
              />
              <InfoCard
                title="风控配置"
                value={riskOptions.find((item) => item.value === preferences.riskProfile)?.label || '平衡'}
                subtitle="会影响报告中的仓位建议"
                icon={<ShieldAlert className="h-4 w-4" />}
              />
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Signal Engine</p>
                <h3 className="mt-2 text-xl font-bold text-slate-50">综合信号评分</h3>
              </div>
              <Gauge className="h-5 w-5 text-sky-200" />
            </div>
            {indicators ? (
              <>
                <div className={`mt-6 inline-flex rounded-2xl border px-4 py-2 text-sm font-bold ${metricTone(indicators.signalScore)}`}>
                  {indicators.signalScore}/100 · {indicators.signalLabel}
                </div>
                <div className="mt-5 space-y-3 text-sm text-slate-300">
                  {indicators.rationale.map((item, index) => (
                    <div key={index} className="rounded-2xl border border-white/8 bg-white/4 p-3 leading-6">
                      {item}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-8 text-sm text-slate-500">输入资产后会在这里生成多指标综合评分。</div>
            )}
          </div>
        </section>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-4 text-rose-200 shadow-[0_20px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">查询失败</div>
              <div className="mt-1 text-sm">
                {error}
              </div>
              <div className="mt-2 text-sm opacity-80">
                提示：美股使用 `AAPL`，港股使用 `0700.HK`，A股使用 `600519.SS` / `000001.SZ`，加密货币使用 `BTC-USD`。
              </div>
            </div>
          </div>
        )}

        {!quote && !loading && !error && (
          <div className="rounded-[36px] border border-dashed border-white/10 bg-white/4 px-6 py-20 text-center shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-sky-300/15 bg-sky-200/10 text-sky-200">
              <Activity className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-100">从代码、名称或币种开始</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
              这个版本不只看价格，还会把技术面、量化信号、波动风险、关键价位和 AI 专业报告整合成一个实时分析看板。
            </p>
          </div>
        )}

        {quote && indicators && (
          <div className="grid gap-8 xl:grid-cols-[1.45fr_0.95fr]">
            <section className="space-y-8">
              <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
                <div className="flex flex-col gap-6 border-b border-white/8 pb-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black tracking-tight text-slate-50">{quote.symbol}</h2>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {quote.exchange || 'Market'}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-400">{quote.shortName || quote.longName}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black tracking-tight text-slate-50">
                      {formatNumber(quote.regularMarketPrice)}
                      <span className="ml-2 text-lg font-medium text-slate-500">{quote.currency}</span>
                    </div>
                    <div className={`mt-2 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold ${quote.regularMarketChangePercent && quote.regularMarketChangePercent >= 0 ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/20 bg-rose-400/10 text-rose-300'}`}>
                      {quote.regularMarketChangePercent && quote.regularMarketChangePercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {quote.regularMarketChange && quote.regularMarketChange > 0 ? '+' : ''}
                      {formatNumber(quote.regularMarketChange)}
                      <span>
                        ({quote.regularMarketChangePercent && quote.regularMarketChangePercent > 0 ? '+' : ''}
                        {formatNumber(quote.regularMarketChangePercent)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="今日区间" value={`${formatNumber(quote.regularMarketDayLow)} - ${formatNumber(quote.regularMarketDayHigh)}`} />
                  <MetricCard label="52周区间" value={`${formatNumber(quote.fiftyTwoWeekLow)} - ${formatNumber(quote.fiftyTwoWeekHigh)}`} />
                  <MetricCard label="成交量 / 市值" value={`${formatCompact(quote.regularMarketVolume)} / ${formatCompact(quote.marketCap)}`} />
                  <MetricCard label="PE / 股息率" value={`${formatNumber(quote.trailingPE)} / ${quote.dividendYield ? `${formatNumber(quote.dividendYield * 100)}%` : 'N/A'}`} />
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-50">价格结构与均线轨道</h3>
                    <p className="text-sm text-slate-400">叠加 Close、SMA20、EMA50，辅助识别结构切换。</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
                    周期 {timeframeOptions.find((item) => item.value === preferences.timeframe)?.label}
                  </div>
                </div>
                <div className="h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={series}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(148,163,184,0.16)" vertical={false} strokeDasharray="4 4" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} minTickGap={28} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(value)} width={72} />
                      <Tooltip
                        contentStyle={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 45px rgba(0,0,0,0.35)', backgroundColor: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(16px)' }}
                        formatter={(value: number | string, name: string) => [formatNumber(Number(value)), name]}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="close" stroke="#93c5fd" fill="url(#priceGradient)" fillOpacity={1} name="Close" strokeWidth={2.2} />
                      <Line type="monotone" dataKey="sma20" stroke="#f8fafc" dot={false} name="SMA20" strokeWidth={1.8} />
                      <Line type="monotone" dataKey="ema50" stroke="#38bdf8" dot={false} name="EMA50" strokeWidth={1.8} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <SignalCard title="趋势状态" value={indicators.trend.regime} detail={`EMA20 ${formatNumber(indicators.trend.ema20)} / EMA50 ${formatNumber(indicators.trend.ema50)}`} />
                <SignalCard title="RSI / MACD" value={indicators.momentum.label} detail={`RSI ${formatNumber(indicators.momentum.rsi14)} · Hist ${formatNumber(indicators.momentum.histogram, 4)}`} />
                <SignalCard title="波动风险" value={indicators.volatility.label} detail={`ATR ${formatNumber(indicators.volatility.atr14)} · 年化 ${formatNumber(indicators.volatility.annualizedVolatility)}%`} />
                <SignalCard title="量价关系" value={indicators.volume.label} detail={`相对量能 ${formatNumber(indicators.volume.relativeVolume)}x`} />
                <SignalCard title="支撑 / 阻力" value={`${formatNumber(indicators.supportResistance.support)} / ${formatNumber(indicators.supportResistance.resistance)}`} detail={`距支撑 ${formatNumber(indicators.supportResistance.distanceToSupportPct)}% · 距阻力 ${formatNumber(indicators.supportResistance.distanceToResistancePct)}%`} />
                <SignalCard title="布林带位置" value={indicators.bollinger.positionLabel} detail={`上轨 ${formatNumber(indicators.bollinger.upper)} · 下轨 ${formatNumber(indicators.bollinger.lower)}`} />
              </div>
            </section>

            <aside className="space-y-8">
              <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-50">分析配置</h3>
                    <p className="text-sm text-slate-400">修改后点击“重新生成 AI 报告”即可按新维度分析。</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(event) => setAutoRefresh(event.target.checked)}
                      className="h-4 w-4 rounded border-white/10 bg-transparent text-sky-300 focus:ring-sky-300"
                    />
                    自动刷新
                  </label>
                </div>

                <div className="mt-6">
                  <div className="mb-2 text-sm font-semibold text-slate-300">分析周期</div>
                  <div className="flex flex-wrap gap-2">
                    {timeframeOptions.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => changePreference('timeframe', item.value)}
                        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${preferences.timeframe === item.value ? 'border border-sky-300/20 bg-sky-100 text-slate-950' : 'border border-white/8 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 text-sm font-semibold text-slate-300">风险偏好</div>
                  <div className="flex flex-wrap gap-2">
                    {riskOptions.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => changePreference('riskProfile', item.value)}
                        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${preferences.riskProfile === item.value ? 'border border-sky-300/20 bg-sky-100 text-slate-950' : 'border border-white/8 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 text-sm font-semibold text-slate-300">分析维度</div>
                  <div className="grid gap-2">
                    {dimensionOptions.map((item) => (
                      <label key={item.value} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-3 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={preferences.dimensions.includes(item.value)}
                          onChange={() => toggleDimension(item.value)}
                          className="h-4 w-4 rounded border-white/10 bg-transparent text-sky-300 focus:ring-sky-300"
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold text-slate-300">自定义关注点</label>
                  <textarea
                    value={preferences.customFocus}
                    onChange={(event) => changePreference('customFocus', event.target.value)}
                    placeholder="例如：更关注突破确认、机构资金流向、是否适合波段交易"
                    className="min-h-28 w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300/20 focus:bg-white/6 focus:ring-4 focus:ring-sky-300/10"
                  />
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-sky-200" />
                  <h3 className="text-lg font-bold text-slate-50">AI 专业报告</h3>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  会结合技术指标、量化快照、风险偏好和你的自定义视角生成执行建议。
                </p>

                {analyzing ? (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3 text-sky-200">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm font-semibold">正在生成专业分析...</span>
                    </div>
                    {[0, 1, 2, 3].map((item) => (
                      <div key={item} className="h-4 animate-pulse rounded bg-white/8" />
                    ))}
                  </div>
                ) : analysis ? (
                  <div className="mt-6 rounded-[28px] border border-white/8 bg-slate-950/55 p-5 shadow-inner shadow-black/20">
                    <div className="mb-3 inline-flex rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400 shadow-sm">
                      {analysisSource === 'third-party' ? '第三方接口输出' : analysisSource === 'openai' ? 'OpenAI 推理输出' : analysisSource === 'rules' ? '规则引擎输出' : '分析结果'}
                    </div>
                    <div className="max-h-[680px] overflow-auto pr-1">
                      {renderAnalysis(analysis)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-[28px] border border-dashed border-white/10 bg-slate-950/45 p-5 text-sm leading-6 text-slate-400">
                    载入行情后会自动生成分析报告。你也可以先调整“分析周期 / 风险偏好 / 维度 / 自定义关注点”再触发。
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xl">
          <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-slate-950/88 p-6 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-200/10 px-3 py-1 text-xs font-semibold text-sky-200">
                  <KeyRound className="h-3.5 w-3.5" />
                  第三方 API 配置
                </div>
                <h3 className="mt-3 text-xl font-bold text-slate-50">配置 Base URL 和 API Key</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  当前默认使用服务端 OpenAI。保存后，分析和中文名称兜底解析会优先走你配置的 OpenAI 兼容第三方接口。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
              >
                关闭
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">Base URL</label>
                <input
                  value={providerConfig.baseUrl}
                  onChange={(event) => changeProviderConfig('baseUrl', event.target.value)}
                  placeholder="例如: https://api.openai.com/v1 或第三方网关"
                  className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300/20 focus:bg-white/6 focus:ring-4 focus:ring-sky-300/10"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">API Key</label>
                <input
                  type="password"
                  value={providerConfig.apiKey}
                  onChange={(event) => changeProviderConfig('apiKey', event.target.value)}
                  placeholder="输入第三方 API Key"
                  className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300/20 focus:bg-white/6 focus:ring-4 focus:ring-sky-300/10"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">Model</label>
                <input
                  value={providerConfig.model}
                  onChange={(event) => changeProviderConfig('model', event.target.value)}
                  placeholder="例如: gpt-4.1-mini"
                  className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300/20 focus:bg-white/6 focus:ring-4 focus:ring-sky-300/10"
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/8 bg-white/4 p-4 text-sm leading-6 text-slate-400">
              当前状态：{hasCustomProvider ? '已启用自定义第三方接口' : '未配置，将回退到服务端默认 OpenAI 或规则引擎'}。
            </div>

            <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-300">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(event) => setDebugMode(event.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-transparent text-sky-300 focus:ring-sky-300"
              />
              启用调试模式
            </label>

            <div className="mt-4">
              <div className="mb-2 text-sm font-semibold text-slate-300">测试通道</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTestTransport('server')}
                  className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${testTransport === 'server' ? 'border border-sky-300/20 bg-sky-100 text-slate-950' : 'border border-white/8 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                >
                  服务端转发
                </button>
                <button
                  type="button"
                  onClick={() => setTestTransport('browser')}
                  className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${testTransport === 'browser' ? 'border border-sky-300/20 bg-sky-100 text-slate-950' : 'border border-white/8 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                >
                  浏览器直连
                </button>
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-500">
                对于部分第三方网关，服务端转发会被上游拒绝，但浏览器直连可正常使用。当前自定义第三方分析默认按浏览器直连执行。
              </div>
            </div>

            {providerTestStatus && (
              <div className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${providerTestStatus.startsWith('连接成功') ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/20 bg-rose-400/10 text-rose-300'}`}>
                {providerTestStatus}
              </div>
            )}

            {debugMode && providerDebugInfo && (
              <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/60 p-4 text-xs leading-6 text-slate-300">
                <div className="mb-2 font-semibold text-slate-100">调试信息</div>
                <div><span className="text-slate-500">Request URL:</span> {providerDebugInfo.requestUrl || 'N/A'}</div>
                <div><span className="text-slate-500">Response Status:</span> {providerDebugInfo.responseStatus ?? 'N/A'}</div>
                <div><span className="text-slate-500">Content-Type:</span> {providerDebugInfo.responseContentType || 'N/A'}</div>
                <div className="mt-3">
                  <div className="mb-1 text-slate-500">Request Body Preview</div>
                  <pre className="overflow-auto rounded-xl border border-white/6 bg-black/20 p-3 text-[11px] text-slate-300">{providerDebugInfo.requestBodyPreview || 'N/A'}</pre>
                </div>
                <div className="mt-3">
                  <div className="mb-1 text-slate-500">Response Preview</div>
                  <pre className="overflow-auto rounded-xl border border-white/6 bg-black/20 p-3 text-[11px] text-slate-300">{providerDebugInfo.responsePreview || 'N/A'}</pre>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={testProviderConnection}
                disabled={testingProvider}
                className="rounded-2xl border border-sky-300/15 bg-sky-200/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-200/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testingProvider ? '测试中...' : '测试连接'}
              </button>
              <button
                type="button"
                onClick={clearProviderConfig}
                className="rounded-2xl border border-white/8 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
              >
                清除已保存配置
              </button>
              <button
                type="button"
                onClick={saveProviderConfig}
                className="rounded-2xl border border-sky-300/20 bg-sky-100 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[26px] border border-white/8 bg-white/4 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-sm font-medium">{title}</span>
        {icon}
      </div>
      <div className="mt-3 text-lg font-bold text-slate-100">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-white/8 bg-white/4 p-4 backdrop-blur-xl">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-bold text-slate-100">{value}</div>
    </div>
  );
}

function SignalCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-[28px] border border-white/8 bg-white/4 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-3 text-xl font-bold text-slate-100">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{detail}</div>
    </div>
  );
}

export default App;
