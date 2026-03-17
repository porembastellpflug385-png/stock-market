import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Activity,
  AlertCircle,
  BrainCircuit,
  FileText,
  Gauge,
  Loader2,
  Download,
  RefreshCw,
  Search,
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

type TrackingAsset = {
  symbol: string;
  name: string;
  market: string;
  assetClass: 'equity' | 'etf' | 'crypto' | 'other';
  tags: string[];
  priority: number;
  notes: string;
  addedAt: string;
};

type StrategyPortfolio = {
  strategyId: string;
  strategyName: string;
  initialCash: number;
  cash: number;
  positions: Array<{
    symbol: string;
    name: string;
    quantity: number;
    avgCost: number;
    marketPrice: number;
    marketValue: number;
    weight: number;
    unrealizedPnl: number;
  }>;
  trades: Array<{
    id: string;
    executedAt: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    amount: number;
    reason: string;
  }>;
  history: Array<{ date: string; equity: number; cash: number }>;
  lastRebalancedAt: string | null;
};

type TrackingReportRecord = {
  symbol: string;
  reportDate: string;
  quote: Quote;
  indicators: IndicatorSnapshot;
  analysis: string;
  structured: {
    direction: 'bullish' | 'neutral' | 'bearish';
    confidence: number;
    action: 'buy' | 'hold' | 'reduce' | 'avoid';
    horizon: 'short' | 'swing' | 'mid';
    support: number | null;
    resistance: number | null;
    summary: string;
  };
};

type ValidationRecord = {
  symbol: string;
  reportDate: string;
  validatedAt: string;
  actualReturnPct: number;
  directionCorrect: boolean;
  recommendationEffective: boolean;
  strategyAlignmentScore: number;
  notes: string;
};

type GeneratedReport = {
  id: string;
  scope: 'daily' | 'weekly' | 'monthly';
  generatedAt: string;
  title: string;
  markdown: string;
  trigger?: 'manual' | 'cron';
};

type TrackingOverview = {
  watchlist: TrackingAsset[];
  portfolios: StrategyPortfolio[];
  latestReports: TrackingReportRecord[];
  validations: ValidationRecord[];
  generatedReports: GeneratedReport[];
  strategies: Array<{ id: string; name: string; description: string; objective: string }>;
};

type ScannerTemplateId =
  | 'breakout'
  | 'volume-surge'
  | 'oversold-rebound'
  | 'trend-follow'
  | 'etf-rotation';

type ScannerMarket = 'US' | 'CN' | 'HK' | 'ETF' | 'CRYPTO';

type ScannerTemplate = {
  id: ScannerTemplateId;
  name: string;
  description: string;
  objective: string;
};

type ScannerCandidate = {
  symbol: string;
  name: string;
  market: ScannerMarket;
  assetClass: 'equity' | 'etf' | 'crypto';
  templateId: ScannerTemplateId;
  templateName: string;
  opportunityScore: number;
  riskScore: number;
  actionBias: 'watch' | 'prepare' | 'execute';
  summary: string;
  reasons: string[];
  metrics: {
    price: number;
    changePercent: number;
    signalScore: number;
    rsi14: number | null;
    relativeVolume: number | null;
    annualizedVolatility: number | null;
    weekReturn: number | null;
    monthReturn: number | null;
  };
};

type ScannerRefinement = {
  symbol: string;
  aiScore: number;
  conviction: 'high' | 'medium' | 'low';
  recommendation: 'focus' | 'watch' | 'skip';
  shouldPromote: boolean;
  summary: string;
  risks: string[];
};

type ScannerSnapshot = {
  id: string;
  scannedAt: string;
  templateId: ScannerTemplateId;
  templateName: string;
  markets: ScannerMarket[];
  scanned: number;
  candidates: ScannerCandidate[];
  refinements: ScannerRefinement[];
};

type ScannerValidationItem = {
  symbol: string;
  currentPrice: number;
  currentReturnPct: number;
  maxDrawdownPct: number;
  elapsedDays: number;
  day1Qualified: boolean;
  day5Qualified: boolean;
  day20Qualified: boolean;
  day1ReturnPct: number | null;
  day5ReturnPct: number | null;
  day20ReturnPct: number | null;
  positive: boolean;
  refinement?: ScannerRefinement;
};

type ScannerValidatedSnapshot = ScannerSnapshot & {
  validations: ScannerValidationItem[];
};

type ScannerValidationAggregate = {
  count: number;
  winRate: number;
  avgReturn: number;
  avgDrawdown: number;
  riskReward: number;
};

type ScannerValidationSummary = {
  rulesOnly: ScannerValidationAggregate;
  aiReviewed: ScannerValidationAggregate;
  aiPromoted: ScannerValidationAggregate;
  horizons: Record<'1日' | '5日' | '20日', {
    rulesOnly: ScannerValidationAggregate;
    aiReviewed: ScannerValidationAggregate;
    aiPromoted: ScannerValidationAggregate;
  }>;
  templates: Array<{
    templateId: ScannerTemplateId;
    templateName: string;
    count: number;
    rulesOnly: ScannerValidationAggregate;
    aiReviewed: ScannerValidationAggregate;
    aiPromoted: ScannerValidationAggregate;
  }>;
};

type ScannerUpgradeRecommendation = {
  symbol: string;
  name: string;
  targetPriority: 1 | 2 | 3;
  reason: string;
  candidate: ScannerCandidate;
  refinement?: ScannerRefinement;
};

type CandidatePoolItemStatus = 'candidate' | 'watching' | 'upgraded' | 'dismissed';

type CandidatePoolItem = {
  symbol: string;
  name: string;
  market: ScannerMarket;
  assetClass: ScannerCandidate['assetClass'];
  templateId: ScannerTemplateId;
  templateName: string;
  opportunityScore: number;
  aiScore: number | null;
  targetPriority: 0 | 1 | 2 | 3;
  status: CandidatePoolItemStatus;
  note: string;
  summary: string;
  addedAt: string;
};

type ScannerHighQualityCandidate = {
  candidate: ScannerCandidate;
  refinement: ScannerRefinement;
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
const trackingWatchlistStorageKey = 'market-analyzer-tracking-watchlist';
const trackingOverviewStorageKey = 'market-analyzer-tracking-overview';
const scannerSnapshotsStorageKey = 'market-analyzer-scanner-snapshots';
const candidatePoolStorageKey = 'market-analyzer-candidate-pool';
const defaultProviderConfig: ProviderConfig = {
  baseUrl: '',
  apiKey: '',
  model: 'gpt-5.4',
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

const trackingStrategies = [
  {
    id: 'global-value',
    name: '全球价值基金风格',
    description: '偏低估、低换手、重估值安全边际。',
    objective: '优先寻找估值合理、技术结构未破坏的资产。',
  },
  {
    id: 'global-growth',
    name: '全球成长基金风格',
    description: '偏趋势成长、强者恒强、景气驱动。',
    objective: '优先配置趋势强、量价健康的高质量成长资产。',
  },
  {
    id: 'macro-hedge',
    name: '宏观对冲风格',
    description: '重视风险预算、波动控制与现金管理。',
    objective: '在不确定环境中以防守和选择性进攻并重。',
  },
  {
    id: 'highflyer-quant',
    name: '幻方量化风格',
    description: '多因子、规则驱动、强调统计优势。',
    objective: '根据信号评分、动量与波动因子进行系统性配置。',
  },
  {
    id: 'etf-rotation',
    name: 'ETF 轮动风格',
    description: '面向 ETF 和指数代理资产的轮动策略。',
    objective: '在相对强势资产和低波动资产间做出周期轮换。',
  },
] as const;
const trackingAiMaxAssets = 6;
const scannerRunLimit = 24;
const scannerRefineLimit = 12;
const scannerHighQualityLimit = 6;
const scannerMarketOptions: Array<{ value: ScannerMarket; label: string }> = [
  { value: 'US', label: '美股' },
  { value: 'CN', label: 'A股' },
  { value: 'HK', label: '港股' },
  { value: 'ETF', label: 'ETF' },
  { value: 'CRYPTO', label: '加密' },
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

const readStoredTrackingWatchlist = (): TrackingAsset[] => {
  try {
    const raw = window.localStorage.getItem(trackingWatchlistStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.symbol === 'string');
  } catch {
    return [];
  }
};

const persistTrackingWatchlist = (watchlist: TrackingAsset[]) => {
  if (watchlist.length === 0) {
    window.localStorage.removeItem(trackingWatchlistStorageKey);
    return;
  }
  window.localStorage.setItem(trackingWatchlistStorageKey, JSON.stringify(watchlist));
};

const inferTrackingAssetClass = (symbol: string): TrackingAsset['assetClass'] => {
  if (symbol.endsWith('-USD')) return 'crypto';
  if (/ETF|SPY|QQQ|IWM|TLT|GLD|DIA/i.test(symbol)) return 'etf';
  if (/\.HK|\.SS|\.SZ|^[A-Z]+$/.test(symbol)) return 'equity';
  return 'other';
};

const inferTrackingMarket = (symbol: string) => {
  if (symbol.endsWith('.SS')) return 'SSE';
  if (symbol.endsWith('.SZ')) return 'SZSE';
  if (symbol.endsWith('.HK')) return 'HKEX';
  if (symbol.endsWith('-USD')) return 'CRYPTO';
  return 'GLOBAL';
};

const createEmptyTrackingOverview = (): TrackingOverview => ({
  watchlist: [],
  strategies: [...trackingStrategies],
  portfolios: trackingStrategies.map((strategy) => ({
    strategyId: strategy.id,
    strategyName: strategy.name,
    initialCash: 1_000_000,
    cash: 1_000_000,
    positions: [],
    trades: [],
    history: [],
    lastRebalancedAt: null,
  })),
  latestReports: [],
  validations: [],
  generatedReports: [],
});

const normalizeTrackingOverview = (payload: Partial<TrackingOverview> | null | undefined): TrackingOverview => {
  const base = createEmptyTrackingOverview();
  if (!payload) return base;
  return {
    watchlist: Array.isArray(payload.watchlist) ? payload.watchlist : [],
    strategies: Array.isArray(payload.strategies) && payload.strategies.length ? payload.strategies : base.strategies,
    portfolios: Array.isArray(payload.portfolios) && payload.portfolios.length ? payload.portfolios : base.portfolios,
    latestReports: Array.isArray(payload.latestReports) ? payload.latestReports : [],
    validations: Array.isArray(payload.validations) ? payload.validations : [],
    generatedReports: Array.isArray(payload.generatedReports) ? payload.generatedReports : [],
  };
};

const readStoredTrackingOverview = (): TrackingOverview => {
  try {
    const raw = window.localStorage.getItem(trackingOverviewStorageKey);
    if (raw) {
      return normalizeTrackingOverview(JSON.parse(raw));
    }
    const legacyWatchlist = readStoredTrackingWatchlist();
    if (legacyWatchlist.length > 0) {
      return normalizeTrackingOverview({
        ...createEmptyTrackingOverview(),
        watchlist: legacyWatchlist,
      });
    }
    return createEmptyTrackingOverview();
  } catch {
    return createEmptyTrackingOverview();
  }
};

const persistTrackingOverview = (overview: TrackingOverview) => {
  window.localStorage.setItem(trackingOverviewStorageKey, JSON.stringify(overview));
  persistTrackingWatchlist(overview.watchlist || []);
};

const readStoredScannerSnapshots = (): ScannerSnapshot[] => {
  try {
    const raw = window.localStorage.getItem(scannerSnapshotsStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistScannerSnapshots = (snapshots: ScannerSnapshot[]) => {
  window.localStorage.setItem(scannerSnapshotsStorageKey, JSON.stringify(snapshots.slice(0, 20)));
};

const compactScannerSnapshotsForValidation = (snapshots: ScannerSnapshot[]) =>
  snapshots.slice(0, 10).map((snapshot) => ({
    scannedAt: snapshot.scannedAt,
    templateId: snapshot.templateId,
    templateName: snapshot.templateName,
    candidates: (snapshot.candidates || []).slice(0, 20).map((candidate) => ({
      symbol: candidate.symbol,
      metrics: {
        price: candidate.metrics?.price ?? 0,
      },
    })),
    refinements: (snapshot.refinements || []).slice(0, 20).map((item) => ({
      symbol: item.symbol,
      shouldPromote: Boolean(item.shouldPromote),
    })),
  }));

const compactTrackingOverviewForRun = (overview: TrackingOverview) => ({
  watchlist: (overview.watchlist || []).map((item) => ({
    symbol: item.symbol,
    name: item.name,
    market: item.market,
    assetClass: item.assetClass,
    tags: item.tags,
    priority: item.priority,
    notes: item.notes,
    addedAt: item.addedAt,
  })),
  strategies: overview.strategies || [],
  portfolios: (overview.portfolios || []).map((portfolio) => ({
    strategyId: portfolio.strategyId,
    strategyName: portfolio.strategyName,
    initialCash: portfolio.initialCash,
    cash: portfolio.cash,
    positions: portfolio.positions,
    trades: portfolio.trades.slice(0, 40),
    history: portfolio.history.slice(0, 30),
    lastRebalancedAt: portfolio.lastRebalancedAt,
  })),
  latestReports: (overview.latestReports || []).slice(0, 20).map((report) => ({
    symbol: report.symbol,
    reportDate: report.reportDate,
    quote: report.quote,
    indicators: report.indicators,
    analysis: report.analysis.slice(0, 4000),
    structured: report.structured,
  })),
  validations: (overview.validations || []).slice(0, 80),
  generatedReports: [],
});

const readStoredCandidatePool = (): CandidatePoolItem[] => {
  try {
    const raw = window.localStorage.getItem(candidatePoolStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.symbol === 'string')
      : [];
  } catch {
    return [];
  }
};

const persistCandidatePool = (items: CandidatePoolItem[]) => {
  window.localStorage.setItem(candidatePoolStorageKey, JSON.stringify(items.slice(0, 80)));
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const reportBlockHtml = (text: string) =>
  text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<div class="report-spacer"></div>';
      if (trimmed.startsWith('## ')) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
      if (trimmed.startsWith('### ')) return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
      if (trimmed.startsWith('- ')) return `<li>${escapeHtml(trimmed.slice(2))}</li>`;
      return `<p>${escapeHtml(trimmed)}</p>`;
    })
    .join('');

const createReportMarkdown = ({
  ticker,
  quote,
  indicators,
  preferences,
  analysis,
}: {
  ticker: string;
  quote: Quote;
  indicators: IndicatorSnapshot;
  preferences: AnalysisPreferences;
  analysis: string;
}) => {
  const generatedAt = new Date().toLocaleString('zh-CN');
  return [
    `# ${quote.shortName || quote.longName || ticker} 专业分析报告`,
    '',
    `- 代码：${ticker}`,
    `- 生成时间：${generatedAt}`,
    `- 分析周期：${timeframeOptions.find((item) => item.value === preferences.timeframe)?.label || preferences.timeframe}`,
    `- 风险偏好：${riskOptions.find((item) => item.value === preferences.riskProfile)?.label || preferences.riskProfile}`,
    `- 自定义关注点：${preferences.customFocus || '无'}`,
    '',
    '## 市场快照',
    `- 最新价：${formatNumber(quote.regularMarketPrice)} ${quote.currency || ''}`,
    `- 当日涨跌：${formatNumber(quote.regularMarketChange)} (${formatNumber(quote.regularMarketChangePercent)}%)`,
    `- 交易所：${quote.exchange || 'N/A'}`,
    `- 成交量：${formatCompact(quote.regularMarketVolume)}`,
    `- 市值：${formatCompact(quote.marketCap)}`,
    '',
    '## 核心指标',
    `- 综合信号评分：${indicators.signalScore}/100（${indicators.signalLabel}）`,
    `- 趋势：${indicators.trend.regime}`,
    `- RSI14：${formatNumber(indicators.momentum.rsi14)}`,
    `- MACD：${formatNumber(indicators.momentum.macd)} / Signal ${formatNumber(indicators.momentum.signal)}`,
    `- ATR14：${formatNumber(indicators.volatility.atr14)}`,
    `- 支撑 / 阻力：${formatNumber(indicators.supportResistance.support)} / ${formatNumber(indicators.supportResistance.resistance)}`,
    '',
    '## 详细分析',
    analysis,
  ].join('\n');
};

const createReportHtml = ({
  ticker,
  quote,
  indicators,
  preferences,
  analysis,
}: {
  ticker: string;
  quote: Quote;
  indicators: IndicatorSnapshot;
  preferences: AnalysisPreferences;
  analysis: string;
}) => {
  const generatedAt = new Date().toLocaleString('zh-CN');
  return `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(ticker)} 专业分析报告</title>
        <style>
          :root {
            color-scheme: light;
            --bg: #edf3f8;
            --paper: #f7fafc;
            --card: rgba(255,255,255,0.96);
            --ink: #0f172a;
            --muted: #5f6f86;
            --line: rgba(15,23,42,0.07);
            --line-strong: rgba(15,23,42,0.11);
            --accent: #125d76;
            --accent-soft: rgba(18,93,118,0.10);
            --accent-glow: rgba(56,189,248,0.10);
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background:
              radial-gradient(circle at top right, var(--accent-glow), transparent 28%),
              linear-gradient(180deg, #f9fbfd 0%, var(--bg) 100%);
            color: var(--ink);
            font-family: "SF Pro Display","PingFang SC","Helvetica Neue",Arial,sans-serif;
          }
          .page {
            width: 860px;
            margin: 0 auto;
            padding: 56px 0 80px;
          }
          .sheet {
            background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,252,255,0.96));
            border: 1px solid var(--line);
            border-radius: 32px;
            box-shadow:
              0 28px 80px rgba(15,23,42,0.08),
              inset 0 1px 0 rgba(255,255,255,0.9);
            padding: 34px 34px 42px;
          }
          .hero, .card {
            background: var(--card);
            border: 1px solid var(--line);
            border-radius: 24px;
            box-shadow: 0 18px 44px rgba(15,23,42,0.05);
          }
          .hero {
            padding: 30px;
            background-image:
              radial-gradient(circle at top right, rgba(56,189,248,0.10), transparent 34%),
              linear-gradient(180deg, rgba(248,250,252,0.94), rgba(255,255,255,0.98));
          }
          .eyebrow {
            font-size: 12px;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: var(--muted);
            font-weight: 700;
          }
          h1 {
            margin: 14px 0 10px;
            font-size: 34px;
            line-height: 1.06;
            letter-spacing: -0.03em;
          }
          .sub {
            color: var(--muted);
            font-size: 13px;
            line-height: 1.8;
          }
          .hero-grid, .metric-grid { display: grid; gap: 14px; }
          .hero-grid { grid-template-columns: 1.25fr 0.75fr; margin-top: 26px; }
          .metric-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 18px; }
          .metric, .panel {
            border: 1px solid var(--line-strong);
            border-radius: 20px;
            background: rgba(255,255,255,0.88);
            padding: 16px 18px;
          }
          .metric-label, .panel-label { color: var(--muted); font-size: 12px; margin-bottom: 8px; }
          .metric-value { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
          .score {
            display: inline-flex;
            align-items: center;
            padding: 8px 14px;
            border-radius: 999px;
            background: var(--accent-soft);
            color: var(--accent);
            font-weight: 700;
            margin-bottom: 14px;
          }
          .card {
            padding: 28px 30px 34px;
            margin-top: 20px;
          }
          .article {
            max-width: 720px;
            margin: 0 auto;
          }
          h2 {
            font-size: 22px;
            margin: 32px 0 14px;
            letter-spacing: -0.02em;
          }
          h3 {
            font-size: 17px;
            margin: 20px 0 10px;
            color: #13233b;
          }
          p, li {
            color: #334155;
            font-size: 15px;
            line-height: 1.95;
          }
          p { margin: 0 0 12px; }
          li { margin: 0 0 6px 18px; }
          .report-spacer { height: 14px; }
          .section-rule {
            height: 1px;
            margin: 24px 0 8px;
            background: linear-gradient(90deg, rgba(15,23,42,0.12), rgba(15,23,42,0.03));
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="sheet">
            <section class="hero">
              <div class="eyebrow">Institutional Market Report</div>
              <h1>${escapeHtml(quote.shortName || quote.longName || ticker)}</h1>
              <div class="sub">代码：${escapeHtml(ticker)} · 生成时间：${escapeHtml(generatedAt)} · 周期：${escapeHtml(timeframeOptions.find((item) => item.value === preferences.timeframe)?.label || preferences.timeframe)}</div>
              <div class="hero-grid">
                <div class="panel">
                  <div class="panel-label">市场快照</div>
                  <div class="metric-value">${escapeHtml(formatNumber(quote.regularMarketPrice))} ${escapeHtml(quote.currency || '')}</div>
                  <p>当日涨跌 ${escapeHtml(formatNumber(quote.regularMarketChange))} (${escapeHtml(formatNumber(quote.regularMarketChangePercent))}%)</p>
                  <p>交易所 ${escapeHtml(quote.exchange || 'N/A')} · 风险偏好 ${escapeHtml(riskOptions.find((item) => item.value === preferences.riskProfile)?.label || preferences.riskProfile)}</p>
                </div>
                <div class="panel">
                  <div class="panel-label">综合信号</div>
                  <div class="score">${escapeHtml(String(indicators.signalScore))}/100 · ${escapeHtml(indicators.signalLabel)}</div>
                  <p>${escapeHtml(indicators.rationale.join('； '))}</p>
                </div>
              </div>
              <div class="metric-grid">
                <div class="metric"><div class="metric-label">趋势</div><div class="metric-value">${escapeHtml(indicators.trend.regime)}</div></div>
                <div class="metric"><div class="metric-label">RSI14</div><div class="metric-value">${escapeHtml(formatNumber(indicators.momentum.rsi14))}</div></div>
                <div class="metric"><div class="metric-label">MACD</div><div class="metric-value">${escapeHtml(formatNumber(indicators.momentum.macd))}</div></div>
                <div class="metric"><div class="metric-label">支撑 / 阻力</div><div class="metric-value">${escapeHtml(formatNumber(indicators.supportResistance.support))} / ${escapeHtml(formatNumber(indicators.supportResistance.resistance))}</div></div>
              </div>
            </section>
            <section class="card">
              <div class="article">
                <div class="eyebrow">AI Analysis</div>
                <div class="section-rule"></div>
                ${reportBlockHtml(analysis)}
              </div>
            </section>
          </div>
        </div>
      </body>
    </html>
  `;
};

const createPdfReport = async ({
  ticker,
  quote,
  indicators,
  preferences,
  analysis,
}: {
  ticker: string;
  quote: Quote;
  indicators: IndicatorSnapshot;
  preferences: AnalysisPreferences;
  analysis: string;
}) => {
  const reportRoot = document.createElement('div');
  reportRoot.style.position = 'fixed';
  reportRoot.style.left = '-99999px';
  reportRoot.style.top = '0';
  reportRoot.style.width = '860px';
  reportRoot.style.background = '#eef4f9';
  reportRoot.style.zIndex = '-1';
  reportRoot.innerHTML = createReportHtml({ ticker, quote, indicators, preferences, analysis });
  document.body.appendChild(reportRoot);

  try {
    const page = reportRoot.querySelector('.page') as HTMLElement | null;
    if (!page) throw new Error('报告内容渲染失败');

    const sheet = page.querySelector('.sheet') as HTMLElement | null;
    if (!sheet) throw new Error('报告 sheet 渲染失败');

    // A4 尺寸和边距
    const renderWidth = 860;
    const A4W = 595.28;
    const A4H = 841.89;
    const mx = 36;
    const my = 42;
    const usableW = A4W - mx * 2;
    const usableH = A4H - my * 2;
    const pxPerPt = renderWidth / usableW;
    const maxContentPx = usableH * pxPerPt - 140; // 140px reserved for card padding + page number

    // 收集所有可拆分的内容块
    const heroSection = sheet.querySelector('.hero') as HTMLElement | null;
    const articleEl = sheet.querySelector('.article') as HTMLElement | null;
    const allBlocks: HTMLElement[] = [];
    if (articleEl) {
      allBlocks.push(...(Array.from(articleEl.children) as HTMLElement[]));
    }

    // 将内容块分组到各页
    const contentPages: { isHero: boolean; blocks: HTMLElement[] }[] = [];

    // 第一页始终放 hero
    if (heroSection) {
      contentPages.push({ isHero: true, blocks: [heroSection] });
    }

    // 后续页放分析内容
    let curBlocks: HTMLElement[] = [];
    let curH = 0;
    for (const block of allBlocks) {
      const bh = block.getBoundingClientRect().height;
      if (curH + bh > maxContentPx && curBlocks.length > 0) {
        contentPages.push({ isHero: false, blocks: curBlocks });
        curBlocks = [];
        curH = 0;
      }
      curBlocks.push(block);
      curH += bh + 8;
    }
    if (curBlocks.length > 0) {
      contentPages.push({ isHero: false, blocks: curBlocks });
    }

    const totalPages = contentPages.length;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const cardStyle = `
      background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,252,255,0.96));
      border: 1px solid rgba(15,23,42,0.07);
      border-radius: 32px;
      box-shadow: 0 28px 80px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
      padding: 34px 34px 28px;
      font-family: "SF Pro Display","PingFang SC","Helvetica Neue",Arial,sans-serif;
      color: #0f172a;
    `;

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) doc.addPage();

      const container = document.createElement('div');
      container.style.cssText = `width:${renderWidth}px;background:linear-gradient(180deg,#f9fbfd 0%,#edf3f8 100%);padding:40px;`;

      const card = document.createElement('div');
      card.style.cssText = cardStyle;

      // 克隆内容块
      for (const el of contentPages[i].blocks) {
        card.appendChild(el.cloneNode(true));
      }

      // 如果不是 hero 页，添加分析标题
      if (!contentPages[i].isHero && i > 0) {
        const header = document.createElement('div');
        header.style.cssText = 'font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#5f6f86;font-weight:700;margin-bottom:14px;';
        header.textContent = `${ticker} · AI Analysis · Page ${i + 1}`;
        card.insertBefore(header, card.firstChild);
      }

      // 页码
      const pageNum = document.createElement('div');
      pageNum.style.cssText = 'text-align:center;color:#5f6f86;font-size:11px;margin-top:24px;padding-top:16px;border-top:1px solid rgba(15,23,42,0.06);';
      pageNum.textContent = `${i + 1} / ${totalPages}`;
      card.appendChild(pageNum);

      container.appendChild(card);
      reportRoot.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#eef4f9',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgW = usableW;
      const imgH = (canvas.height * imgW) / canvas.width;
      doc.addImage(imgData, 'PNG', mx, my, imgW, imgH, undefined, 'FAST');

      reportRoot.removeChild(container);
    }

    doc.save(`${ticker.toLowerCase()}-analysis-report.pdf`);
  } finally {
    document.body.removeChild(reportRoot);
  }
};

const openPrintableReport = ({
  ticker,
  quote,
  indicators,
  preferences,
  analysis,
}: {
  ticker: string;
  quote: Quote;
  indicators: IndicatorSnapshot;
  preferences: AnalysisPreferences;
  analysis: string;
}) => {
  const html = createReportHtml({ ticker, quote, indicators, preferences, analysis });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${ticker.toLowerCase()}-analysis-report.html`;
  link.click();
  URL.revokeObjectURL(url);
};

function App() {
  const [activeView, setActiveView] = useState<'analyzer' | 'tracking' | 'scanner'>('analyzer');
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
  const [trackingOverview, setTrackingOverview] = useState<TrackingOverview | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<string | null>(null);
  const [trackingAction, setTrackingAction] = useState<string | null>(null);
  const [scannerTemplates, setScannerTemplates] = useState<ScannerTemplate[]>([]);
  const [scannerTemplateId, setScannerTemplateId] = useState<ScannerTemplateId>('trend-follow');
  const [scannerMarkets, setScannerMarkets] = useState<ScannerMarket[]>(['US', 'CN', 'HK', 'ETF', 'CRYPTO']);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerResults, setScannerResults] = useState<ScannerCandidate[]>([]);
  const [scannerScanned, setScannerScanned] = useState(0);
  const [scannerRefineLoading, setScannerRefineLoading] = useState(false);
  const [scannerRefinements, setScannerRefinements] = useState<ScannerRefinement[]>([]);
  const [scannerSnapshots, setScannerSnapshots] = useState<ScannerSnapshot[]>([]);
  const [candidatePool, setCandidatePool] = useState<CandidatePoolItem[]>([]);
  const [scannerValidationLoading, setScannerValidationLoading] = useState(false);
  const [scannerValidatedSnapshots, setScannerValidatedSnapshots] = useState<ScannerValidatedSnapshot[]>([]);
  const [scannerValidationSummary, setScannerValidationSummary] = useState<ScannerValidationSummary | null>(null);

  const [preferences, setPreferences] = useState<AnalysisPreferences>(defaultPreferences);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(defaultProviderConfig);
  const [testingProvider, setTestingProvider] = useState(false);
  const [providerTestStatus, setProviderTestStatus] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [providerDebugInfo, setProviderDebugInfo] = useState<ProviderDebugInfo | null>(null);
  const [testTransport, setTestTransport] = useState<'server' | 'browser'>('browser');

  const getLatestTrackingOverview = () => readStoredTrackingOverview();

  const commitTrackingOverview = (overview: TrackingOverview) => {
    const normalized = normalizeTrackingOverview(overview);
    setTrackingOverview(normalized);
    persistTrackingOverview(normalized);
    return normalized;
  };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(providerStorageKey);
      if (saved) {
        setProviderConfig({ ...defaultProviderConfig, ...JSON.parse(saved) });
      }
    } catch (storageError) {
      console.error('Load provider config failed:', storageError);
    }
    setTrackingOverview(readStoredTrackingOverview());
    setScannerSnapshots(readStoredScannerSnapshots());
    setCandidatePool(readStoredCandidatePool());
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

  useEffect(() => {
    if (activeView === 'tracking') {
      loadTrackingOverview();
    }
  }, [activeView]);

  useEffect(() => {
    const loadScannerTemplates = async () => {
      try {
        const res = await fetch('/api/scanner/templates');
        const payload = await readApiPayload(res);
        if (!res.ok) {
          throw new Error(getPayloadError(payload, '加载扫描模板失败'));
        }
        if (Array.isArray(payload.templates)) {
          setScannerTemplates(payload.templates);
        }
      } catch (scannerTemplateError) {
        console.error('Load scanner templates failed:', scannerTemplateError);
      }
    };

    loadScannerTemplates();
  }, []);

  useEffect(() => {
    setCandidatePool(readStoredCandidatePool());
  }, []);

  useEffect(() => {
    if (scannerSnapshots.length === 0) {
      setScannerValidatedSnapshots([]);
      setScannerValidationSummary(null);
      return;
    }

    const runValidation = async () => {
      setScannerValidationLoading(true);
      try {
        const snapshots = compactScannerSnapshotsForValidation(scannerSnapshots);
        const res = await fetch('/api/scanner/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshots }),
        });
        const payload = await readApiPayload(res);
        if (!res.ok) {
          throw new Error(getPayloadError(payload, '加载扫描验证失败'));
        }
        setScannerValidatedSnapshots(Array.isArray(payload.snapshots) ? payload.snapshots : []);
        setScannerValidationSummary(payload.summary || null);
      } catch (validationError) {
        console.error('Load scanner validation failed:', validationError);
      } finally {
        setScannerValidationLoading(false);
      }
    };

    runValidation();
  }, [scannerSnapshots]);

  const hasCustomProvider = false;

  const getLLMHeaders = () => ({});

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
    setSearchQuery(symbol);
    setShowDropdown(false);
    if (activeView === 'tracking') {
      return;
    }
    setTicker(symbol);
    runWorkflow(symbol, false);
  };

  const handleSearch = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    let symbolToUse = query;
    let resolvedMeta: Partial<Pick<TrackingAsset, 'name' | 'market' | 'assetClass'>> | undefined;
    if (searchResults.length > 0 && searchQuery !== ticker) {
      symbolToUse = searchResults[0].symbol;
      resolvedMeta = {
        name: searchResults[0].shortname || searchResults[0].longname || searchResults[0].symbol,
        market: searchResults[0].exchange || inferTrackingMarket(searchResults[0].symbol),
        assetClass: inferTrackingAssetClass(searchResults[0].symbol),
      };
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
            resolvedMeta = {
              name: results[0].shortname || results[0].longname || results[0].symbol,
              market: results[0].exchange || inferTrackingMarket(results[0].symbol),
              assetClass: inferTrackingAssetClass(results[0].symbol),
            };
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

    setSearchQuery(symbolToUse);
    setShowDropdown(false);

    if (activeView === 'tracking') {
      await addTrackingAsset(symbolToUse, resolvedMeta);
      return;
    }

    if (activeView === 'scanner') {
      const verifiedAsset = await verifyTrackingAsset(symbolToUse);
      const verifiedQuote = verifiedAsset.quote as Quote;
      addCandidatePoolItem(
        {
          symbol: symbolToUse.toUpperCase(),
          name: resolvedMeta?.name || verifiedQuote.shortName || verifiedQuote.longName || symbolToUse.toUpperCase(),
          market: (resolvedMeta?.market as ScannerMarket) || inferTrackingMarket(symbolToUse.toUpperCase()) as ScannerMarket,
          assetClass: (resolvedMeta?.assetClass as ScannerCandidate['assetClass']) || inferTrackingAssetClass(symbolToUse.toUpperCase()) as ScannerCandidate['assetClass'],
          templateId: scannerTemplateId,
          templateName: scannerTemplates.find((item) => item.id === scannerTemplateId)?.name || '手动加入',
          opportunityScore: 60,
          riskScore: 45,
          actionBias: 'watch',
          summary: '手动加入扫描候选池，等待后续规则/AI 进一步确认。',
          reasons: ['来自手动输入，尚未经过完整扫描模板筛选。'],
          metrics: {
            price: Number(verifiedQuote.regularMarketPrice || 0),
            changePercent: Number(verifiedQuote.regularMarketChangePercent || 0),
            signalScore: 60,
            rsi14: null,
            relativeVolume: null,
            annualizedVolatility: null,
            weekReturn: null,
            monthReturn: null,
          },
        },
        {
          status: 'candidate',
          targetPriority: 1,
          note: '手动加入扫描候选池',
        },
      );
      return;
    }

    setTicker(symbolToUse);
    runWorkflow(symbolToUse, false);
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
        body: JSON.stringify({ ticker: symbol, preferences }),
      });

      if (!res.ok) {
        const payload = await readApiPayload(res);
        if (payload.fallbackAnalysis && typeof payload.fallbackAnalysis === 'string') {
          setAnalysis(payload.fallbackAnalysis);
          setAnalysisSource('rules');
        } else {
          throw new Error(payload.error || 'AI 分析失败');
        }
      } else {

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

      }
    } catch (analysisError: any) {
      setAnalysis(analysisError.message || 'AI 分析失败');
      setAnalysisSource(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadMarkdownReport = () => {
    if (!quote || !indicators || !analysis || !ticker) return;
    const markdown = createReportMarkdown({ ticker, quote, indicators, preferences, analysis });
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ticker.toLowerCase()}-analysis-report.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadHtmlReport = () => {
    if (!quote || !indicators || !analysis || !ticker) return;
    openPrintableReport({ ticker, quote, indicators, preferences, analysis });
  };

  const downloadPdfReport = async () => {
    if (!quote || !indicators || !analysis || !ticker) return;
    await createPdfReport({ ticker, quote, indicators, preferences, analysis });
  };

  const downloadTrackingReport = (report: GeneratedReport) => {
    const blob = new Blob([report.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.scope}-${report.generatedAt.slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadTrackingOverview = async () => {
    setTrackingLoading(true);
    setTrackingError(null);
    setTrackingStatus(null);
    try {
      const overview = readStoredTrackingOverview();
      commitTrackingOverview(overview);
    } catch (trackingLoadError: any) {
      setTrackingError(trackingLoadError.message || '加载跟踪系统失败');
    } finally {
      setTrackingLoading(false);
    }
  };

  const toggleScannerMarket = (market: ScannerMarket) => {
    setScannerMarkets((current) => {
      const exists = current.includes(market);
      if (exists) {
        const next = current.filter((item) => item !== market);
        return next.length ? next : [market];
      }
      return [...current, market];
    });
  };

  const runScanner = async () => {
    setScannerLoading(true);
    setScannerError(null);
    try {
      const res = await fetch('/api/scanner/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: scannerTemplateId,
          markets: scannerMarkets,
          limit: scannerRunLimit,
        }),
      });
      const payload = await readApiPayload(res);
      if (!res.ok) {
        throw new Error(getPayloadError(payload, '运行市场扫描失败'));
      }
      setScannerResults(Array.isArray(payload.candidates) ? payload.candidates : []);
      setScannerScanned(Number(payload.scanned || 0));
      setScannerRefinements([]);
      if (payload.requestedScanned && payload.requestedScanned > payload.scanned) {
        setScannerError(`为避免部署超时，本次线上扫描已从 ${payload.requestedScanned} 只候选中限流执行 ${payload.scanned} 只。`);
      }
      const activeTemplate = scannerTemplates.find((item) => item.id === scannerTemplateId);
      const nextSnapshots = [
        {
          id: `scan-${Date.now()}`,
          scannedAt: new Date().toISOString(),
          templateId: scannerTemplateId,
          templateName: activeTemplate?.name || scannerTemplateId,
          markets: scannerMarkets,
          scanned: Number(payload.scanned || 0),
          candidates: Array.isArray(payload.candidates) ? payload.candidates : [],
          refinements: [],
        },
        ...scannerSnapshots,
      ].slice(0, 20);
      setScannerSnapshots(nextSnapshots);
      persistScannerSnapshots(nextSnapshots);
    } catch (scannerRunError: any) {
      setScannerError(scannerRunError.message || '运行市场扫描失败');
    } finally {
      setScannerLoading(false);
    }
  };

  const runScannerRefinement = async () => {
    if (scannerResults.length === 0) {
      setScannerError('请先运行规则扫描，再执行 AI 精筛。');
      return;
    }

    setScannerRefineLoading(true);
    setScannerError(null);
    try {
      const candidates = scannerResults.slice(0, scannerRefineLimit).map((item) => ({
        symbol: item.symbol,
        name: item.name,
        market: item.market,
        templateName: item.templateName,
        opportunityScore: item.opportunityScore,
        riskScore: item.riskScore,
        actionBias: item.actionBias,
        summary: item.summary,
        reasons: item.reasons,
        metrics: item.metrics,
      }));

      const res = await fetch('/api/scanner/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates, topN: scannerHighQualityLimit }),
      });
      const payload = await readApiPayload(res);
      if (!res.ok) {
        throw new Error(getPayloadError(payload, 'AI 精筛失败'));
      }

      const refinements = Array.isArray(payload.refined) ? payload.refined : [];
      if (payload.degraded) {
        setScannerError('AI 上游繁忙，本次展示的是规则降级精筛结果；系统已经实际触发过 AI 请求并自动回退。');
      } else if (payload.model && payload.model !== 'gpt-5.4') {
        setScannerError(`AI 精筛已自动切换到 ${payload.model} 执行，当前展示的是实际模型返回结果。`);
      }
      setScannerRefinements(refinements);
      if (scannerSnapshots.length > 0) {
        const nextSnapshots = scannerSnapshots.map((snapshot, index) =>
          index === 0
            ? {
                ...snapshot,
                refinements,
              }
            : snapshot,
        );
        setScannerSnapshots(nextSnapshots);
        persistScannerSnapshots(nextSnapshots);
      }
    } catch (scannerRefineError: any) {
      setScannerError(scannerRefineError.message || 'AI 精筛失败');
    } finally {
      setScannerRefineLoading(false);
    }
  };

  const verifyTrackingAsset = async (symbol: string) => {
    const response = await fetch(`/api/asset/${encodeURIComponent(symbol)}?timeframe=6mo`);
    const payload = await readApiPayload(response);
    if (!response.ok) {
      throw new Error(getPayloadError(payload, `标的 ${symbol} 暂时无法获取行情`));
    }
    if (!hasAssetPayloadShape(payload)) {
      throw new Error(`标的 ${symbol} 返回格式异常，请稍后再试`);
    }
    return payload;
  };

  const addTrackingAsset = async (
    symbol: string,
    metadata?: Partial<Pick<TrackingAsset, 'name' | 'market' | 'assetClass'>>,
  ) => {
    setTrackingAction('add');
    setTrackingError(null);
    setTrackingStatus(null);
    try {
      const nextSymbol = symbol.trim().toUpperCase();
      const current = getLatestTrackingOverview();
      if (current.watchlist.some((item) => item.symbol === nextSymbol)) {
        commitTrackingOverview(current);
        return;
      }

      let verifiedQuote: Quote | null = null;
      try {
        const verifiedAsset = await verifyTrackingAsset(nextSymbol);
        verifiedQuote = verifiedAsset.quote as Quote;
      } catch (verificationError: any) {
        setTrackingError(`已加入关注池，但行情预检失败：${verificationError.message || '未知错误'}`);
      }

      const overview = commitTrackingOverview({
        ...current,
        watchlist: [
          {
            symbol: nextSymbol,
            name: metadata?.name || verifiedQuote?.shortName || verifiedQuote?.longName || nextSymbol,
            market: metadata?.market || verifiedQuote?.exchange || inferTrackingMarket(nextSymbol),
            assetClass: metadata?.assetClass || inferTrackingAssetClass(nextSymbol),
            tags: [],
            priority: 0,
            notes: '',
            addedAt: new Date().toISOString(),
          },
          ...current.watchlist,
        ],
      });
      setSearchQuery('');
      setSearchResults([]);
    } catch (trackingActionError: any) {
      setTrackingError(trackingActionError.message || '加入关注池失败');
    } finally {
      setTrackingAction(null);
    }
  };

  const removeTracking = async (symbol: string) => {
    setTrackingAction(symbol);
    setTrackingError(null);
    setTrackingStatus(null);
    try {
      const current = getLatestTrackingOverview();
      commitTrackingOverview({
        ...current,
        watchlist: current.watchlist.filter((item) => item.symbol !== symbol.toUpperCase()),
      });
    } catch (trackingActionError: any) {
      setTrackingError(trackingActionError.message || '移除关注池失败');
    } finally {
      setTrackingAction(null);
    }
  };

  const setPriorityLevel = async (symbol: string, priority: number) => {
    setTrackingAction(`priority-${symbol}-${priority}`);
    setTrackingError(null);
    setTrackingStatus(null);
    try {
      const current = getLatestTrackingOverview();
      const normalizedPriority = Math.max(0, Math.min(3, Math.round(priority)));
      commitTrackingOverview({
        ...current,
        watchlist: current.watchlist.map((item) =>
          item.symbol !== symbol.toUpperCase()
            ? item
            : {
                ...item,
                priority: normalizedPriority,
                tags:
                  normalizedPriority > 0
                    ? Array.from(new Set([...item.tags, '重点']))
                    : item.tags.filter((tag) => tag !== '重点'),
              },
        ),
      });
    } catch (trackingPriorityError: any) {
      setTrackingError(trackingPriorityError.message || '更新优先级失败');
    } finally {
      setTrackingAction(null);
    }
  };

  const addCandidatePoolItem = (
    candidate: ScannerCandidate,
    options?: {
      targetPriority?: 0 | 1 | 2 | 3;
      status?: CandidatePoolItemStatus;
      note?: string;
      refinement?: ScannerRefinement;
    },
  ) => {
    const nextItem: CandidatePoolItem = {
      symbol: candidate.symbol,
      name: candidate.name,
      market: candidate.market,
      assetClass: candidate.assetClass,
      templateId: candidate.templateId,
      templateName: candidate.templateName,
      opportunityScore: candidate.opportunityScore,
      aiScore: options?.refinement?.aiScore ?? null,
      targetPriority: options?.targetPriority ?? 0,
      status: options?.status ?? 'candidate',
      note: options?.note ?? '',
      summary: options?.refinement?.summary || candidate.summary,
      addedAt: new Date().toISOString(),
    };

    const nextPool = [
      nextItem,
      ...candidatePool.filter((item) => item.symbol !== candidate.symbol),
    ].slice(0, 80);
    setCandidatePool(nextPool);
    persistCandidatePool(nextPool);
  };

  const updateCandidatePoolStatus = (
    symbol: string,
    status: CandidatePoolItemStatus,
    targetPriority?: 0 | 1 | 2 | 3,
  ) => {
    const nextPool = candidatePool.map((item) =>
      item.symbol !== symbol
        ? item
        : {
            ...item,
            status,
            targetPriority: targetPriority ?? item.targetPriority,
          },
    );
    setCandidatePool(nextPool);
    persistCandidatePool(nextPool);
  };

  const removeCandidatePoolItem = (symbol: string) => {
    const nextPool = candidatePool.filter((item) => item.symbol !== symbol);
    setCandidatePool(nextPool);
    persistCandidatePool(nextPool);
  };

  const buildScannerDigest = () => {
    const latestSnapshot = scannerSnapshots[0];
    const activeCandidates = candidatePool.filter((item) => item.status !== 'dismissed');
    if (!latestSnapshot && activeCandidates.length === 0) return '';

    const lines = [
      '## 扫描器摘要',
      '',
      latestSnapshot
        ? `- 最近扫描：${latestSnapshot.templateName} · ${new Date(latestSnapshot.scannedAt).toLocaleString('zh-CN')} · 候选 ${latestSnapshot.candidates.length} 只`
        : '- 最近扫描：暂无',
      `- 候选池状态：待观察 ${candidatePool.filter((item) => item.status === 'candidate').length} / 观察中 ${candidatePool.filter((item) => item.status === 'watching').length} / 已升级 ${candidatePool.filter((item) => item.status === 'upgraded').length}`,
      '',
      '### 今日优先候选',
      ...(activeCandidates.slice(0, 5).map((item) =>
        `- ${item.symbol}：${item.templateName} · 规则分 ${item.opportunityScore}${item.aiScore != null ? ` · AI 分 ${item.aiScore}` : ''} · 建议 P${item.targetPriority || 1} · ${item.summary}`,
      ) || ['- 暂无可用候选']),
      '',
    ];
    return lines.join('\n');
  };

  const runTrackingScope = async (scope: 'daily' | 'weekly' | 'monthly') => {
    setTrackingAction(scope);
    setTrackingError(null);
    setTrackingStatus(null);
    try {
      const currentOverview = getLatestTrackingOverview();
      if ((currentOverview.watchlist?.length || 0) === 0) {
        throw new Error(`请先加入至少一个关注标的，再生成${scope === 'daily' ? '日报' : scope === 'weekly' ? '周报' : '月报'}。`);
      }
      const compactOverview = compactTrackingOverviewForRun(currentOverview);

      const res = await fetch('/api/tracking/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, mode: 'fast', state: compactOverview }),
      });
      const payload = await readApiPayload(res);
      if (!res.ok) {
        throw new Error(getPayloadError(payload, `生成${scope}报告失败`));
      }
      const overview =
        payload?.mode === 'fast'
          ? normalizeTrackingOverview({
              ...currentOverview,
              latestReports: Array.isArray(payload.latestReports) ? payload.latestReports : currentOverview.latestReports,
              generatedReports: payload.report
                ? [payload.report, ...(currentOverview.generatedReports || [])].slice(0, 60)
                : currentOverview.generatedReports,
            })
          : normalizeTrackingOverview(payload as TrackingOverview);
      const scannerDigest = buildScannerDigest();
      if (scannerDigest && overview.generatedReports.length > 0) {
        const [latestReport, ...restReports] = overview.generatedReports;
        overview.generatedReports = [
          {
            ...latestReport,
            markdown: `${latestReport.markdown}\n\n${scannerDigest}`,
          },
          ...restReports,
        ];
      }
      commitTrackingOverview(overview);
      setTrackingStatus(`已生成${scope === 'daily' ? '日报' : scope === 'weekly' ? '周报' : '月报'}，可在下方报告中心下载最新报告。`);
    } catch (trackingRunError: any) {
      setTrackingError(trackingRunError.message || '运行跟踪系统失败');
    } finally {
      setTrackingAction(null);
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

  const trackingTopPortfolios = trackingOverview?.portfolios || [];
  const latestTrackingReports = trackingOverview?.latestReports || [];
  const latestTrackingValidations = trackingOverview?.validations.slice(0, 8) || [];
  const latestGeneratedReports = trackingOverview?.generatedReports.slice(0, 6) || [];
  const watchlist = trackingOverview?.watchlist || [];
  const sortedWatchlist = [...watchlist].sort(
    (left, right) => right.priority - left.priority || left.addedAt.localeCompare(right.addedAt),
  );
  const priorityAssets = sortedWatchlist.filter((item) => item.priority > 0 || item.tags.includes('重点'));
  const plannedAiAssets = priorityAssets.slice(0, trackingAiMaxAssets);
  const refinementBySymbol = new Map<string, ScannerRefinement>(
    scannerRefinements.map((item) => [item.symbol, item]),
  );
  const latestScannerSnapshot = scannerSnapshots[0] || null;
  const latestValidatedSnapshot = scannerValidatedSnapshots[0] || null;
  const scannerHorizonSummaries = scannerValidationSummary?.horizons
    ? ([
        ['1日', scannerValidationSummary.horizons['1日']],
        ['5日', scannerValidationSummary.horizons['5日']],
        ['20日', scannerValidationSummary.horizons['20日']],
      ] as const)
    : [];
  const scannerTemplateSummaries = scannerValidationSummary?.templates || [];
  const sortedCandidatePool = [...candidatePool].sort(
    (left, right) =>
      right.targetPriority - left.targetPriority ||
      (right.aiScore ?? -1) - (left.aiScore ?? -1) ||
      right.opportunityScore - left.opportunityScore ||
      right.addedAt.localeCompare(left.addedAt),
  );
  const scannerUpgradeRecommendations: ScannerUpgradeRecommendation[] = scannerResults
    .map((candidate) => {
      const refinement = refinementBySymbol.get(candidate.symbol);
      const highConviction = refinement?.conviction === 'high';
      const aiScore = refinement?.aiScore ?? 0;
      const shouldPromote = refinement?.shouldPromote ?? false;

      if (candidate.opportunityScore >= 88 && aiScore >= 84 && shouldPromote && highConviction) {
        return {
          symbol: candidate.symbol,
          name: candidate.name,
          targetPriority: 3 as const,
          reason: '规则分、AI 分和高置信度同时满足，适合直接进入核心重点跟踪。',
          candidate,
          refinement,
        };
      }

      if (candidate.opportunityScore >= 78 && aiScore >= 72 && shouldPromote) {
        return {
          symbol: candidate.symbol,
          name: candidate.name,
          targetPriority: 2 as const,
          reason: '规则和 AI 都给出较强正反馈，适合进入重点候选并纳入日报优先处理。',
          candidate,
          refinement,
        };
      }

      if (candidate.opportunityScore >= 68 || aiScore >= 66) {
        return {
          symbol: candidate.symbol,
          name: candidate.name,
          targetPriority: 1 as const,
          reason: '已有一定机会分或 AI 认可度，适合进入基础重点观察名单。',
          candidate,
          refinement,
        };
      }

      return null;
    })
    .filter((item): item is ScannerUpgradeRecommendation => Boolean(item))
    .sort((left, right) => {
      if (right.targetPriority !== left.targetPriority) return right.targetPriority - left.targetPriority;
      const rightAi = right.refinement?.aiScore ?? 0;
      const leftAi = left.refinement?.aiScore ?? 0;
      if (rightAi !== leftAi) return rightAi - leftAi;
      return right.candidate.opportunityScore - left.candidate.opportunityScore;
    })
    .slice(0, 8);
  const scannerHighQualityCandidates: ScannerHighQualityCandidate[] = scannerResults
    .map((candidate) => {
      const refinement = refinementBySymbol.get(candidate.symbol);
      if (!refinement) return null;
      if (refinement.aiScore < 72) return null;
      if (refinement.recommendation === 'skip') return null;
      return { candidate, refinement };
    })
    .filter((item): item is ScannerHighQualityCandidate => Boolean(item))
    .sort((left, right) => {
      const qualityLeft = left.refinement.aiScore * 0.58 + left.candidate.opportunityScore * 0.42;
      const qualityRight = right.refinement.aiScore * 0.58 + right.candidate.opportunityScore * 0.42;
      return qualityRight - qualityLeft;
    })
    .slice(0, 8);
  const allValidations = trackingOverview?.validations || [];
  const reportBySymbol = new Map(latestTrackingReports.map((item) => [item.symbol, item]));
  const watchlistBySymbol = new Map(sortedWatchlist.map((item) => [item.symbol, item]));
  const directionHitRate = allValidations.length
    ? Math.round((allValidations.filter((item) => item.directionCorrect).length / allValidations.length) * 100)
    : 0;
  const recommendationHitRate = allValidations.length
    ? Math.round((allValidations.filter((item) => item.recommendationEffective).length / allValidations.length) * 100)
    : 0;
  const avgValidationReturn = allValidations.length
    ? allValidations.reduce((sum, item) => sum + item.actualReturnPct, 0) / allValidations.length
    : 0;
  const avgAlignmentScore = allValidations.length
    ? allValidations.reduce((sum, item) => sum + item.strategyAlignmentScore, 0) / allValidations.length
    : 0;
  const validationBuckets: Array<{ symbol: string; count: number; wins: number; avgReturn: number }> = Object.values(
    allValidations.reduce<Record<string, { symbol: string; count: number; wins: number; avgReturn: number }>>((acc, item) => {
      const current = acc[item.symbol] || { symbol: item.symbol, count: 0, wins: 0, avgReturn: 0 };
      current.count += 1;
      current.wins += item.directionCorrect ? 1 : 0;
      current.avgReturn += item.actualReturnPct;
      acc[item.symbol] = current;
      return acc;
    }, {}),
  ) as Array<{ symbol: string; count: number; wins: number; avgReturn: number }>;

  const topValidatedSymbols = validationBuckets
    .map((item) => ({
      ...item,
      hitRate: item.count ? Math.round((item.wins / item.count) * 100) : 0,
      avgReturn: item.count ? item.avgReturn / item.count : 0,
    }))
    .sort((left, right) => right.hitRate - left.hitRate || right.avgReturn - left.avgReturn)
    .slice(0, 5);

  const marketValidationStats = (Object.values(
    allValidations.reduce<Record<string, { market: string; count: number; hits: number; effective: number; avgReturn: number }>>((acc, item) => {
      const market = watchlistBySymbol.get(item.symbol)?.market || 'GLOBAL';
      const current = acc[market] || { market, count: 0, hits: 0, effective: 0, avgReturn: 0 };
      current.count += 1;
      current.hits += item.directionCorrect ? 1 : 0;
      current.effective += item.recommendationEffective ? 1 : 0;
      current.avgReturn += item.actualReturnPct;
      acc[market] = current;
      return acc;
    }, {}),
  ) as Array<{ market: string; count: number; hits: number; effective: number; avgReturn: number }>)
    .map((item) => ({
      ...item,
      hitRate: item.count ? Math.round((item.hits / item.count) * 100) : 0,
      effectiveRate: item.count ? Math.round((item.effective / item.count) * 100) : 0,
      avgReturn: item.count ? item.avgReturn / item.count : 0,
    }))
    .sort((left, right) => right.hitRate - left.hitRate || right.avgReturn - left.avgReturn)
    .slice(0, 5);

  const strategyFitStats = trackingTopPortfolios.map((portfolio) => {
    const heldSymbols = portfolio.positions.map((position) => position.symbol);
    const matchingValidations = allValidations.filter((item) => heldSymbols.includes(item.symbol));
    const matchingReports = heldSymbols
      .map((symbol) => reportBySymbol.get(symbol))
      .filter((item): item is TrackingReportRecord => Boolean(item));
    const latestEquity = portfolio.history[0]?.equity ?? portfolio.initialCash;
    const returnPct = ((latestEquity - portfolio.initialCash) / portfolio.initialCash) * 100;
    const validationHitRate = matchingValidations.length
      ? Math.round((matchingValidations.filter((item) => item.directionCorrect).length / matchingValidations.length) * 100)
      : 0;
    const avgConfidence = matchingReports.length
      ? matchingReports.reduce((sum, item) => sum + item.structured.confidence, 0) / matchingReports.length
      : 0;
    const fitScore = Math.max(
      0,
      Math.min(
        100,
        Math.round((validationHitRate * 0.45) + (avgConfidence * 0.35) + (Math.max(-20, Math.min(20, returnPct)) + 20) * 0.5),
      ),
    );

    return {
      strategyId: portfolio.strategyId,
      strategyName: portfolio.strategyName,
      heldCount: heldSymbols.length,
      validationCount: matchingValidations.length,
      validationHitRate,
      avgConfidence,
      returnPct,
      fitScore,
    };
  }).sort((left, right) => right.fitScore - left.fitScore);

  const renderScannerView = () => (
    <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {scannerError && (
        <div className="rounded-[28px] border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
          {scannerError}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Scanner Workspace</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-50">市场扫描工作台</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            规则层先全量扫市场池，再让 AI 只看前 24 名候选，最后收敛成前 8 个高质量机会。这样既保留覆盖面，也把 token 花在最值得复核的地方。
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard title="规则候选" value={`${scannerResults.length} 只`} subtitle="规则全量扫后的前排结果" icon={<Search className="h-4 w-4" />} />
            <InfoCard title="AI 复核" value={`${scannerRefinements.length} 只`} subtitle="只处理前 24 名候选" icon={<BrainCircuit className="h-4 w-4" />} />
            <InfoCard title="高质量候选" value={`${scannerHighQualityCandidates.length} 只`} subtitle="最终聚焦前 5-10 个机会" icon={<TrendingUp className="h-4 w-4" />} />
            <InfoCard title="候选池" value={`${sortedCandidatePool.length} 只`} subtitle="留给后续观察和升级" icon={<FileText className="h-4 w-4" />} />
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Workflow</p>
              <h3 className="mt-2 text-xl font-bold text-slate-50">规则全量扫 → AI 精筛</h3>
            </div>
            <RefreshCw className={`h-5 w-5 text-sky-200 ${scannerLoading || scannerRefineLoading ? 'animate-spin' : ''}`} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runScanner}
              disabled={scannerLoading}
              className="rounded-2xl border border-sky-300/20 bg-sky-100 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scannerLoading ? '规则扫描中...' : '规则全量扫描'}
            </button>
            <button
              type="button"
              onClick={runScannerRefinement}
              disabled={scannerRefineLoading || scannerResults.length === 0}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scannerRefineLoading ? 'AI 精筛中...' : `AI 精筛前 ${scannerRefineLimit} 名`}
            </button>
          </div>
          <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4 text-sm leading-6 text-slate-300">
            当前规则层返回前 40 名候选；AI 只看前 24 名，再压缩出前 8 个更值得你直接处理的标的。
            <div className="mt-2 text-xs text-slate-400">
              规则扫描不烧 token，只有“AI 精筛前 ${scannerRefineLimit} 名”会调用文本模型。
              若默认模型不可用，系统会自动切换到可用的文本模型继续精筛。
            </div>
            <div className="mt-2 text-xs text-slate-500">
              线上部署会自动限制单次扫描池规模，优先保证稳定返回结果，再做 AI 精筛。
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">规则层</div>
              <div className="mt-2 text-2xl font-black text-slate-50">{scannerResults.length}</div>
              <div className="text-xs text-slate-400">候选展示上限 {scannerRunLimit} 只</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">AI 层</div>
              <div className="mt-2 text-2xl font-black text-slate-50">{scannerRefinements.length}</div>
              <div className="text-xs text-slate-400">候选前 {scannerRefineLimit} 名进入 AI 复核</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">最终输出</div>
              <div className="mt-2 text-2xl font-black text-slate-50">{scannerHighQualityCandidates.length}</div>
              <div className="text-xs text-slate-400">高质量候选建议优先进入候选池</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          <div className="text-sm font-semibold text-slate-200">扫描模板与范围</div>
          <div className="mt-4 grid gap-3">
            {(scannerTemplates.length ? scannerTemplates : []).map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setScannerTemplateId(template.id)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  scannerTemplateId === template.id
                    ? 'border-sky-300/20 bg-sky-300/10'
                    : 'border-white/8 bg-slate-950/30 hover:bg-white/6'
                }`}
              >
                <div className="font-semibold text-slate-100">{template.name}</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">{template.description}</div>
              </button>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {scannerMarketOptions.map((market) => (
              <button
                key={market.value}
                type="button"
                onClick={() => toggleScannerMarket(market.value)}
                className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                  scannerMarkets.includes(market.value)
                    ? 'border border-sky-300/20 bg-sky-300/10 text-sky-100'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {market.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-200">高质量候选</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                这一组是规则层与 AI 层共同认可的前排机会，适合优先进入候选池或直接升级进关注池。
              </div>
            </div>
            <div className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
              输出 {scannerHighQualityCandidates.length} 只
            </div>
          </div>
          {scannerHighQualityCandidates.length > 0 ? (
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {scannerHighQualityCandidates.map(({ candidate, refinement }) => (
                <div key={`hq-${candidate.symbol}`} className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-100">{candidate.symbol}</div>
                      <div className="text-xs text-slate-500">{candidate.name} · {candidate.templateName}</div>
                    </div>
                    <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${metricTone(Math.round(refinement.aiScore * 0.58 + candidate.opportunityScore * 0.42))}`}>
                      综合 {Math.round(refinement.aiScore * 0.58 + candidate.opportunityScore * 0.42)}
                    </div>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">{refinement.summary}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                    <span className={`rounded-full border px-2.5 py-1 ${metricTone(candidate.opportunityScore)}`}>规则分 {candidate.opportunityScore}</span>
                    <span className={`rounded-full border px-2.5 py-1 ${metricTone(refinement.aiScore)}`}>AI 分 {refinement.aiScore}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">置信度 {refinement.conviction === 'high' ? '高' : refinement.conviction === 'medium' ? '中' : '低'}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addCandidatePoolItem(candidate, {
                        targetPriority: refinement.shouldPromote ? 2 : 1,
                        status: 'candidate',
                        refinement,
                      })}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      加入候选池
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await addTrackingAsset(candidate.symbol, {
                          name: candidate.name,
                          market: candidate.market,
                          assetClass: candidate.assetClass,
                        });
                        await setPriorityLevel(candidate.symbol, refinement.shouldPromote ? 2 : 1);
                      }}
                      disabled={trackingAction != null}
                      className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-50"
                    >
                      加入关注池
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-400">先运行规则全量扫描，再执行 AI 精筛。这里会显示最终前 5-10 个高质量候选。</div>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          <div className="text-sm font-semibold text-slate-200">规则候选榜单</div>
          <div className="mt-1 text-xs text-slate-500">全量规则扫描后的前排候选，适合人工再看一轮。</div>
          {scannerResults.length > 0 ? (
            <div className="mt-4 space-y-3">
              {scannerResults.slice(0, 12).map((candidate) => {
                const refinement = refinementBySymbol.get(candidate.symbol);
                return (
                  <div key={`scanner-result-${candidate.symbol}`} className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-100">{candidate.symbol}</div>
                        <div className="text-xs text-slate-500">{candidate.name} · {candidate.market}</div>
                      </div>
                      <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${metricTone(candidate.opportunityScore)}`}>
                        规则分 {candidate.opportunityScore}
                      </div>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{candidate.summary}</div>
                    {refinement && (
                      <div className="mt-3 rounded-2xl border border-sky-300/15 bg-sky-300/10 p-3 text-xs leading-5 text-slate-200">
                        AI：{refinement.summary}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-400">运行扫描后，这里会展示规则层最强的一批候选。</div>
          )}
        </div>

        <div className="space-y-8">
          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="text-sm font-semibold text-slate-200">候选池</div>
            {sortedCandidatePool.length > 0 ? (
              <div className="mt-4 space-y-3">
                {sortedCandidatePool.slice(0, 8).map((item) => (
                  <div key={`candidate-pool-view-${item.symbol}`} className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-100">{item.symbol}</div>
                        <div className="text-xs text-slate-500">{item.name} · {item.templateName}</div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-xs font-semibold text-slate-200">
                        {item.status === 'candidate' ? '待观察' : item.status === 'watching' ? '观察中' : item.status === 'upgraded' ? '已升级' : '已淘汰'}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => updateCandidatePoolStatus(item.symbol, 'watching')} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10">标为观察中</button>
                      <button type="button" onClick={() => updateCandidatePoolStatus(item.symbol, 'dismissed')} className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/15">淘汰</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-sm text-slate-400">把扫描结果里的高质量机会先放进候选池，再决定哪些值得升级进关注池。</div>
            )}
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="text-sm font-semibold text-slate-200">扫描验证摘要</div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <InfoCard title="规则胜率" value={`${scannerValidationSummary?.rulesOnly.winRate ?? 0}%`} subtitle={`样本 ${scannerValidationSummary?.rulesOnly.count ?? 0}`} icon={<Gauge className="h-4 w-4" />} />
              <InfoCard title="AI 胜率" value={`${scannerValidationSummary?.aiReviewed.winRate ?? 0}%`} subtitle={`样本 ${scannerValidationSummary?.aiReviewed.count ?? 0}`} icon={<BrainCircuit className="h-4 w-4" />} />
              <InfoCard title="升级组" value={`${scannerValidationSummary?.aiPromoted.winRate ?? 0}%`} subtitle={`样本 ${scannerValidationSummary?.aiPromoted.count ?? 0}`} icon={<TrendingUp className="h-4 w-4" />} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );

  const renderTrackingView = () => (
    <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Tracking Intelligence</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-50">关注池 + 模拟盘 + AI 验证体系</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            现在这套系统会把自选标的、5 个策略代理人、模拟盘调仓、AI 日报与后验验证放在同一条研究链路里。
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard title="关注池" value={`${watchlist.length} 只`} subtitle="跨市场统一跟踪" icon={<Search className="h-4 w-4" />} />
            <InfoCard title="策略代理人" value={`${trackingOverview?.strategies.length || 5} 个`} subtitle="完整风格矩阵" icon={<BrainCircuit className="h-4 w-4" />} />
            <InfoCard title="验证样本" value={`${trackingOverview?.validations.length || 0} 条`} subtitle="AI 与市场结果对照" icon={<Gauge className="h-4 w-4" />} />
            <InfoCard title="重点标的" value={`${priorityAssets.length} 只`} subtitle="仅这些会调用 AI 生成跟踪报告" icon={<FileText className="h-4 w-4" />} />
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Orchestration</p>
              <h3 className="mt-2 text-xl font-bold text-slate-50">自动报告与验证运行台</h3>
            </div>
            <RefreshCw className={`h-5 w-5 text-sky-200 ${trackingLoading ? 'animate-spin' : ''}`} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => runTrackingScope(scope)}
                disabled={trackingAction != null}
                className="rounded-2xl border border-sky-300/20 bg-sky-100 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {trackingAction === scope ? '运行中...' : `生成${scope === 'daily' ? '日报' : scope === 'weekly' ? '周报' : '月报'}`}
              </button>
            ))}
            <button
              type="button"
              onClick={loadTrackingOverview}
              disabled={trackingLoading}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              刷新总览
            </button>
          </div>
          <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4 text-sm leading-6 text-slate-300">
            已内置 5 个策略代理人：
            全球价值基金风格、全球成长基金风格、宏观对冲风格、幻方量化风格、ETF 轮动风格。
            <div className="mt-2 text-xs text-slate-400">
              当前只有打上“重点”标签的标的会调用 AI；其余标的只做规则分析和验证，用来控制 API key 消耗。
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">本次处理</div>
              <div className="mt-2 text-2xl font-black text-slate-50">{watchlist.length}</div>
              <div className="text-xs text-slate-400">全部关注标的都会进入规则扫描与验证</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">重点标的</div>
              <div className="mt-2 text-2xl font-black text-slate-50">{priorityAssets.length}</div>
              <div className="text-xs text-slate-400">P1 / P2 / P3 都属于重点候选</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">AI 覆盖</div>
              <div className="mt-2 text-2xl font-black text-slate-50">{plannedAiAssets.length}</div>
              <div className="text-xs text-slate-400">默认最多 {trackingAiMaxAssets} 只，按 P3 → P2 → P1 顺序处理</div>
            </div>
          </div>
          {watchlist.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-300/10 p-4 text-sm text-amber-100">
              当前关注池为空。先在右上角输入股票或加密资产并加入关注池，再生成报告。
            </div>
          ) : priorityAssets.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-sky-300/15 bg-sky-300/10 p-4 text-sm text-sky-100">
              当前没有重点标的。本次仍会生成规则日报，但不会调用 AI 深度分析。
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-slate-300">
              本次 AI 将优先处理：
              <span className="ml-2 font-semibold text-slate-100">
                {plannedAiAssets.map((item) => `${item.symbol}(P${item.priority})`).join('、')}
              </span>
            </div>
          )}
        </div>
      </section>

      {trackingError && (
        <div className="mt-6 rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
          {trackingError}
        </div>
      )}

      {trackingStatus && (
        <div className="mt-6 rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          {trackingStatus}
        </div>
      )}

      {false && (
        <>
      {scannerError && (
        <div className="mt-6 rounded-[28px] border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
          {scannerError}
        </div>
      )}

      <section className="mt-8 rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Market Scanner</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-50">规则型市场扫描器</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              先用规则模型筛出潜力候选，再决定哪些值得加入关注池或升级成重点标的。这一步不调用大模型。
            </p>
          </div>
          <button
            type="button"
            onClick={runScanner}
            disabled={scannerLoading}
            className="rounded-2xl border border-sky-300/20 bg-sky-100 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scannerLoading ? '扫描中...' : '运行扫描'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runScannerRefinement}
            disabled={scannerRefineLoading || scannerResults.length === 0}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scannerRefineLoading ? 'AI 精筛中...' : 'AI 精筛前 10 名'}
          </button>
          <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-2 text-xs leading-5 text-slate-400">
            规则扫描不烧 token；AI 精筛只会处理前 10 名候选，用于压缩进入重点池的数量。
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[26px] border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-slate-200">扫描模板</div>
            <div className="mt-4 grid gap-3">
              {(scannerTemplates.length ? scannerTemplates : []).map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setScannerTemplateId(template.id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    scannerTemplateId === template.id
                      ? 'border-sky-300/20 bg-sky-300/10'
                      : 'border-white/8 bg-slate-950/30 hover:bg-white/6'
                  }`}
                >
                  <div className="font-semibold text-slate-100">{template.name}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{template.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/8 bg-white/4 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">扫描范围</div>
              <div className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
                本次将扫描 {scannerScanned || scannerMarkets.length ? scannerMarkets.length : 0} 个市场组
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {scannerMarketOptions.map((market) => (
                <button
                  key={market.value}
                  type="button"
                  onClick={() => toggleScannerMarket(market.value)}
                  className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                    scannerMarkets.includes(market.value)
                      ? 'border border-sky-300/20 bg-sky-300/10 text-sky-100'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {market.label}
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/8 bg-slate-950/30 p-4 text-sm leading-6 text-slate-300">
              当前模板会在你选择的市场范围里批量拉取行情、计算技术指标、按规则打机会分，再输出优先候选名单。
              <div className="mt-2 text-xs text-slate-500">
                后续阶段会在这里叠加 AI 精筛和扫描验证反馈。
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {scannerResults.length > 0 ? `已扫描 ${scannerScanned} 只候选，当前展示前 ${scannerResults.length} 名` : '运行扫描后，这里会出现按机会分排序的候选榜单。'}
          </div>
        </div>
        <div className="mt-4 rounded-[26px] border border-white/8 bg-white/4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-200">自动升级建议</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                这里会根据规则分、AI 分、置信度和是否推荐升级，自动给出建议的关注池优先级。先给建议，不做静默变更。
              </div>
            </div>
            <div className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
              建议 {scannerUpgradeRecommendations.length} 只
            </div>
          </div>
          {scannerUpgradeRecommendations.length > 0 ? (
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {scannerUpgradeRecommendations.map((item) => (
                <div key={`upgrade-${item.symbol}`} className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-100">{item.symbol}</div>
                      <div className="text-xs text-slate-500">{item.name}</div>
                    </div>
                    <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      item.targetPriority === 3
                        ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                        : item.targetPriority === 2
                        ? 'border-sky-300/20 bg-sky-300/10 text-sky-100'
                        : 'border-white/10 bg-white/8 text-slate-200'
                    }`}>
                      建议升为 P{item.targetPriority}
                    </div>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">{item.reason}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                    <span className={`rounded-full border px-2.5 py-1 ${metricTone(item.candidate.opportunityScore)}`}>
                      规则分 {item.candidate.opportunityScore}
                    </span>
                    {item.refinement && (
                      <span className={`rounded-full border px-2.5 py-1 ${metricTone(item.refinement.aiScore)}`}>
                        AI 分 {item.refinement.aiScore}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await addTrackingAsset(item.symbol, {
                          name: item.name,
                          market: item.candidate.market,
                          assetClass: item.candidate.assetClass,
                        });
                        await setPriorityLevel(item.symbol, item.targetPriority);
                      }}
                      disabled={trackingAction != null}
                      className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-50"
                    >
                      加入并设为 P{item.targetPriority}
                    </button>
                    <button
                      type="button"
                      onClick={() => addTrackingAsset(item.symbol, {
                        name: item.name,
                        market: item.candidate.market,
                        assetClass: item.candidate.assetClass,
                      })}
                      disabled={trackingAction != null}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      先加入关注池
                    </button>
                    <button
                      type="button"
                      onClick={() => addCandidatePoolItem(item.candidate, {
                        targetPriority: item.targetPriority,
                        status: 'candidate',
                        note: item.reason,
                        refinement: item.refinement,
                      })}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      加入候选池
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-400">
              跑完规则扫描后会先给出基础建议；跑完 AI 精筛后，会把更高质量的候选自动提升到 P2 / P3 建议层。
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {scannerResults.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-white/10 bg-white/4 p-5 text-sm text-slate-400 xl:col-span-2">
              推荐先用“趋势延续扫描”或“突破扫描”试一轮，看看当前市场里哪些标的最值得进入候选池。
            </div>
          ) : scannerResults.map((candidate) => {
            const refinement = refinementBySymbol.get(candidate.symbol);
            return (
            <div key={`${candidate.templateId}-${candidate.symbol}`} className="rounded-[26px] border border-white/8 bg-white/4 p-4">
              {refinement && (
                <div className="mb-4 rounded-2xl border border-sky-300/15 bg-sky-300/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-sky-100">AI 精筛复核</div>
                    <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${metricTone(refinement.aiScore)}`}>
                      AI 分 {refinement.aiScore}
                    </div>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-200">{refinement.summary}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
                      {refinement.recommendation === 'focus' ? '建议重点跟踪' : refinement.recommendation === 'watch' ? '建议观察' : '建议跳过'}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
                      置信度 {refinement.conviction === 'high' ? '高' : refinement.conviction === 'medium' ? '中' : '低'}
                    </span>
                    {refinement.shouldPromote && (
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                        推荐升级为重点候选
                      </span>
                    )}
                  </div>
                  {refinement.risks.length > 0 && (
                    <div className="mt-3 space-y-1 text-xs leading-5 text-slate-300">
                      {refinement.risks.map((risk, index) => (
                        <div key={`${candidate.symbol}-risk-${index}`}>• {risk}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-100">{candidate.symbol}</div>
                  <div className="text-sm text-slate-400">{candidate.name} · {candidate.market} · {candidate.templateName}</div>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${metricTone(candidate.opportunityScore)}`}>
                  机会分 {candidate.opportunityScore}
                </div>
              </div>
              <div className="mt-3 text-sm leading-6 text-slate-300">{candidate.summary}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                  风险 {candidate.riskScore}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                  信号 {candidate.metrics.signalScore}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                  RSI {candidate.metrics.rsi14 ?? 'N/A'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                  量比 {candidate.metrics.relativeVolume ?? 'N/A'}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-xs leading-5 text-slate-500">
                {candidate.reasons.map((reason, index) => (
                  <div key={`${candidate.symbol}-reason-${index}`}>• {reason}</div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addTrackingAsset(candidate.symbol, {
                    name: candidate.name,
                    market: candidate.market,
                    assetClass: candidate.assetClass,
                  })}
                  disabled={trackingAction === 'add'}
                  className="rounded-2xl border border-sky-300/20 bg-sky-100 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-white disabled:opacity-50"
                >
                  加入关注池
                </button>
                <button
                  type="button"
                  onClick={() => addCandidatePoolItem(candidate, {
                    targetPriority: 0,
                    status: 'candidate',
                    refinement,
                  })}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  加入候选池
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await addTrackingAsset(candidate.symbol, {
                      name: candidate.name,
                      market: candidate.market,
                      assetClass: candidate.assetClass,
                    });
                    await setPriorityLevel(candidate.symbol, 1);
                  }}
                  disabled={trackingAction != null}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                >
                  加入并设为 P1
                </button>
                {refinementBySymbol.get(candidate.symbol)?.shouldPromote && (
                  <button
                    type="button"
                    onClick={async () => {
                      await addTrackingAsset(candidate.symbol, {
                        name: candidate.name,
                        market: candidate.market,
                        assetClass: candidate.assetClass,
                      });
                      await setPriorityLevel(candidate.symbol, 2);
                    }}
                    disabled={trackingAction != null}
                    className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-50"
                  >
                    加入并设为 P2
                  </button>
                )}
              </div>
            </div>
          );
          })}
        </div>
      </section>
        </>
      )}

      <section className="mt-8 rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Candidate Pool</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-50">候选池</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              候选池承接扫描器筛出来的机会票。它比关注池更轻，适合先观察、分层、淘汰，再把最值得做的标的升级进正式跟踪体系。
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
            候选 {sortedCandidatePool.length} 只
          </div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[26px] border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-slate-200">候选池状态</div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <InfoCard title="待观察" value={`${candidatePool.filter((item) => item.status === 'candidate').length}`} subtitle="新进入候选池" icon={<Search className="h-4 w-4" />} />
              <InfoCard title="观察中" value={`${candidatePool.filter((item) => item.status === 'watching').length}`} subtitle="等待更多确认" icon={<Waves className="h-4 w-4" />} />
              <InfoCard title="已升级" value={`${candidatePool.filter((item) => item.status === 'upgraded').length}`} subtitle="已进入关注池" icon={<TrendingUp className="h-4 w-4" />} />
              <InfoCard title="已淘汰" value={`${candidatePool.filter((item) => item.status === 'dismissed').length}`} subtitle="不再跟踪" icon={<ShieldAlert className="h-4 w-4" />} />
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/30 p-4 text-sm leading-6 text-slate-300">
              生成日报、周报、月报时，系统会把最近扫描和候选池摘要自动写进报告，帮助你先看“今天值得处理的新机会”。
            </div>
          </div>
          <div className="rounded-[26px] border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-slate-200">候选池列表</div>
            {sortedCandidatePool.length > 0 ? (
              <div className="mt-4 space-y-3">
                {sortedCandidatePool.slice(0, 8).map((item) => (
                  <div key={`candidate-pool-${item.symbol}`} className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-100">{item.symbol}</div>
                        <div className="text-xs text-slate-500">{item.name} · {item.templateName}</div>
                      </div>
                      <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        item.status === 'upgraded'
                          ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                          : item.status === 'watching'
                          ? 'border-sky-300/20 bg-sky-300/10 text-sky-100'
                          : item.status === 'dismissed'
                          ? 'border-rose-300/20 bg-rose-300/10 text-rose-200'
                          : 'border-white/10 bg-white/8 text-slate-200'
                      }`}>
                        {item.status === 'candidate' ? '待观察' : item.status === 'watching' ? '观察中' : item.status === 'upgraded' ? '已升级' : '已淘汰'}
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-slate-300">{item.summary}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className={`rounded-full border px-2.5 py-1 ${metricTone(item.opportunityScore)}`}>规则分 {item.opportunityScore}</span>
                      {item.aiScore != null && <span className={`rounded-full border px-2.5 py-1 ${metricTone(item.aiScore)}`}>AI 分 {item.aiScore}</span>}
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">建议 P{item.targetPriority || 1}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => updateCandidatePoolStatus(item.symbol, 'watching')} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10">标为观察中</button>
                      <button
                        type="button"
                        onClick={async () => {
                          await addTrackingAsset(item.symbol, {
                            name: item.name,
                            market: item.market,
                            assetClass: item.assetClass,
                          });
                          await setPriorityLevel(item.symbol, item.targetPriority || 1);
                          updateCandidatePoolStatus(item.symbol, 'upgraded', item.targetPriority || 1);
                        }}
                        disabled={trackingAction != null}
                        className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-50"
                      >
                        升级进关注池
                      </button>
                      <button type="button" onClick={() => updateCandidatePoolStatus(item.symbol, 'dismissed')} className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/15">淘汰</button>
                      <button type="button" onClick={() => removeCandidatePoolItem(item.symbol)} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10">移除</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-sm text-slate-400">先从扫描器里把值得继续看一眼的标的放进候选池，再决定哪些要升级成正式关注标的。</div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Scanner Feedback</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-50">扫描验证与反馈</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              这里会比较规则扫描、AI 复核以及 AI 推荐升级标的的后验表现，帮助我们知道哪套方法真正有效。
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
            快照 {scannerSnapshots.length} 份
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <InfoCard
            title="规则筛选胜率"
            value={`${scannerValidationSummary?.rulesOnly.winRate ?? 0}%`}
            subtitle={`样本 ${scannerValidationSummary?.rulesOnly.count ?? 0} · 平均收益 ${formatNumber(scannerValidationSummary?.rulesOnly.avgReturn ?? 0)}%`}
            icon={<Gauge className="h-4 w-4" />}
          />
          <InfoCard
            title="AI 复核胜率"
            value={`${scannerValidationSummary?.aiReviewed.winRate ?? 0}%`}
            subtitle={`样本 ${scannerValidationSummary?.aiReviewed.count ?? 0} · 平均收益 ${formatNumber(scannerValidationSummary?.aiReviewed.avgReturn ?? 0)}%`}
            icon={<BrainCircuit className="h-4 w-4" />}
          />
          <InfoCard
            title="AI 推荐升级"
            value={`${scannerValidationSummary?.aiPromoted.winRate ?? 0}%`}
            subtitle={`样本 ${scannerValidationSummary?.aiPromoted.count ?? 0} · 风险收益比 ${formatNumber(scannerValidationSummary?.aiPromoted.riskReward ?? 0)}`}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[26px] border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-slate-200">时间窗口验证</div>
            <div className="mt-4 space-y-3">
              {scannerHorizonSummaries.length > 0 ? scannerHorizonSummaries.map(([label, summary]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-100">{label} 窗口</div>
                    <div className="text-xs text-slate-500">
                      规则 {summary.rulesOnly.count} / AI {summary.aiReviewed.count} / 升级 {summary.aiPromoted.count}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/6 bg-white/5 p-3">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">规则</div>
                      <div className="mt-2 text-xl font-black text-slate-50">{summary.rulesOnly.winRate}%</div>
                      <div className="mt-1 text-xs text-slate-400">均收 {formatNumber(summary.rulesOnly.avgReturn)}% · RR {formatNumber(summary.rulesOnly.riskReward)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/5 p-3">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">AI复核</div>
                      <div className="mt-2 text-xl font-black text-slate-50">{summary.aiReviewed.winRate}%</div>
                      <div className="mt-1 text-xs text-slate-400">均收 {formatNumber(summary.aiReviewed.avgReturn)}% · RR {formatNumber(summary.aiReviewed.riskReward)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/5 p-3">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">AI升级</div>
                      <div className="mt-2 text-xl font-black text-slate-50">{summary.aiPromoted.winRate}%</div>
                      <div className="mt-1 text-xs text-slate-400">均收 {formatNumber(summary.aiPromoted.avgReturn)}% · RR {formatNumber(summary.aiPromoted.riskReward)}</div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-sm text-slate-400">扫描样本积累后，这里会拆开展示 1日 / 5日 / 20日命中率与风险收益比。</div>
              )}
            </div>
          </div>
          <div className="rounded-[26px] border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-slate-200">模板效果对比</div>
            <div className="mt-4 space-y-3">
              {scannerTemplateSummaries.length > 0 ? scannerTemplateSummaries.map((template) => (
                <div key={template.templateId} className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-100">{template.templateName}</div>
                      <div className="text-xs text-slate-500">样本 {template.count}</div>
                    </div>
                    <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${metricTone(template.aiPromoted.winRate || template.aiReviewed.winRate || template.rulesOnly.winRate)}`}>
                      规则 {template.rulesOnly.winRate}% / AI {template.aiReviewed.winRate}%
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-3 text-xs text-slate-400">
                    <div>规则均收 {formatNumber(template.rulesOnly.avgReturn)}%</div>
                    <div>AI复核均收 {formatNumber(template.aiReviewed.avgReturn)}%</div>
                    <div>升级组均收 {formatNumber(template.aiPromoted.avgReturn)}%</div>
                  </div>
                </div>
              )) : (
                <div className="text-sm text-slate-400">不同扫描模板跑起来后，这里会比较突破、放量、超跌修复、趋势延续和 ETF 轮动的真实效果。</div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
          <div className="rounded-[26px] border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-slate-200">最近一次扫描快照</div>
            {latestScannerSnapshot ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/8 bg-slate-950/30 p-4 text-sm leading-6 text-slate-300">
                  模板：<span className="font-semibold text-slate-100">{latestScannerSnapshot.templateName}</span>
                  <br />
                  时间：<span className="font-semibold text-slate-100">{new Date(latestScannerSnapshot.scannedAt).toLocaleString('zh-CN')}</span>
                  <br />
                  市场：<span className="font-semibold text-slate-100">{latestScannerSnapshot.markets.join(' / ')}</span>
                  <br />
                  扫描数量：<span className="font-semibold text-slate-100">{latestScannerSnapshot.scanned}</span>
                </div>
                <div className="space-y-3">
                  {latestScannerSnapshot.candidates.slice(0, 5).map((candidate) => (
                    <div key={`${latestScannerSnapshot.id}-${candidate.symbol}`} className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-100">{candidate.symbol}</div>
                        <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${metricTone(candidate.opportunityScore)}`}>
                          规则分 {candidate.opportunityScore}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">{candidate.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-slate-400">运行过扫描后，这里会显示最近一次扫描快照。</div>
            )}
          </div>
          <div className="rounded-[26px] border border-white/8 bg-white/4 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">后验表现</div>
              <div className="text-xs text-slate-500">{scannerValidationLoading ? '验证中...' : '自动更新'}</div>
            </div>
            {latestValidatedSnapshot ? (
              <div className="mt-4 space-y-3">
                {latestValidatedSnapshot.validations.slice(0, 6).map((item) => (
                  <div key={`${latestValidatedSnapshot.id}-${item.symbol}`} className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-100">{item.symbol}</div>
                        <div className="text-xs text-slate-500">已跟踪 {formatNumber(item.elapsedDays, 1)} 天</div>
                      </div>
                      <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${metricTone(item.currentReturnPct > 0 ? 78 : 36)}`}>
                        {formatNumber(item.currentReturnPct)}%
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <div>最大回撤 {formatNumber(item.maxDrawdownPct)}%</div>
                      <div>1日 {item.day1Qualified ? '已达标' : '未达标'}</div>
                      <div>5日 {item.day5Qualified ? '已达标' : '未达标'}</div>
                      <div>20日 {item.day20Qualified ? '已达标' : '未达标'}</div>
                      <div>1日收益 {item.day1ReturnPct == null ? '待观察' : `${formatNumber(item.day1ReturnPct)}%`}</div>
                      <div>5日收益 {item.day5ReturnPct == null ? '待观察' : `${formatNumber(item.day5ReturnPct)}%`}</div>
                      <div>20日收益 {item.day20ReturnPct == null ? '待观察' : `${formatNumber(item.day20ReturnPct)}%`}</div>
                    </div>
                    {item.refinement && (
                      <div className="mt-3 rounded-2xl border border-sky-300/15 bg-sky-300/10 p-3 text-xs leading-5 text-slate-200">
                        AI 精筛：{item.refinement.summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-sm text-slate-400">运行过扫描并积累一段时间后，这里会开始显示真实收益、回撤和阶段命中率。</div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Validation Panel</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-50">AI 结论验证面板</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              把 AI 判断和后续市场表现、策略适配结果直接对照，判断它在哪些资产和哪些环境里更可靠。
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
            样本数 {allValidations.length}
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard title="方向命中率" value={`${directionHitRate}%`} subtitle="AI 多空判断后验准确度" icon={<Gauge className="h-4 w-4" />} />
          <InfoCard title="建议有效率" value={`${recommendationHitRate}%`} subtitle="买入/减仓建议可执行性" icon={<BrainCircuit className="h-4 w-4" />} />
          <InfoCard title="平均验证收益" value={`${formatNumber(avgValidationReturn)}%`} subtitle="报告发出后的平均表现" icon={<TrendingUp className="h-4 w-4" />} />
          <InfoCard title="平均策略适配度" value={`${formatNumber(avgAlignmentScore)}`} subtitle="AI 与代理人动作一致性" icon={<ShieldAlert className="h-4 w-4" />} />
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[26px] border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-slate-200">高质量验证标的</div>
            <div className="mt-4 space-y-3">
              {topValidatedSymbols.length === 0 ? (
                <div className="text-sm text-slate-400">跑过几轮日报后，这里会自动出现命中率最高的标的。</div>
              ) : topValidatedSymbols.map((item) => (
                <div key={item.symbol} className="flex items-center justify-between rounded-2xl border border-white/8 bg-slate-950/30 px-3 py-3">
                  <div>
                    <div className="font-semibold text-slate-100">{item.symbol}</div>
                    <div className="text-xs text-slate-500">样本 {item.count} · 平均收益 {formatNumber(item.avgReturn)}%</div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-300">{item.hitRate}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[26px] border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-slate-200">验证解读</div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <div className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                当前方向命中率为 <span className="font-semibold text-slate-100">{directionHitRate}%</span>，建议有效率为 <span className="font-semibold text-slate-100">{recommendationHitRate}%</span>。
              </div>
              <div className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                如果方向命中率高但建议有效率低，说明 AI 方向判断还不错，但执行建议需要继续按策略风格校准。
              </div>
              <div className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                如果平均适配度持续走高，说明 5 个代理人和 AI 结论开始形成更稳定的协同关系，这时周报和月报的参考价值会更高。
              </div>
              {marketValidationStats[0] && (
                <div className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                  当前命中率最稳定的市场是 <span className="font-semibold text-slate-100">{marketValidationStats[0].market}</span>，
                  方向命中率 <span className="font-semibold text-slate-100">{marketValidationStats[0].hitRate}%</span>，
                  平均验证收益 <span className="font-semibold text-slate-100">{formatNumber(marketValidationStats[0].avgReturn)}%</span>。
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[26px] border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-slate-200">分市场命中率</div>
            <div className="mt-4 space-y-3">
              {marketValidationStats.length === 0 ? (
                <div className="text-sm text-slate-400">样本还不够，跑几轮日报后这里会自动拆出 A 股、美股、港股、加密的命中率差异。</div>
              ) : marketValidationStats.map((item) => (
                <div key={item.market} className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-100">{item.market}</div>
                    <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${metricTone(item.hitRate)}`}>
                      命中率 {item.hitRate}%
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    样本 {item.count} · 建议有效率 {item.effectiveRate}% · 平均收益 {formatNumber(item.avgReturn)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[26px] border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-slate-200">分策略风格适配度</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {strategyFitStats.map((item) => (
                <div key={item.strategyId} className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-100">{item.strategyName}</div>
                      <div className="mt-1 text-xs text-slate-500">持仓 {item.heldCount} · 验证样本 {item.validationCount}</div>
                    </div>
                    <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${metricTone(item.fitScore)}`}>
                      适配度 {item.fitScore}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>当前组合收益</span>
                      <span>{formatNumber(item.returnPct)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>持仓命中率</span>
                      <span>{item.validationHitRate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>平均置信度</span>
                      <span>{formatNumber(item.avgConfidence)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8">
          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-50">关注池</h3>
                <p className="text-sm text-slate-400">在顶部输入中文名、代码或币种后点击按钮，即可加入跟踪体系。</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
                {watchlist.length} Assets
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {sortedWatchlist.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/4 p-5 text-sm text-slate-400">
                  先把重点标的加入关注池，例如：比特币、特斯拉、吉林化纤、贵州茅台。
                </div>
              ) : sortedWatchlist.map((asset) => {
                const report = latestTrackingReports.find((item) => item.symbol === asset.symbol);
                return (
                  <div key={asset.symbol} className="flex flex-col gap-3 rounded-[26px] border border-white/8 bg-white/4 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-bold text-slate-100">{asset.symbol}</div>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${asset.priority > 0 ? metricTone(45 + asset.priority * 15) : 'border border-white/10 bg-white/5 text-slate-500'}`}>
                          {asset.priority > 0 ? `AI 优先级 P${asset.priority}` : '规则跟踪'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">{asset.name} · {asset.market} · {asset.assetClass}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {asset.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              tag === '重点'
                                ? 'border border-amber-300/25 bg-amber-300/10 text-amber-200'
                                : 'border border-white/10 bg-white/5 text-slate-400'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                        {asset.tags.length === 0 && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                            普通跟踪
                          </span>
                        )}
                      </div>
                      {report && (
                        <div className="mt-2 text-xs text-slate-500">
                          {report.structured.direction} / {report.structured.action} / 置信度 {report.structured.confidence}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        {[3, 2, 1, 0].map((priority) => (
                          <button
                            key={priority}
                            type="button"
                            onClick={() => setPriorityLevel(asset.symbol, priority)}
                            disabled={trackingAction === `priority-${asset.symbol}-${priority}`}
                            className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                              asset.priority === priority
                                ? priority === 0
                                  ? 'border border-white/10 bg-white/10 text-slate-100'
                                  : metricTone(45 + priority * 15)
                                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                            } disabled:opacity-50`}
                          >
                            {trackingAction === `priority-${asset.symbol}-${priority}`
                              ? '处理中...'
                              : priority === 0
                                ? '普通'
                                : `P${priority}`}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTracking(asset.symbol)}
                        disabled={trackingAction === asset.symbol}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                      >
                        {trackingAction === asset.symbol ? '处理中...' : '移除'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <h3 className="text-lg font-bold text-slate-50">策略代理人模拟盘</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {trackingTopPortfolios.map((portfolio) => {
                const latest = portfolio.history[0];
                return (
                  <div key={portfolio.strategyId} className="rounded-[26px] border border-white/8 bg-white/4 p-4">
                    <div className="text-sm text-slate-500">{portfolio.strategyName}</div>
                    <div className="mt-2 text-2xl font-black text-slate-50">{formatCompact(latest?.equity ?? portfolio.initialCash)}</div>
                    <div className="mt-2 text-sm text-slate-400">现金 {formatCompact(latest?.cash ?? portfolio.cash)} · 持仓 {portfolio.positions.length} 只</div>
                    <div className="mt-3 space-y-2">
                      {portfolio.positions.slice(0, 3).map((position) => (
                        <div key={position.symbol} className="flex items-center justify-between text-sm text-slate-300">
                          <span>{position.symbol}</span>
                          <span>{formatNumber(position.weight)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <h3 className="text-lg font-bold text-slate-50">最近验证结果</h3>
            <div className="mt-5 space-y-3">
              {latestTrackingValidations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/4 p-5 text-sm text-slate-400">
                  运行一次日报后，这里会开始积累 AI 结论与市场表现的验证结果。
                </div>
              ) : latestTrackingValidations.map((item, index) => (
                <div key={`${item.symbol}-${index}`} className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-100">{item.symbol}</div>
                    <div className={`text-sm font-semibold ${item.directionCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {item.directionCorrect ? '方向命中' : '方向失效'}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    收益 {formatNumber(item.actualReturnPct)}% · 建议{item.recommendationEffective ? '有效' : '失效'} · 适配度 {formatNumber(item.strategyAlignmentScore)}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{item.notes}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <h3 className="text-lg font-bold text-slate-50">报告中心</h3>
            <div className="mt-5 space-y-3">
              {latestGeneratedReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/4 p-5 text-sm text-slate-400">
                  运行日报、周报或月报后，这里会自动归档报告。
                </div>
              ) : latestGeneratedReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between rounded-[24px] border border-white/8 bg-white/4 p-4">
                  <div>
                    <div className="font-semibold text-slate-100">{report.title}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(report.generatedAt).toLocaleString('zh-CN')} · {report.trigger === 'cron' ? '自动生成' : '手动生成'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadTrackingReport(report)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    下载报告
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );

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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveView('analyzer')}
              className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${activeView === 'analyzer' ? 'border border-sky-300/20 bg-sky-100 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
            >
              实时分析
            </button>
            <button
              type="button"
              onClick={() => setActiveView('tracking')}
              className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${activeView === 'tracking' ? 'border border-sky-300/20 bg-sky-100 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
            >
              跟踪系统
            </button>
            <button
              type="button"
              onClick={() => setActiveView('scanner')}
              className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${activeView === 'scanner' ? 'border border-sky-300/20 bg-sky-100 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
            >
              市场扫描
            </button>
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
                disabled={loading || trackingAction != null}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[18px] border border-sky-300/20 bg-sky-100 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading || trackingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : activeView === 'tracking' ? '加入关注池' : activeView === 'scanner' ? '加入候选池' : '加载行情'}
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
      {activeView === 'tracking' ? renderTrackingView() : activeView === 'scanner' ? renderScannerView() : <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
                value={analysisSource === 'third-party' ? '深度推理模型' : analysisSource === 'openai' ? 'OpenAI 专业推理' : analysisSource === 'rules' ? '规则引擎' : '待生成'}
                subtitle="固定走服务端安全配置"
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
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-sky-200" />
                    <h3 className="text-lg font-bold text-slate-50">AI 专业报告</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={downloadPdfReport}
                      disabled={!analysis}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download className="h-4 w-4" />
                      保存 PDF
                    </button>
                    <button
                      type="button"
                      onClick={downloadMarkdownReport}
                      disabled={!analysis}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FileText className="h-4 w-4" />
                      Markdown
                    </button>
                    <button
                      type="button"
                      onClick={downloadHtmlReport}
                      disabled={!analysis}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FileText className="h-4 w-4" />
                      HTML 报告
                    </button>
                  </div>
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
      </main>}

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