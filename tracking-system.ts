import fs from 'fs';
import path from 'path';
import type { AnalysisPacket, IndicatorSnapshot } from './src/lib/market-analysis.js';

/**
 * Storage backend abstraction.
 * - Vercel KV (Redis): when KV_REST_API_URL + KV_REST_API_TOKEN are set (Vercel 部署)
 * - Local filesystem: fallback for本地开发
 *
 * Vercel KV setup: https://vercel.com/docs/storage/vercel-kv
 * 在 Vercel Dashboard → Storage → Create → KV，连接到项目后环境变量自动注入。
 */

const KV_KEY = 'market-analyzer:tracking-state';

// ---- Vercel KV client (lightweight, no SDK dependency) ----

const kvConfig = {
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
};
const useKV = Boolean(kvConfig.url && kvConfig.token);

const kvGet = async (key: string): Promise<string | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${kvConfig.url}/get/${key}`, {
      headers: { Authorization: `Bearer ${kvConfig.token}` },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.result ?? null;
  } finally {
    clearTimeout(timer);
  }
};

const kvSet = async (key: string, value: string): Promise<void> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(`${kvConfig.url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kvConfig.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', key, value]),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

// ---- Local filesystem fallback ----

const resolveDataDir = () => {
  const configuredDir = process.env.TRACKING_DATA_DIR?.trim();
  if (configuredDir) return configuredDir;
  const cwd = process.cwd();
  const vercelRuntime = process.env.VERCEL === '1' || cwd.startsWith('/var/task');
  if (vercelRuntime) return path.join('/tmp', 'market-analyzer-tracking');
  return path.join(cwd, 'data');
};

const dataDir = resolveDataDir();
const dataFile = path.join(dataDir, 'tracking-system.json');

const ensureLocalStore = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const readLocalState = (): TrackingState => {
  ensureLocalStore();
  if (!fs.existsSync(dataFile)) return createEmptyState();
  const raw = fs.readFileSync(dataFile, 'utf8');
  return normalizeTrackingState(JSON.parse(raw));
};

const writeLocalState = (state: TrackingState) => {
  ensureLocalStore();
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2), 'utf8');
};

// ---- Unified async read/write ----

const readState = async (): Promise<TrackingState> => {
  if (useKV) {
    try {
      const raw = await kvGet(KV_KEY);
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return normalizeTrackingState(parsed);
      }
    } catch (err) {
      console.warn('KV read failed, falling back to local:', err instanceof Error ? err.message : err);
    }
  }
  return readLocalState();
};

const writeState = async (state: TrackingState): Promise<void> => {
  const json = JSON.stringify(state);
  if (useKV) {
    try {
      await kvSet(KV_KEY, json);
    } catch (err) {
      console.warn('KV write failed, falling back to local:', err instanceof Error ? err.message : err);
      writeLocalState(state);
    }
  } else {
    writeLocalState(state);
  }
};

if (useKV) {
  console.log('💾 Storage: Vercel KV (persistent across deployments)');
} else {
  console.log('💾 Storage: Local filesystem (data lost on Vercel cold start)');
}

export type StrategyId =
  | 'global-value'
  | 'global-growth'
  | 'macro-hedge'
  | 'highflyer-quant'
  | 'etf-rotation';

export type ReportScope = 'daily' | 'weekly' | 'monthly';

export type TrackingAsset = {
  symbol: string;
  name: string;
  market: string;
  assetClass: 'equity' | 'etf' | 'crypto' | 'other';
  tags: string[];
  priority: number;
  notes: string;
  addedAt: string;
};

export type StrategyProfile = {
  id: StrategyId;
  name: string;
  description: string;
  objective: string;
};

export type StrategyPosition = {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  marketPrice: number;
  marketValue: number;
  weight: number;
  unrealizedPnl: number;
};

export type StrategyTrade = {
  id: string;
  executedAt: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  amount: number;
  reason: string;
};

export type PortfolioSnapshot = {
  date: string;
  equity: number;
  cash: number;
};

export type StrategyPortfolio = {
  strategyId: StrategyId;
  strategyName: string;
  initialCash: number;
  cash: number;
  positions: StrategyPosition[];
  trades: StrategyTrade[];
  history: PortfolioSnapshot[];
  lastRebalancedAt: string | null;
};

export type StructuredView = {
  direction: 'bullish' | 'neutral' | 'bearish';
  confidence: number;
  action: 'buy' | 'hold' | 'reduce' | 'avoid';
  horizon: 'short' | 'swing' | 'mid';
  support: number | null;
  resistance: number | null;
  targetPrice: number | null;
  stopLoss: number | null;
  summary: string;
};

export type TrackingReportRecord = {
  symbol: string;
  reportDate: string;
  quote: {
    symbol: string;
    shortName?: string;
    longName?: string;
    currency?: string;
    regularMarketPrice?: number;
    regularMarketChangePercent?: number;
    trailingPE?: number;
    exchange?: string;
  };
  indicators: IndicatorSnapshot;
  analysis: string;
  structured: StructuredView;
};

export type ValidationRecord = {
  symbol: string;
  reportDate: string;
  validatedAt: string;
  actualReturnPct: number;
  directionCorrect: boolean;
  recommendationEffective: boolean;
  strategyAlignmentScore: number;
  notes: string;
};

export type GeneratedReport = {
  id: string;
  scope: ReportScope;
  generatedAt: string;
  title: string;
  markdown: string;
  trigger?: 'manual' | 'cron';
};

export type TrackingOverview = {
  watchlist: TrackingAsset[];
  strategies: StrategyProfile[];
  portfolios: StrategyPortfolio[];
  latestReports: TrackingReportRecord[];
  validations: ValidationRecord[];
  generatedReports: GeneratedReport[];
};

type TrackingState = TrackingOverview;

type RunTrackingCycleOptions = {
  scope: ReportScope;
  trigger?: 'manual' | 'cron';
  mode?: 'fast' | 'full';
  initialState?: TrackingOverview;
  persist?: boolean;
  fetchAsset: (symbol: string) => Promise<{
    quote: TrackingReportRecord['quote'];
    packet: AnalysisPacket;
  }>;
  generateAnalysis: (symbol: string, bundle: { quote: TrackingReportRecord['quote']; packet: AnalysisPacket }) => Promise<string>;
};

const resolveDataDir = () => {
  const configuredDir = process.env.TRACKING_DATA_DIR?.trim();
  if (configuredDir) return configuredDir;

  const cwd = process.cwd();
  const vercelRuntime = process.env.VERCEL === '1' || cwd.startsWith('/var/task');
  if (vercelRuntime) return path.join('/tmp', 'market-analyzer-tracking');

  return path.join(cwd, 'data');
};

const dataDir = resolveDataDir();
const dataFile = path.join(dataDir, 'tracking-system.json');

const strategyProfiles: StrategyProfile[] = [
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
    objective: '在相对强势资产和低波动资产间做周期轮换。',
  },
];

const round = (value: number, digits = 4) => Number(value.toFixed(digits));

const createEmptyState = (): TrackingState => ({
  watchlist: [],
  strategies: strategyProfiles,
  portfolios: strategyProfiles.map((strategy) => ({
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

export const normalizeTrackingState = (state?: Partial<TrackingOverview> | null): TrackingState => {
  const base = createEmptyState();
  if (!state) return base;

  return {
    watchlist: (state.watchlist || []).map((item) => {
      const priority = Math.max(0, Math.min(3, Number(item.priority || 0)));
      const tags = Array.isArray(item.tags) ? [...item.tags] : [];
      const normalizedTags =
        priority > 0
          ? Array.from(new Set([...tags, '重点']))
          : tags.filter((tag) => tag !== '重点');

      return {
        symbol: String(item.symbol || '').toUpperCase(),
        name: item.name || String(item.symbol || '').toUpperCase(),
        market: item.market || inferMarket(String(item.symbol || '').toUpperCase()),
        assetClass: item.assetClass || inferAssetClass(String(item.symbol || '').toUpperCase()),
        tags: normalizedTags,
        priority,
        notes: item.notes || '',
        addedAt: item.addedAt || new Date().toISOString(),
      };
    }),
    strategies: strategyProfiles,
    portfolios: state.portfolios?.length ? state.portfolios : base.portfolios,
    latestReports: state.latestReports || [],
    validations: state.validations || [],
    generatedReports: state.generatedReports || [],
  };
};

const ensureStore = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    const initial = createEmptyState();
    fs.writeFileSync(dataFile, JSON.stringify(initial, null, 2), 'utf8');
  }
};

const readState = (): TrackingState => {
  ensureStore();
  const raw = fs.readFileSync(dataFile, 'utf8');
  const parsed = JSON.parse(raw) as TrackingState;
  return normalizeTrackingState(parsed);
};

const writeState = (state: TrackingState) => {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2), 'utf8');
};

const inferAssetClass = (symbol: string): TrackingAsset['assetClass'] => {
  if (symbol.endsWith('-USD')) return 'crypto';
  if (/ETF|SPY|QQQ|IWM|TLT|GLD|DIA/i.test(symbol)) return 'etf';
  if (/\.HK|\.SS|\.SZ|^[A-Z]+$/.test(symbol)) return 'equity';
  return 'other';
};

const inferMarket = (symbol: string) => {
  if (symbol.endsWith('.SS')) return 'SSE';
  if (symbol.endsWith('.SZ')) return 'SZSE';
  if (symbol.endsWith('.HK')) return 'HKEX';
  if (symbol.endsWith('-USD')) return 'CRYPTO';
  return 'GLOBAL';
};

export const listTrackingOverview = async () => readState();

export const addWatchlistAsset = async (input: {
  symbol: string;
  name?: string;
  tags?: string[];
  notes?: string;
}) => {
  const state = await readState();
  const symbol = input.symbol.trim().toUpperCase();
  const existing = state.watchlist.find((item) => item.symbol === symbol);
  if (existing) return state;

  state.watchlist.unshift({
    symbol,
    name: input.name?.trim() || symbol,
    market: inferMarket(symbol),
    assetClass: inferAssetClass(symbol),
    tags: input.tags || [],
    priority: 0,
    notes: input.notes || '',
    addedAt: new Date().toISOString(),
  });
  await writeState(state);
  return state;
};

export const removeWatchlistAsset = async (symbol: string) => {
  const state = await readState();
  state.watchlist = state.watchlist.filter((item) => item.symbol !== symbol.toUpperCase());
  await writeState(state);
  return state;
};

export const toggleWatchlistTag = async (symbol: string, tag: string) => {
  const state = await readState();
  const normalizedSymbol = symbol.toUpperCase();
  state.watchlist = state.watchlist.map((item) => {
    if (item.symbol !== normalizedSymbol) return item;
    const exists = item.tags.includes(tag);
    const nextTags = exists ? item.tags.filter((entry) => entry !== tag) : [...item.tags, tag];
    return {
      ...item,
      tags: nextTags,
      priority: tag === '重点' ? (exists ? 0 : Math.max(1, item.priority || 0)) : item.priority,
    };
  });
  await writeState(state);
  return state;
};

export const setWatchlistPriority = async (symbol: string, priority: number) => {
  const state = await readState();
  const normalizedSymbol = symbol.toUpperCase();
  const normalizedPriority = Math.max(0, Math.min(3, Math.round(priority)));

  state.watchlist = state.watchlist.map((item) => {
    if (item.symbol !== normalizedSymbol) return item;
    const nextTags =
      normalizedPriority > 0
        ? Array.from(new Set([...item.tags, '重点']))
        : item.tags.filter((tag) => tag !== '重点');

    return {
      ...item,
      priority: normalizedPriority,
      tags: nextTags,
    };
  });

  await writeState(state);
  return state;
};

const deriveStructuredView = (
  price: number,
  snapshot: IndicatorSnapshot,
): StructuredView => {
  const confidence = Math.max(5, Math.min(95, Math.round(snapshot.signalScore)));
  const direction =
    snapshot.signalScore >= 65 ? 'bullish' :
    snapshot.signalScore <= 40 ? 'bearish' :
    'neutral';
  const action =
    direction === 'bullish' ? 'buy' :
    direction === 'bearish' ? 'reduce' :
    'hold';
  const horizon =
    Math.abs(snapshot.returns.month || 0) > 10 ? 'mid' :
    Math.abs(snapshot.returns.week || 0) > 4 ? 'swing' :
    'short';

  return {
    direction,
    confidence,
    action,
    horizon,
    support: snapshot.supportResistance.support,
    resistance: snapshot.supportResistance.resistance,
    targetPrice: snapshot.supportResistance.resistance,
    stopLoss: snapshot.supportResistance.support,
    summary: `${snapshot.signalLabel}，趋势 ${snapshot.trend.regime}，RSI ${snapshot.momentum.rsi14 ?? 'N/A'}`,
  };
};

const buildRankScore = (
  strategyId: StrategyId,
  report: TrackingReportRecord,
  asset: TrackingAsset,
) => {
  const snapshot = report.indicators;
  const price = report.quote.regularMarketPrice || snapshot.price || 0;
  const pe = report.quote.trailingPE ?? 0;

  if (strategyId === 'global-value') {
    return snapshot.signalScore + (pe > 0 && pe < 30 ? 12 : 0) + ((snapshot.momentum.rsi14 ?? 50) < 45 ? 8 : 0);
  }
  if (strategyId === 'global-growth') {
    return snapshot.signalScore + (snapshot.returns.month ?? 0) + (snapshot.trend.regime.includes('多') ? 12 : 0);
  }
  if (strategyId === 'macro-hedge') {
    return (100 - (snapshot.volatility.annualizedVolatility ?? 30)) + (snapshot.signalScore * 0.6);
  }
  if (strategyId === 'highflyer-quant') {
    return snapshot.signalScore + ((snapshot.returns.week ?? 0) * 1.2) - ((snapshot.volatility.annualizedVolatility ?? 0) * 0.4);
  }
  if (strategyId === 'etf-rotation') {
    return (asset.assetClass === 'etf' ? 20 : 0) + snapshot.signalScore + ((snapshot.returns.month ?? 0) * 0.8) - ((snapshot.volatility.annualizedVolatility ?? 0) * 0.25) + (price > (snapshot.trend.ema20 ?? price) ? 6 : 0);
  }
  return snapshot.signalScore;
};

const desiredWeightsForStrategy = (
  strategyId: StrategyId,
  reports: TrackingReportRecord[],
  assets: TrackingAsset[],
) => {
  const ranked = reports
    .map((report) => ({
      report,
      asset: assets.find((item) => item.symbol === report.symbol),
    }))
    .filter((item): item is { report: TrackingReportRecord; asset: TrackingAsset } => Boolean(item.asset))
    .sort((left, right) => buildRankScore(strategyId, right.report, right.asset) - buildRankScore(strategyId, left.report, left.asset));

  const top = strategyId === 'macro-hedge' ? ranked.slice(0, 2) : ranked.slice(0, 3);
  const weights = new Map<string, number>();
  const gross =
    strategyId === 'macro-hedge' ? 0.45 :
    strategyId === 'etf-rotation' ? 0.8 :
    0.9;

  if (top.length === 0) return weights;
  const each = gross / top.length;
  top.forEach((item) => weights.set(item.report.symbol, round(each)));
  return weights;
};

const portfolioEquity = (portfolio: StrategyPortfolio) =>
  portfolio.cash + portfolio.positions.reduce((sum, position) => sum + position.marketValue, 0);

const rebalancePortfolio = (
  portfolio: StrategyPortfolio,
  weights: Map<string, number>,
  reports: TrackingReportRecord[],
) => {
  const equity = portfolioEquity(portfolio);
  const nextPositions: StrategyPosition[] = [];
  const nextTrades = [...portfolio.trades];

  reports.forEach((report) => {
    const targetWeight = weights.get(report.symbol) || 0;
    const price = report.quote.regularMarketPrice || report.indicators.price || 0;
    if (!price) return;

    const current = portfolio.positions.find((item) => item.symbol === report.symbol);
    const targetValue = equity * targetWeight;
    const targetQuantity = targetWeight > 0 ? targetValue / price : 0;
    const currentQuantity = current?.quantity || 0;
    const delta = targetQuantity - currentQuantity;

    if (Math.abs(delta * price) > equity * 0.01) {
      const side = delta > 0 ? 'buy' : 'sell';
      const quantity = round(Math.abs(delta), 6);
      const amount = round(quantity * price, 2);
      nextTrades.unshift({
        id: `${portfolio.strategyId}-${report.symbol}-${Date.now()}-${nextTrades.length}`,
        executedAt: new Date().toISOString(),
        symbol: report.symbol,
        side,
        quantity,
        price: round(price, 4),
        amount,
        reason: report.structured.summary,
      });
      portfolio.cash += side === 'buy' ? -amount : amount;
    }

    if (targetWeight > 0) {
      const marketValue = round(targetQuantity * price, 2);
      nextPositions.push({
        symbol: report.symbol,
        name: report.quote.shortName || report.quote.longName || report.symbol,
        quantity: round(targetQuantity, 6),
        avgCost: round(price, 4),
        marketPrice: round(price, 4),
        marketValue,
        weight: round(targetWeight * 100, 2),
        unrealizedPnl: current ? round((price - current.avgCost) * targetQuantity, 2) : 0,
      });
    }
  });

  portfolio.positions = nextPositions;
  portfolio.trades = nextTrades.slice(0, 120);
  portfolio.lastRebalancedAt = new Date().toISOString();
  portfolio.history.unshift({
    date: new Date().toISOString(),
    equity: round(portfolioEquity(portfolio), 2),
    cash: round(portfolio.cash, 2),
  });
  portfolio.history = portfolio.history.slice(0, 90);
};

const createValidation = (
  previous: TrackingReportRecord,
  current: TrackingReportRecord,
): ValidationRecord => {
  const prevPrice = previous.quote.regularMarketPrice || previous.indicators.price || 0;
  const currentPrice = current.quote.regularMarketPrice || current.indicators.price || 0;
  const actualReturnPct = prevPrice ? round(((currentPrice - prevPrice) / prevPrice) * 100, 2) : 0;
  const directionCorrect =
    previous.structured.direction === 'bullish' ? actualReturnPct >= 0 :
    previous.structured.direction === 'bearish' ? actualReturnPct <= 0 :
    Math.abs(actualReturnPct) < 6;
  const recommendationEffective =
    previous.structured.action === 'buy' ? actualReturnPct > 0 :
    previous.structured.action === 'reduce' ? actualReturnPct < 0 :
    Math.abs(actualReturnPct) < 8;
  const strategyAlignmentScore = Math.max(0, Math.min(100, 50 + (directionCorrect ? 30 : -20) + (recommendationEffective ? 20 : -10)));

  return {
    symbol: current.symbol,
    reportDate: previous.reportDate,
    validatedAt: current.reportDate,
    actualReturnPct,
    directionCorrect,
    recommendationEffective,
    strategyAlignmentScore,
    notes: `${previous.structured.action} 建议在本次验证中的回报为 ${actualReturnPct}%`,
  };
};

const buildSummaryReport = (
  scope: ReportScope,
  reports: TrackingReportRecord[],
  portfolios: StrategyPortfolio[],
  validations: ValidationRecord[],
  failedSymbols: Array<{ symbol: string; error: string }> = [],
) => {
  const generatedAt = new Date().toLocaleString('zh-CN');
  const latestValidations = validations.slice(0, 10);
  const scopeLabel = scope === 'daily' ? '日报' : scope === 'weekly' ? '周报' : '月报';

  const sections: string[] = [
    `# ${scopeLabel} · 跟踪与验证系统`,
    '',
    `- 生成时间：${generatedAt}`,
    `- 覆盖标的数：${reports.length}`,
    `- 策略数：${portfolios.length}`,
    '',
  ];

  // === 组合表现 ===
  sections.push('## 组合表现', '');
  for (const portfolio of portfolios) {
    const latest = portfolio.history[0];
    const equity = latest?.equity ?? portfolio.initialCash;
    const cash = latest?.cash ?? portfolio.cash;
    const pnl = equity - portfolio.initialCash;
    const pnlPct = ((pnl / portfolio.initialCash) * 100).toFixed(2);
    sections.push(`### ${portfolio.strategyName}`);
    sections.push(`- 净值：${equity.toLocaleString()}（${pnl >= 0 ? '+' : ''}${pnlPct}%）`);
    sections.push(`- 现金：${cash.toLocaleString()}，持仓数：${portfolio.positions.length}`);

    if (portfolio.positions.length > 0) {
      sections.push('- 持仓明细：');
      for (const pos of portfolio.positions) {
        sections.push(`  - ${pos.symbol}（${pos.name}）：${pos.quantity.toFixed(2)} 股 × ${pos.marketPrice}，权重 ${pos.weight}%，浮盈 ${pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl}`);
      }
    }

    const recentTrades = portfolio.trades.slice(0, 5);
    if (recentTrades.length > 0) {
      sections.push('- 最近交易：');
      for (const trade of recentTrades) {
        sections.push(`  - ${trade.executedAt.slice(0, 10)} ${trade.side.toUpperCase()} ${trade.symbol} × ${trade.quantity.toFixed(2)} @ ${trade.price}（${trade.reason.slice(0, 40)}）`);
      }
    }

    sections.push('');
  }

  // === AI 观点摘要 ===
  sections.push('## 最新 AI 观点', '');
  for (const report of reports.slice(0, 8)) {
    sections.push(`- **${report.symbol}**：${report.structured.direction} / ${report.structured.action} / 置信度 ${report.structured.confidence}，${report.structured.summary}`);
  }
  sections.push('');

  // === AI 完整分析（重点标的） ===
  const aiReports = reports.filter((r) => r.analysis && !r.analysis.startsWith('## ') && !r.analysis.includes('由于未启用服务端'));
  if (aiReports.length > 0) {
    sections.push('## AI 专业分析全文', '');
    for (const report of aiReports) {
      sections.push(`### ${report.symbol}（${report.quote.shortName || report.quote.longName || report.symbol}）`, '');
      sections.push(report.analysis);
      sections.push('');
      sections.push('---', '');
    }
  }

  // === 验证结果 ===
  if (latestValidations.length > 0) {
    sections.push('## 最近验证结果', '');
    for (const item of latestValidations) {
      sections.push(`- ${item.symbol}：收益 ${item.actualReturnPct}% · 方向${item.directionCorrect ? '✅正确' : '❌失效'} · 建议${item.recommendationEffective ? '✅有效' : '❌失效'}（对齐分 ${item.strategyAlignmentScore}）`);
    }
    sections.push('');
  }

  // === 失败标的 ===
  if (failedSymbols.length > 0) {
    sections.push('## 本次跳过的标的', '');
    for (const item of failedSymbols) {
      sections.push(`- ${item.symbol}：${item.error}`);
    }
    sections.push('');
  }

  return sections.join('\n');
};

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

const runWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
) => {
  const results: Array<PromiseSettledResult<R>> = [];
  for (let index = 0; index < items.length; index += limit) {
    const batch = items.slice(index, index + limit);
    const settled = await Promise.allSettled(batch.map(worker));
    results.push(...settled);
  }
  return results;
};

export const runTrackingCycle = async ({
  scope,
  trigger = 'manual',
  mode = 'full',
  initialState,
  persist = true,
  fetchAsset,
  generateAnalysis,
}: RunTrackingCycleOptions) => {
  const state = initialState ? normalizeTrackingState(initialState) : await readState();
  const nextReports: TrackingReportRecord[] = [];
  const nextValidations = [...state.validations];
  const failedSymbols: Array<{ symbol: string; error: string }> = [];
  const isVercel = process.env.VERCEL === '1';
  const fetchTimeoutMs = Number(process.env.TRACKING_FETCH_TIMEOUT_MS) || (isVercel ? 10000 : 25000);
  const analysisTimeoutMs = Number(process.env.TRACKING_ANALYSIS_TIMEOUT_MS) || (isVercel ? 35000 : 80000);
  const concurrency = Number(process.env.TRACKING_CONCURRENCY) || (isVercel ? 3 : 2);

  const settledReports = await runWithConcurrency(state.watchlist, concurrency, async (asset) => {
    const bundle = await withTimeout(fetchAsset(asset.symbol), fetchTimeoutMs, `${asset.symbol} 行情抓取`);
    const analysis = await withTimeout(
      generateAnalysis(asset.symbol, bundle),
      analysisTimeoutMs,
      `${asset.symbol} 分析生成`,
    );
    const structured = deriveStructuredView(bundle.quote.regularMarketPrice || bundle.packet.snapshot.price, bundle.packet.snapshot);
    const reportDate = new Date().toISOString();
    const next: TrackingReportRecord = {
      symbol: asset.symbol,
      reportDate,
      quote: bundle.quote,
      indicators: bundle.packet.snapshot,
      analysis,
      structured,
    };

    return { asset, next };
  });

  settledReports.forEach((entry, index) => {
    const asset = state.watchlist[index];
    if (entry.status === 'fulfilled') {
      const { next } = entry.value;
      const previous = state.latestReports.find((item) => item.symbol === asset.symbol);
      if (previous) {
        nextValidations.unshift(createValidation(previous, next));
      }
      nextReports.push(next);
      return;
    }

    failedSymbols.push({
      symbol: asset.symbol,
      error: entry.reason?.message || '未知错误',
    });
  });

  if (nextReports.length === 0) {
    const details = failedSymbols.slice(0, 5).map((item) => `${item.symbol}: ${item.error}`).join('；');
    throw new Error(details ? `本次${scope === 'daily' ? '日报' : scope === 'weekly' ? '周报' : '月报'}生成失败，全部标的处理异常。${details}` : `本次${scope === 'daily' ? '日报' : scope === 'weekly' ? '周报' : '月报'}生成失败，未能处理任何标的。请检查 API Key 配置和网络连接。`);
  }

  state.latestReports = nextReports;
  if (mode === 'full') {
    state.validations = nextValidations.slice(0, 200);

    state.portfolios.forEach((portfolio) => {
      const weights = desiredWeightsForStrategy(
        portfolio.strategyId,
        nextReports,
        state.watchlist,
      );
      rebalancePortfolio(portfolio, weights, nextReports);
    });
  }

  state.generatedReports.unshift({
    id: `${scope}-${Date.now()}`,
    scope,
    generatedAt: new Date().toISOString(),
    title: `${scope === 'daily' ? '日报' : scope === 'weekly' ? '周报' : '月报'} · ${new Date().toLocaleDateString('zh-CN')}${mode === 'fast' ? '（快速版）' : ''}`,
    markdown: buildSummaryReport(scope, nextReports, state.portfolios, state.validations, failedSymbols),
    trigger,
  });
  state.generatedReports = state.generatedReports.slice(0, 60);

  if (persist) {
    await writeState(state);
  }
  return state;
};
