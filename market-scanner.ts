import type { AnalysisPacket } from './src/lib/market-analysis.js';

export type ScannerTemplateId =
  | 'breakout'
  | 'volume-surge'
  | 'oversold-rebound'
  | 'trend-follow'
  | 'etf-rotation';

export type ScannerMarket = 'US' | 'CN' | 'HK' | 'ETF' | 'CRYPTO';

export type ScannerUniverseAsset = {
  symbol: string;
  name: string;
  market: ScannerMarket;
  assetClass: 'equity' | 'etf' | 'crypto';
};

export type ScannerTemplate = {
  id: ScannerTemplateId;
  name: string;
  description: string;
  objective: string;
};

export type ScannerCandidate = {
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

export const scannerTemplates: ScannerTemplate[] = [
  {
    id: 'breakout',
    name: '突破扫描',
    description: '寻找接近或突破关键阻力位、量价共振的候选标的。',
    objective: '发现有趋势加速潜力的右侧机会。',
  },
  {
    id: 'volume-surge',
    name: '放量扫描',
    description: '聚焦近期相对量能显著放大、资金参与度提升的标的。',
    objective: '捕捉短期资金明显回流的异动方向。',
  },
  {
    id: 'oversold-rebound',
    name: '超跌修复扫描',
    description: '寻找经历回撤后接近支撑、动量开始修复的标的。',
    objective: '提前锁定可能出现技术性修复的反弹候选。',
  },
  {
    id: 'trend-follow',
    name: '趋势延续扫描',
    description: '筛选均线结构健康、趋势分数较高的强势延续标的。',
    objective: '服务波段和中线趋势跟踪。',
  },
  {
    id: 'etf-rotation',
    name: 'ETF 轮动扫描',
    description: '只在 ETF 与指数代理资产里选相对强势、低波动的轮动目标。',
    objective: '给轮动策略和防守型仓位提供优先候选。',
  },
];

export const scannerUniverse: ScannerUniverseAsset[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'US', assetClass: 'equity' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', market: 'US', assetClass: 'equity' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'US', assetClass: 'equity' },
  { symbol: 'AMZN', name: 'Amazon.com', market: 'US', assetClass: 'equity' },
  { symbol: 'META', name: 'Meta Platforms', market: 'US', assetClass: 'equity' },
  { symbol: 'GOOGL', name: 'Alphabet Class A', market: 'US', assetClass: 'equity' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', market: 'US', assetClass: 'equity' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', market: 'US', assetClass: 'equity' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', market: 'US', assetClass: 'equity' },
  { symbol: 'NFLX', name: 'Netflix, Inc.', market: 'US', assetClass: 'equity' },
  { symbol: 'PLTR', name: 'Palantir Technologies', market: 'US', assetClass: 'equity' },
  { symbol: 'CRM', name: 'Salesforce, Inc.', market: 'US', assetClass: 'equity' },
  { symbol: 'ORCL', name: 'Oracle Corp.', market: 'US', assetClass: 'equity' },
  { symbol: 'ADBE', name: 'Adobe Inc.', market: 'US', assetClass: 'equity' },
  { symbol: 'INTU', name: 'Intuit Inc.', market: 'US', assetClass: 'equity' },
  { symbol: 'COST', name: 'Costco Wholesale', market: 'US', assetClass: 'equity' },
  { symbol: 'WMT', name: 'Walmart Inc.', market: 'US', assetClass: 'equity' },
  { symbol: 'UBER', name: 'Uber Technologies', market: 'US', assetClass: 'equity' },
  { symbol: 'COIN', name: 'Coinbase Global', market: 'US', assetClass: 'equity' },
  { symbol: 'MSTR', name: 'MicroStrategy', market: 'US', assetClass: 'equity' },
  { symbol: 'SMCI', name: 'Super Micro Computer', market: 'US', assetClass: 'equity' },
  { symbol: 'ARM', name: 'Arm Holdings', market: 'US', assetClass: 'equity' },
  { symbol: 'MU', name: 'Micron Technology', market: 'US', assetClass: 'equity' },
  { symbol: 'INTC', name: 'Intel Corp.', market: 'US', assetClass: 'equity' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor ADR', market: 'US', assetClass: 'equity' },
  { symbol: 'BABA', name: 'Alibaba Group ADR', market: 'US', assetClass: 'equity' },
  { symbol: 'PDD', name: 'PDD Holdings', market: 'US', assetClass: 'equity' },
  { symbol: 'LI', name: 'Li Auto Inc.', market: 'US', assetClass: 'equity' },
  { symbol: 'XPEV', name: 'XPeng Inc.', market: 'US', assetClass: 'equity' },
  { symbol: 'JPM', name: 'JPMorgan Chase', market: 'US', assetClass: 'equity' },
  { symbol: 'V', name: 'Visa Inc.', market: 'US', assetClass: 'equity' },
  { symbol: 'KO', name: 'Coca-Cola Co.', market: 'US', assetClass: 'equity' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway B', market: 'US', assetClass: 'equity' },
  { symbol: 'UNH', name: 'UnitedHealth Group', market: 'US', assetClass: 'equity' },
  { symbol: '600519.SS', name: '贵州茅台', market: 'CN', assetClass: 'equity' },
  { symbol: '000858.SZ', name: '五粮液', market: 'CN', assetClass: 'equity' },
  { symbol: '300750.SZ', name: '宁德时代', market: 'CN', assetClass: 'equity' },
  { symbol: '002594.SZ', name: '比亚迪', market: 'CN', assetClass: 'equity' },
  { symbol: '601318.SS', name: '中国平安', market: 'CN', assetClass: 'equity' },
  { symbol: '600036.SS', name: '招商银行', market: 'CN', assetClass: 'equity' },
  { symbol: '600309.SS', name: '万华化学', market: 'CN', assetClass: 'equity' },
  { symbol: '000333.SZ', name: '美的集团', market: 'CN', assetClass: 'equity' },
  { symbol: '002202.SZ', name: '金风科技', market: 'CN', assetClass: 'equity' },
  { symbol: '000420.SZ', name: '吉林化纤', market: 'CN', assetClass: 'equity' },
  { symbol: '601899.SS', name: '紫金矿业', market: 'CN', assetClass: 'equity' },
  { symbol: '600900.SS', name: '长江电力', market: 'CN', assetClass: 'equity' },
  { symbol: '601012.SS', name: '隆基绿能', market: 'CN', assetClass: 'equity' },
  { symbol: '002415.SZ', name: '海康威视', market: 'CN', assetClass: 'equity' },
  { symbol: '600030.SS', name: '中信证券', market: 'CN', assetClass: 'equity' },
  { symbol: '600276.SS', name: '恒瑞医药', market: 'CN', assetClass: 'equity' },
  { symbol: '300059.SZ', name: '东方财富', market: 'CN', assetClass: 'equity' },
  { symbol: '601398.SS', name: '工商银行', market: 'CN', assetClass: 'equity' },
  { symbol: '688981.SS', name: '中芯国际', market: 'CN', assetClass: 'equity' },
  { symbol: '300308.SZ', name: '中际旭创', market: 'CN', assetClass: 'equity' },
  { symbol: '002230.SZ', name: '科大讯飞', market: 'CN', assetClass: 'equity' },
  { symbol: '600941.SS', name: '中国移动', market: 'CN', assetClass: 'equity' },
  { symbol: '0700.HK', name: '腾讯控股', market: 'HK', assetClass: 'equity' },
  { symbol: '9988.HK', name: '阿里巴巴-SW', market: 'HK', assetClass: 'equity' },
  { symbol: '3690.HK', name: '美团-W', market: 'HK', assetClass: 'equity' },
  { symbol: '1810.HK', name: '小米集团-W', market: 'HK', assetClass: 'equity' },
  { symbol: '1211.HK', name: '比亚迪股份', market: 'HK', assetClass: 'equity' },
  { symbol: '9618.HK', name: '京东集团-SW', market: 'HK', assetClass: 'equity' },
  { symbol: '9999.HK', name: '网易-S', market: 'HK', assetClass: 'equity' },
  { symbol: '9888.HK', name: '百度集团-SW', market: 'HK', assetClass: 'equity' },
  { symbol: '1024.HK', name: '快手-W', market: 'HK', assetClass: 'equity' },
  { symbol: '2269.HK', name: '药明生物', market: 'HK', assetClass: 'equity' },
  { symbol: '2382.HK', name: '舜宇光学科技', market: 'HK', assetClass: 'equity' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'QQQ', name: 'Invesco QQQ', market: 'ETF', assetClass: 'etf' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'DIA', name: 'SPDR Dow Jones ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', market: 'ETF', assetClass: 'etf' },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR', market: 'ETF', assetClass: 'etf' },
  { symbol: 'SOXX', name: 'iShares Semiconductor ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR', market: 'ETF', assetClass: 'etf' },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR', market: 'ETF', assetClass: 'etf' },
  { symbol: 'XLY', name: 'Consumer Discretionary Select Sector SPDR', market: 'ETF', assetClass: 'etf' },
  { symbol: 'XLI', name: 'Industrial Select Sector SPDR', market: 'ETF', assetClass: 'etf' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'KWEB', name: 'KraneShares CSI China Internet ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'HYG', name: 'iShares iBoxx High Yield Corporate Bond ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'BTC-USD', name: 'Bitcoin', market: 'CRYPTO', assetClass: 'crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', market: 'CRYPTO', assetClass: 'crypto' },
  { symbol: 'SOL-USD', name: 'Solana', market: 'CRYPTO', assetClass: 'crypto' },
  { symbol: 'BNB-USD', name: 'BNB', market: 'CRYPTO', assetClass: 'crypto' },
  { symbol: 'XRP-USD', name: 'XRP', market: 'CRYPTO', assetClass: 'crypto' },
  { symbol: 'DOGE-USD', name: 'Dogecoin', market: 'CRYPTO', assetClass: 'crypto' },
  { symbol: 'ADA-USD', name: 'Cardano', market: 'CRYPTO', assetClass: 'crypto' },
  { symbol: 'AVAX-USD', name: 'Avalanche', market: 'CRYPTO', assetClass: 'crypto' },
  { symbol: 'LINK-USD', name: 'Chainlink', market: 'CRYPTO', assetClass: 'crypto' },
  { symbol: 'SUI-USD', name: 'Sui', market: 'CRYPTO', assetClass: 'crypto' },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const round = (value: number, digits = 2) => Number(value.toFixed(digits));

const riskFromVolatility = (volatility: number | null) => {
  if (volatility == null) return 45;
  if (volatility >= 80) return 88;
  if (volatility >= 60) return 74;
  if (volatility >= 40) return 56;
  if (volatility >= 25) return 40;
  return 28;
};

const createCandidate = (
  asset: ScannerUniverseAsset,
  template: ScannerTemplate,
  opportunityScore: number,
  riskScore: number,
  reasons: string[],
  summary: string,
  metrics: ScannerCandidate['metrics'],
): ScannerCandidate => ({
  symbol: asset.symbol,
  name: asset.name,
  market: asset.market,
  assetClass: asset.assetClass,
  templateId: template.id,
  templateName: template.name,
  opportunityScore: clamp(Math.round(opportunityScore), 0, 100),
  riskScore: clamp(Math.round(riskScore), 0, 100),
  actionBias:
    opportunityScore >= 78 ? 'execute' :
    opportunityScore >= 62 ? 'prepare' :
    'watch',
  summary,
  reasons: reasons.slice(0, 4),
  metrics,
});

export const evaluateScannerTemplate = (
  templateId: ScannerTemplateId,
  asset: ScannerUniverseAsset,
  packet: AnalysisPacket,
  quote: {
    regularMarketPrice?: number;
    regularMarketChangePercent?: number;
  },
) => {
  const template = scannerTemplates.find((item) => item.id === templateId);
  if (!template) return null;

  const snapshot = packet.snapshot;
  const price = quote.regularMarketPrice ?? snapshot.price ?? 0;
  const changePercent = quote.regularMarketChangePercent ?? snapshot.changePercent ?? 0;
  const rsi = snapshot.momentum.rsi14;
  const relativeVolume = snapshot.volume.relativeVolume;
  const annualizedVolatility = snapshot.volatility.annualizedVolatility;
  const weekReturn = snapshot.returns.week;
  const monthReturn = snapshot.returns.month;
  const resistance = snapshot.supportResistance.resistance;
  const support = snapshot.supportResistance.support;
  const trendScore = snapshot.trend.score;
  const distanceToResistancePct =
    resistance && price ? ((resistance - price) / price) * 100 : null;
  const distanceToSupportPct =
    support && price ? ((price - support) / price) * 100 : null;

  const metrics = {
    price: round(price),
    changePercent: round(changePercent),
    signalScore: snapshot.signalScore,
    rsi14: rsi == null ? null : round(rsi),
    relativeVolume: relativeVolume == null ? null : round(relativeVolume),
    annualizedVolatility: annualizedVolatility == null ? null : round(annualizedVolatility),
    weekReturn: weekReturn == null ? null : round(weekReturn),
    monthReturn: monthReturn == null ? null : round(monthReturn),
  };

  if (templateId === 'breakout') {
    const score =
      (snapshot.signalScore * 0.45) +
      ((relativeVolume ?? 0) * 14) +
      ((monthReturn ?? 0) * 0.9) +
      ((distanceToResistancePct != null && distanceToResistancePct <= 2.5) ? 16 : 0) +
      (changePercent > 0 ? 8 : -8);
    const reasons = [
      `综合信号 ${snapshot.signalScore}/100，趋势状态为 ${snapshot.trend.regime}`,
      relativeVolume != null ? `相对量能 ${round(relativeVolume)} 倍` : '量能数据不足',
      distanceToResistancePct != null ? `距离阻力位约 ${round(distanceToResistancePct)}%` : '阻力位数据不足',
      monthReturn != null ? `近 21 日收益 ${round(monthReturn)}%` : '月度收益数据不足',
    ];
    return createCandidate(asset, template, score, riskFromVolatility(annualizedVolatility), reasons, '接近关键阻力位且量能开始放大，适合右侧突破观察。', metrics);
  }

  if (templateId === 'volume-surge') {
    const score =
      (snapshot.signalScore * 0.35) +
      ((relativeVolume ?? 0) * 20) +
      (changePercent * 2.2) +
      ((weekReturn ?? 0) * 0.7);
    const reasons = [
      relativeVolume != null ? `相对量能放大到 ${round(relativeVolume)} 倍` : '量能数据不足',
      `当日涨跌幅 ${round(changePercent)}%`,
      weekReturn != null ? `近 5 日收益 ${round(weekReturn)}%` : '近 5 日收益数据不足',
      `信号评分 ${snapshot.signalScore}/100`,
    ];
    return createCandidate(asset, template, score, riskFromVolatility(annualizedVolatility) + 6, reasons, '短线资金参与度提升，适合观察是否形成持续异动。', metrics);
  }

  if (templateId === 'oversold-rebound') {
    const reboundScore =
      ((rsi != null ? clamp(55 - rsi, 0, 30) : 0) * 1.6) +
      ((distanceToSupportPct != null && distanceToSupportPct <= 4) ? 14 : 0) +
      ((monthReturn != null && monthReturn < 0) ? Math.abs(monthReturn) * 0.7 : 0) +
      (snapshot.signalScore * 0.25);
    const reasons = [
      rsi != null ? `RSI14 ${round(rsi)}，处于偏低区域` : 'RSI 数据不足',
      distanceToSupportPct != null ? `距支撑位约 ${round(distanceToSupportPct)}%` : '支撑位数据不足',
      monthReturn != null ? `近 21 日收益 ${round(monthReturn)}%` : '月度收益数据不足',
      `趋势状态 ${snapshot.trend.regime}`,
    ];
    return createCandidate(asset, template, reboundScore, riskFromVolatility(annualizedVolatility) + 10, reasons, '经历回撤后靠近支撑，适合寻找超跌修复窗口。', metrics);
  }

  if (templateId === 'trend-follow') {
    const score =
      (trendScore * 0.45) +
      (snapshot.signalScore * 0.35) +
      ((monthReturn ?? 0) * 1.1) +
      ((relativeVolume ?? 1) > 1 ? 6 : 0);
    const reasons = [
      `趋势分数 ${trendScore}，当前为 ${snapshot.trend.regime}`,
      monthReturn != null ? `近 21 日收益 ${round(monthReturn)}%` : '月度收益数据不足',
      relativeVolume != null ? `相对量能 ${round(relativeVolume)} 倍` : '量能数据不足',
      `综合信号 ${snapshot.signalScore}/100`,
    ];
    return createCandidate(asset, template, score, riskFromVolatility(annualizedVolatility), reasons, '均线和动量结构较完整，更适合趋势延续跟踪。', metrics);
  }

  if (templateId === 'etf-rotation') {
    if (asset.assetClass !== 'etf') return null;
    const score =
      (snapshot.signalScore * 0.4) +
      ((monthReturn ?? 0) * 1.1) +
      ((annualizedVolatility != null ? clamp(55 - annualizedVolatility, 0, 30) : 10) * 0.9) +
      ((relativeVolume ?? 0) * 10);
    const reasons = [
      `ETF 信号评分 ${snapshot.signalScore}/100`,
      monthReturn != null ? `近 21 日收益 ${round(monthReturn)}%` : '月度收益数据不足',
      annualizedVolatility != null ? `年化波动率 ${round(annualizedVolatility)}%` : '波动率数据不足',
      relativeVolume != null ? `相对量能 ${round(relativeVolume)} 倍` : '量能数据不足',
    ];
    return createCandidate(asset, template, score, riskFromVolatility(annualizedVolatility) - 8, reasons, '适合轮动框架下优先观察的 ETF 候选。', metrics);
  }

  return null;
};

export const getScannerUniverse = (markets?: ScannerMarket[]) => {
  if (!markets || markets.length === 0) return scannerUniverse;
  const marketSet = new Set(markets);
  return scannerUniverse.filter((item) => marketSet.has(item.market));
};
