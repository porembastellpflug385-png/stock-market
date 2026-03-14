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
  score >= 75 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
  score >= 60 ? 'text-sky-600 bg-sky-50 border-sky-200' :
  score >= 45 ? 'text-amber-600 bg-amber-50 border-amber-200' :
  'text-rose-600 bg-rose-50 border-rose-200';

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
  const [analysisSource, setAnalysisSource] = useState<'gemini' | 'rules' | 'third-party' | null>(null);

  const [preferences, setPreferences] = useState<AnalysisPreferences>(defaultPreferences);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(defaultProviderConfig);
  const [testingProvider, setTestingProvider] = useState(false);
  const [providerTestStatus, setProviderTestStatus] = useState<string | null>(null);

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
          const data = await res.json();
          setSearchResults(data.slice(0, 8));
          setShowDropdown(true);
        }
      } catch (fetchError) {
        console.error('Search failed:', fetchError);
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
          const data = await res.json();
          if (Array.isArray(data) && data[0]?.symbol) {
            symbolToUse = data[0].symbol;
          }
        }
      } catch (fetchError) {
        console.error('Resolve symbol failed:', fetchError);
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
        const payload = await assetRes.json();
        throw new Error(payload.error || '获取行情失败');
      }

      const payload = await assetRes.json();
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
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol, preferences, providerConfig }),
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || 'AI 分析失败');
      }

      const payload = await res.json();
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
  };

  const testProviderConnection = async () => {
    if (!providerConfig.baseUrl.trim() || !providerConfig.apiKey.trim()) {
      setProviderTestStatus('请先填写 Base URL 和 API Key。');
      return;
    }

    setTestingProvider(true);
    setProviderTestStatus(null);
    try {
      const res = await fetch('/api/provider/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerConfig }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || '连接测试失败');
      }
      setProviderTestStatus(`连接成功：${payload.provider}，返回 ${payload.preview}`);
    } catch (testError: any) {
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
        return <h3 key={index} className="mt-5 mb-2 text-lg font-semibold text-slate-900">{trimmed.slice(3)}</h3>;
      }
      if (trimmed.startsWith('### ')) {
        return <h4 key={index} className="mt-4 mb-2 text-sm font-semibold text-slate-900">{trimmed.slice(4)}</h4>;
      }
      if (trimmed.startsWith('- ')) {
        return <div key={index} className="mb-2 flex gap-2 text-sm text-slate-700"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" /><span>{trimmed.slice(2)}</span></div>;
      }
      return <p key={index} className="mb-2 text-sm leading-6 text-slate-700">{trimmed}</p>;
    });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7_0%,_#f8fafc_40%,_#e2e8f0_100%)] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-amber-300 shadow-lg shadow-slate-900/15">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Realtime Intelligence</p>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Market Analyzer Pro</h1>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative w-full lg:w-auto" ref={searchRef}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="输入股票/加密资产，如 AAPL、BTC-USD、贵州茅台"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-28 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 lg:w-[420px]"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '启动分析'}
              </button>
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
                {searchResults.map((result, index) => (
                  <button
                    type="button"
                    key={`${result.symbol}-${index}`}
                    onClick={() => handleSelectResult(result.symbol)}
                    className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 last:border-0"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{result.symbol}</div>
                      <div className="max-w-[260px] truncate text-xs text-slate-500">
                        {result.shortname || result.longname || result.exchange}
                      </div>
                    </div>
                    <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      {result.exchange}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-900/5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">机构级多维盘面台</p>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">
                  {quote ? quote.symbol : '让 AI + 量化指标一起做专业分析'}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  新版支持 MACD、RSI、布林带、ATR、均线结构、量价相对强弱，并允许你按风险偏好和自定义关注点重组分析维度。
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Settings2 className="h-4 w-4" />
                  API 设置
                </button>
                <button
                  type="button"
                  onClick={() => ticker && runWorkflow(ticker)}
                  disabled={!ticker || loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  刷新并重算
                </button>
                <button
                  type="button"
                  onClick={() => ticker && runAnalysis(ticker)}
                  disabled={!ticker || analyzing}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
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
                value={analysisSource === 'third-party' ? '第三方模型' : analysisSource === 'gemini' ? 'Gemini 专业推理' : analysisSource === 'rules' ? '规则引擎' : '待生成'}
                subtitle={hasCustomProvider ? '优先走自定义 Base URL + API Key' : '后端统一分析链路'}
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

          <div className="rounded-[28px] border border-slate-200 bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Signal Engine</p>
                <h3 className="mt-2 text-xl font-bold">综合信号评分</h3>
              </div>
              <Gauge className="h-5 w-5 text-amber-300" />
            </div>
            {indicators ? (
              <>
                <div className={`mt-6 inline-flex rounded-2xl border px-4 py-2 text-sm font-bold ${metricTone(indicators.signalScore)}`}>
                  {indicators.signalScore}/100 · {indicators.signalLabel}
                </div>
                <div className="mt-5 space-y-3 text-sm text-slate-300">
                  {indicators.rationale.map((item, index) => (
                    <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-3 leading-6">
                      {item}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-8 text-sm text-slate-400">输入资产后会在这里生成多指标综合评分。</div>
            )}
          </div>
        </section>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
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
          <div className="rounded-[32px] border border-dashed border-slate-300 bg-white/70 px-6 py-20 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Activity className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">从代码、名称或币种开始</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
              这个版本不只看价格，还会把技术面、量化信号、波动风险、关键价位和 AI 专业报告整合成一个实时分析看板。
            </p>
          </div>
        )}

        {quote && indicators && (
          <div className="grid gap-8 xl:grid-cols-[1.45fr_0.95fr]">
            <section className="space-y-8">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
                <div className="flex flex-col gap-6 border-b border-slate-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black tracking-tight text-slate-900">{quote.symbol}</h2>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {quote.exchange || 'Market'}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-500">{quote.shortName || quote.longName}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black tracking-tight text-slate-900">
                      {formatNumber(quote.regularMarketPrice)}
                      <span className="ml-2 text-lg font-medium text-slate-400">{quote.currency}</span>
                    </div>
                    <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${quote.regularMarketChangePercent && quote.regularMarketChangePercent >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
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

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">价格结构与均线轨道</h3>
                    <p className="text-sm text-slate-500">叠加 Close、SMA20、EMA50，辅助识别结构切换。</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    周期 {timeframeOptions.find((item) => item.value === preferences.timeframe)?.label}
                  </div>
                </div>
                <div className="h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={series}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="4 4" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} minTickGap={28} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(value)} width={72} />
                      <Tooltip
                        contentStyle={{ borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 20px 45px rgba(15,23,42,0.08)' }}
                        formatter={(value: number | string, name: string) => [formatNumber(Number(value)), name]}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="close" stroke="#f59e0b" fill="url(#priceGradient)" fillOpacity={1} name="Close" strokeWidth={2.2} />
                      <Line type="monotone" dataKey="sma20" stroke="#0f172a" dot={false} name="SMA20" strokeWidth={1.8} />
                      <Line type="monotone" dataKey="ema50" stroke="#2563eb" dot={false} name="EMA50" strokeWidth={1.8} />
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
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">分析配置</h3>
                    <p className="text-sm text-slate-500">修改后点击“重新生成 AI 报告”即可按新维度分析。</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(event) => setAutoRefresh(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    自动刷新
                  </label>
                </div>

                <div className="mt-6">
                  <div className="mb-2 text-sm font-semibold text-slate-700">分析周期</div>
                  <div className="flex flex-wrap gap-2">
                    {timeframeOptions.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => changePreference('timeframe', item.value)}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${preferences.timeframe === item.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 text-sm font-semibold text-slate-700">风险偏好</div>
                  <div className="flex flex-wrap gap-2">
                    {riskOptions.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => changePreference('riskProfile', item.value)}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${preferences.riskProfile === item.value ? 'bg-amber-400 text-slate-900' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 text-sm font-semibold text-slate-700">分析维度</div>
                  <div className="grid gap-2">
                    {dimensionOptions.map((item) => (
                      <label key={item.value} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={preferences.dimensions.includes(item.value)}
                          onChange={() => toggleDimension(item.value)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">自定义关注点</label>
                  <textarea
                    value={preferences.customFocus}
                    onChange={(event) => changePreference('customFocus', event.target.value)}
                    placeholder="例如：更关注突破确认、机构资金流向、是否适合波段交易"
                    className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-slate-900">AI 专业报告</h3>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  会结合技术指标、量化快照、风险偏好和你的自定义视角生成执行建议。
                </p>

                {analyzing ? (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3 text-amber-600">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm font-semibold">正在生成专业分析...</span>
                    </div>
                    {[0, 1, 2, 3].map((item) => (
                      <div key={item} className="h-4 animate-pulse rounded bg-slate-100" />
                    ))}
                  </div>
                ) : analysis ? (
                  <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                    <div className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                      {analysisSource === 'third-party' ? '第三方接口输出' : analysisSource === 'gemini' ? 'Gemini 推理输出' : analysisSource === 'rules' ? '规则引擎输出' : '分析结果'}
                    </div>
                    <div className="max-h-[680px] overflow-auto pr-1">
                      {renderAnalysis(analysis)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
                    载入行情后会自动生成分析报告。你也可以先调整“分析周期 / 风险偏好 / 维度 / 自定义关注点”再触发。
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <KeyRound className="h-3.5 w-3.5" />
                  第三方 API 配置
                </div>
                <h3 className="mt-3 text-xl font-bold text-slate-900">配置 Base URL 和 API Key</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  当前默认使用服务端 Gemini。保存后，分析和中文名称兜底解析会优先走你配置的 OpenAI 兼容第三方接口。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
              >
                关闭
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Base URL</label>
                <input
                  value={providerConfig.baseUrl}
                  onChange={(event) => changeProviderConfig('baseUrl', event.target.value)}
                  placeholder="例如: https://api.openai.com/v1 或第三方网关"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">API Key</label>
                <input
                  type="password"
                  value={providerConfig.apiKey}
                  onChange={(event) => changeProviderConfig('apiKey', event.target.value)}
                  placeholder="输入第三方 API Key"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Model</label>
                <input
                  value={providerConfig.model}
                  onChange={(event) => changeProviderConfig('model', event.target.value)}
                  placeholder="例如: gpt-4.1-mini"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              当前状态：{hasCustomProvider ? '已启用自定义第三方接口' : '未配置，将回退到服务端默认 Gemini 或规则引擎'}。
            </div>

            {providerTestStatus && (
              <div className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${providerTestStatus.startsWith('连接成功') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                {providerTestStatus}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={testProviderConnection}
                disabled={testingProvider}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testingProvider ? '测试中...' : '测试连接'}
              </button>
              <button
                type="button"
                onClick={clearProviderConfig}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                清除已保存配置
              </button>
              <button
                type="button"
                onClick={saveProviderConfig}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-sm font-medium">{title}</span>
        {icon}
      </div>
      <div className="mt-3 text-lg font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}

function SignalCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-3 text-xl font-bold text-slate-900">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{detail}</div>
    </div>
  );
}

export default App;
