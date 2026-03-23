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

export type ParsedScannerDescriptionRule = {
  sourceDescription: string;
  market: ScannerMarket | null;
  excludeST: boolean;
  excludeNewListings: boolean;
  minPrevClose: number | null;
  minTurnoverCny: number | null;
  minAvgAmplitude20Pct: number | null;
  topReturn60Rank: number | null;
  requireAboveSma20: boolean;
  sidewaysDays: number | null;
  maxSidewaysRangePct: number | null;
  parserConfidence: 'high' | 'medium' | 'low';
  summary: string;
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
  // ===== US 美股（35只） =====
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
  { symbol: 'MA', name: 'Mastercard Inc.', market: 'US', assetClass: 'equity' },
  // ===== CN A股（22只） =====
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
  // ===== HK 港股（11只） =====
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
  // ===== ETF（24只） =====
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'QQQ', name: 'Invesco QQQ', market: 'ETF', assetClass: 'etf' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'DIA', name: 'SPDR Dow Jones ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', market: 'ETF', assetClass: 'etf' },
  { symbol: 'SLV', name: 'iShares Silver Trust', market: 'ETF', assetClass: 'etf' },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR', market: 'ETF', assetClass: 'etf' },
  { symbol: 'SOXX', name: 'iShares Semiconductor ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'SMH', name: 'VanEck Semiconductor ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR', market: 'ETF', assetClass: 'etf' },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR', market: 'ETF', assetClass: 'etf' },
  { symbol: 'XLV', name: 'Health Care Select Sector SPDR', market: 'ETF', assetClass: 'etf' },
  { symbol: 'XLY', name: 'Consumer Discretionary SPDR', market: 'ETF', assetClass: 'etf' },
  { symbol: 'XLI', name: 'Industrial Select Sector SPDR', market: 'ETF', assetClass: 'etf' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'KWEB', name: 'KraneShares CSI China Internet ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'HYG', name: 'iShares High Yield Corporate Bond ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'EEM', name: 'iShares MSCI Emerging Markets ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'IBIT', name: 'iShares Bitcoin Trust ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'USO', name: 'United States Oil Fund', market: 'ETF', assetClass: 'etf' },
  { symbol: 'EFA', name: 'iShares MSCI EAFE ETF', market: 'ETF', assetClass: 'etf' },
  { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', market: 'ETF', assetClass: 'etf' },
  // ===== CRYPTO 加密（10只） =====
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

/* ============================================================
   Dynamic discovery — fire-and-forget background refresh
   getScannerUniverse remains SYNCHRONOUS (critical for Vercel)
   ============================================================ */

let _discoveredAssets: ScannerUniverseAsset[] = [];
let _discoveryFetchedAt = 0;
const DISCOVERY_TTL = 10 * 60 * 1000;

const _inferMarket = (s: string): ScannerMarket => {
  if (s.endsWith('.SS') || s.endsWith('.SZ')) return 'CN';
  if (s.endsWith('.HK')) return 'HK';
  if (s.endsWith('-USD')) return 'CRYPTO';
  return 'US';
};

const _ETF_TICKERS = new Set('SPY,QQQ,IWM,DIA,TLT,GLD,SLV,SOXX,SMH,ARKK,KWEB,HYG,VNQ,EEM,EFA,IBIT,USO,VWO,VOO,VTI,VXUS,XLE,XLK,XLF,XLV,XLY,XLI,XLP,XLU,XLB,XLRE,ARKW,ARKG,FXI,GDX,GDXJ,XBI,IBB,KRE,XHB,SOXL,TQQQ,SQQQ,JEPI,JEPQ,SCHD,BITO'.split(','));

const _inferAssetClass = (s: string): 'equity' | 'etf' | 'crypto' => {
  if (s.endsWith('-USD')) return 'crypto';
  if (_ETF_TICKERS.has(s.toUpperCase())) return 'etf';
  return 'equity';
};

const _safeFetch = async (url: string, headers?: Record<string, string>): Promise<any> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; } finally { clearTimeout(timer); }
};

const _round = (value: number, digits = 2) => Number(value.toFixed(digits));

const _avg = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const _runWithConcurrency = async <T, R>(
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

const _parseBillionNumber = (description: string, fallbackUnit = 1e8) => {
  const match = description.match(/大于\s*([0-9]+(?:\.[0-9]+)?)\s*亿/);
  if (match) return Number(match[1]) * fallbackUnit;
  const tenThousandMatch = description.match(/大于\s*([0-9]+(?:\.[0-9]+)?)\s*万/);
  if (tenThousandMatch) return Number(tenThousandMatch[1]) * 1e4;
  return null;
};

const _makeEastmoneySecid = (symbol: string) => {
  const normalized = symbol.toUpperCase();
  const code = normalized.replace(/\.(SS|SZ)$/, '');
  if (normalized.endsWith('.SS')) return `1.${code}`;
  return `0.${code}`;
};

const _fetchFullAshareSnapshot = async () => {
  const response = await _safeFetch(
    'https://push2.eastmoney.com/api/qt/clist/get?fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&pn=1&pz=5000&po=1&np=1&fltt=2&invt=2&fid=f24&fields=f2,f3,f5,f6,f7,f8,f12,f14,f15,f16,f17,f18,f24',
  );
  const diff = Array.isArray(response?.data?.diff) ? response.data.diff : [];
  return diff
    .filter((item) => item?.f12 && item?.f14)
    .map((item) => {
      const code = String(item.f12);
      const suffix = code.startsWith('6') || code.startsWith('9') ? '.SS' : '.SZ';
      const symbol = `${code}${suffix}`;
      return {
        symbol,
        name: String(item.f14 || symbol),
        market: 'CN' as const,
        assetClass: 'equity' as const,
        price: Number(item.f2 || 0),
        turnoverCny: Number(item.f6 || 0),
        amplitudePct: Number(item.f7 || 0),
        previousClose: Number(item.f18 || 0),
        return60Pct: Number(item.f24 || 0),
      };
    });
};

const _fetchEastmoneyKlines = async (symbol: string, count = 140) => {
  const secid = _makeEastmoneySecid(symbol);
  const response = await _safeFetch(
    `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&klt=101&fqt=1&lmt=${count}&end=20500000&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61`,
  );
  const raw = Array.isArray(response?.data?.klines) ? response.data.klines : [];
  return raw
    .map((line: string) => String(line).split(','))
    .filter((parts: string[]) => parts.length >= 6)
    .map((parts: string[]) => ({
      date: parts[0],
      open: Number(parts[1] || 0),
      close: Number(parts[2] || 0),
      high: Number(parts[3] || 0),
      low: Number(parts[4] || 0),
      volume: Number(parts[5] || 0),
      amount: Number(parts[6] || 0),
      amplitudePct: Number(parts[7] || 0),
    }))
    .filter((item) => item.close > 0);
};

export const parseScannerDescription = (description: string): ParsedScannerDescriptionRule => {
  const text = description.trim();
  const minPrevCloseMatch = text.match(/收盘价(?:大于|>\s*)([0-9]+(?:\.[0-9]+)?)\s*元/);
  const avgAmplitudeMatch = text.match(/近\s*20\s*日.*?振幅.*?(?:大于|>\s*)([0-9]+(?:\.[0-9]+)?)\s*%/);
  const topReturnRankMatch = text.match(/近\s*60\s*日涨幅排名前\s*([0-9]+)\s*名/);
  const sidewaysDaysMatch = text.match(/近\s*([0-9]+)\s*日.*?横盘震荡/);

  const market =
    /A股|创业板|沪深/i.test(text) ? 'CN' :
    /港股/i.test(text) ? 'HK' :
    /美股/i.test(text) ? 'US' :
    /ETF/i.test(text) ? 'ETF' :
    /加密|比特币|币/i.test(text) ? 'CRYPTO' :
    null;

  const rule: ParsedScannerDescriptionRule = {
    sourceDescription: text,
    market,
    excludeST: /剔除\s*\*?ST|不含\s*\*?ST|过滤\s*\*?ST/i.test(text),
    excludeNewListings: /剔除新股|排除新股|过滤新股/i.test(text),
    minPrevClose: minPrevCloseMatch ? Number(minPrevCloseMatch[1]) : null,
    minTurnoverCny: _parseBillionNumber(text),
    minAvgAmplitude20Pct: avgAmplitudeMatch ? Number(avgAmplitudeMatch[1]) : null,
    topReturn60Rank: topReturnRankMatch ? Number(topReturnRankMatch[1]) : null,
    requireAboveSma20: /站稳\s*20\s*日均线|站上\s*20\s*日均线|20日均线之上/i.test(text),
    sidewaysDays: sidewaysDaysMatch ? Number(sidewaysDaysMatch[1]) : null,
    maxSidewaysRangePct: /横盘震荡/i.test(text) ? 6 : null,
    parserConfidence: market === 'CN' ? 'high' : 'medium',
    summary: '',
  };

  rule.summary = [
    rule.market ? `市场=${rule.market}` : '市场=未识别',
    rule.excludeST ? '剔除ST' : null,
    rule.excludeNewListings ? '剔除新股' : null,
    rule.minPrevClose != null ? `昨收>${rule.minPrevClose}` : null,
    rule.minTurnoverCny != null ? `成交额>${_round(rule.minTurnoverCny / 1e8)}亿` : null,
    rule.minAvgAmplitude20Pct != null ? `20日均振幅>${rule.minAvgAmplitude20Pct}%` : null,
    rule.topReturn60Rank != null ? `60日涨幅前${rule.topReturn60Rank}` : null,
    rule.requireAboveSma20 ? '站稳20日均线' : null,
    rule.sidewaysDays != null ? `${rule.sidewaysDays}日横盘` : null,
  ].filter(Boolean).join(' · ');

  return rule;
};

export const runNaturalLanguageCnScan = async (
  description: string,
  limit = 80,
) => {
  const rule = parseScannerDescription(description);
  if (rule.market !== 'CN') {
    return {
      rule,
      scanned: 0,
      requestedScanned: 0,
      candidates: [] as ScannerCandidate[],
    };
  }

  const fullUniverse = await _fetchFullAshareSnapshot();
  const filteredBase = fullUniverse
    .filter((item) => !rule.excludeST || !/\*?ST/i.test(item.name))
    .filter((item) => rule.minPrevClose == null || item.previousClose > rule.minPrevClose)
    .filter((item) => rule.minTurnoverCny == null || item.turnoverCny > rule.minTurnoverCny);

  const rankedBy60 = [...filteredBase].sort((left, right) => right.return60Pct - left.return60Pct);
  const topRanked = rule.topReturn60Rank
    ? rankedBy60.slice(0, Math.max(20, rule.topReturn60Rank))
    : rankedBy60.slice(0, 160);

  const settled = await _runWithConcurrency(topRanked, 8, async (asset) => {
    const klines = await _fetchEastmoneyKlines(asset.symbol, 140);
    if (rule.excludeNewListings && klines.length < 120) return null;
    if (klines.length < 25) return null;

    const last20 = klines.slice(-20);
    const avgAmplitude20 = _avg(
      last20.map((item) => {
        const denominator = item.close || item.open || 1;
        return denominator > 0 ? ((item.high - item.low) / denominator) * 100 : 0;
      }),
    );
    if (rule.minAvgAmplitude20Pct != null && (avgAmplitude20 ?? 0) < rule.minAvgAmplitude20Pct) return null;

    const closes = klines.map((item) => item.close);
    const last20Closes = closes.slice(-20);
    const sma20 = last20Closes.length === 20 ? last20Closes.reduce((sum, value) => sum + value, 0) / 20 : null;
    const currentClose = closes[closes.length - 1] || asset.price;
    if (rule.requireAboveSma20 && sma20 != null && currentClose < sma20) return null;

    const sidewaysDays = rule.sidewaysDays || 0;
    if (sidewaysDays > 0) {
      const recent = closes.slice(-sidewaysDays);
      if (recent.length < sidewaysDays) return null;
      const maxClose = Math.max(...recent);
      const minClose = Math.min(...recent);
      const avgClose = recent.reduce((sum, value) => sum + value, 0) / recent.length;
      const rangePct = avgClose > 0 ? ((maxClose - minClose) / avgClose) * 100 : 999;
      if (rule.maxSidewaysRangePct != null && rangePct > rule.maxSidewaysRangePct) return null;
    }

    const opportunityScore = clamp(
      65 +
        Math.min(20, (asset.return60Pct || 0) * 0.6) +
        Math.min(10, (avgAmplitude20 || 0) * 0.8) +
        (sma20 != null && currentClose >= sma20 ? 6 : 0),
      0,
      100,
    );
    const riskScore = clamp(28 + Math.max(0, (avgAmplitude20 || 0) * 2.5), 0, 100);
    return createCandidate(
      {
        symbol: asset.symbol,
        name: asset.name,
        market: 'CN',
        assetClass: 'equity',
      },
      scannerTemplates.find((item) => item.id === 'trend-follow') || scannerTemplates[3],
      opportunityScore,
      riskScore,
      [
        `昨收 ${asset.previousClose} 元，成交额 ${_round(asset.turnoverCny / 1e8)} 亿`,
        `近 60 日涨幅 ${_round(asset.return60Pct)}%，位于当前筛选前列`,
        `近 20 日平均振幅 ${avgAmplitude20 ? _round(avgAmplitude20) : 'N/A'}%`,
        sma20 != null ? `当前价 ${_round(currentClose)}，20 日均线 ${_round(sma20)}` : '20 日均线数据不足',
      ],
      '满足自然语言策略解析后的 A 股强势横盘筛选条件。',
      {
        price: _round(currentClose),
        changePercent: 0,
        signalScore: Math.round(opportunityScore),
        rsi14: null,
        relativeVolume: null,
        annualizedVolatility: avgAmplitude20 ? _round(avgAmplitude20 * 4) : null,
        weekReturn: null,
        monthReturn: _round(asset.return60Pct),
      },
    );
  });

  const candidates = settled
    .filter((entry): entry is PromiseFulfilledResult<ScannerCandidate | null> => entry.status === 'fulfilled')
    .map((entry) => entry.value)
    .filter((item): item is ScannerCandidate => Boolean(item))
    .sort((left, right) => right.opportunityScore - left.opportunityScore || left.riskScore - right.riskScore)
    .slice(0, limit);

  return {
    rule,
    scanned: filteredBase.length,
    requestedScanned: fullUniverse.length,
    candidates,
  };
};

const _refreshDiscovery = async () => {
  const all: ScannerUniverseAsset[] = [];
  const UA = { 'User-Agent': 'Mozilla/5.0' };

  // Yahoo trending (US)
  try {
    const j = await _safeFetch('https://query1.finance.yahoo.com/v1/finance/trending/US?count=25', UA);
    for (const q of (j?.finance?.result?.[0]?.quotes || [])) {
      if (q?.symbol) all.push({ symbol: q.symbol, name: q.symbol, market: _inferMarket(q.symbol), assetClass: _inferAssetClass(q.symbol) });
    }
  } catch {}

  // Yahoo day gainers
  try {
    const j = await _safeFetch('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers&count=15', UA);
    for (const q of (j?.finance?.result?.[0]?.quotes || [])) {
      if (q?.symbol && (q?.marketCap ?? 0) > 1e9) all.push({ symbol: q.symbol, name: q.shortName || q.symbol, market: _inferMarket(q.symbol), assetClass: _inferAssetClass(q.symbol) });
    }
  } catch {}

  // Yahoo most actives
  try {
    const j = await _safeFetch('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=15', UA);
    for (const q of (j?.finance?.result?.[0]?.quotes || [])) {
      if (q?.symbol && (q?.marketCap ?? 0) > 1e9) all.push({ symbol: q.symbol, name: q.shortName || q.symbol, market: _inferMarket(q.symbol), assetClass: _inferAssetClass(q.symbol) });
    }
  } catch {}

  // Yahoo active ETFs
  try {
    const j = await _safeFetch('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives_etfs&count=20', UA);
    for (const q of (j?.finance?.result?.[0]?.quotes || [])) {
      if (q?.symbol) all.push({ symbol: q.symbol, name: q.shortName || q.symbol, market: 'ETF', assetClass: 'etf' });
    }
  } catch {}

  // Eastmoney A-share gainers
  try {
    const j = await _safeFetch('https://push2.eastmoney.com/api/qt/clist/get?fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fid=f3&po=1&pn=1&pz=15&fields=f12,f14');
    for (const item of (j?.data?.diff || [])) {
      if (item?.f12 && item?.f14) {
        const code = String(item.f12);
        const suffix = code.startsWith('6') || code.startsWith('9') ? '.SS' : '.SZ';
        all.push({ symbol: `${code}${suffix}`, name: String(item.f14), market: 'CN', assetClass: 'equity' });
      }
    }
  } catch {}

  // Eastmoney A-share volume leaders
  try {
    const j = await _safeFetch('https://push2.eastmoney.com/api/qt/clist/get?fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fid=f5&po=1&pn=1&pz=10&fields=f12,f14');
    for (const item of (j?.data?.diff || [])) {
      if (item?.f12 && item?.f14) {
        const code = String(item.f12);
        const suffix = code.startsWith('6') || code.startsWith('9') ? '.SS' : '.SZ';
        all.push({ symbol: `${code}${suffix}`, name: String(item.f14), market: 'CN', assetClass: 'equity' });
      }
    }
  } catch {}

  // HK Connect hot stocks
  try {
    const j = await _safeFetch('https://push2.eastmoney.com/api/qt/clist/get?fs=b:DLMK0144&fid=f3&po=1&pn=1&pz=10&fields=f12,f14');
    for (const item of (j?.data?.diff || [])) {
      if (item?.f12 && item?.f14) {
        all.push({ symbol: `${String(item.f12).padStart(4, '0')}.HK`, name: String(item.f14), market: 'HK', assetClass: 'equity' });
      }
    }
  } catch {}

  // CoinGecko trending
  try {
    const j = await _safeFetch('https://api.coingecko.com/api/v3/search/trending');
    for (const entry of (j?.coins || []).slice(0, 8)) {
      const coin = entry?.item;
      if (coin?.symbol) all.push({ symbol: `${String(coin.symbol).toUpperCase()}-USD`, name: coin.name || coin.symbol, market: 'CRYPTO', assetClass: 'crypto' });
    }
  } catch {}

  // ETF reclassification
  for (const a of all) {
    if (a.assetClass !== 'etf' && _ETF_TICKERS.has(a.symbol.toUpperCase())) {
      a.assetClass = 'etf';
      a.market = 'ETF';
    }
  }

  _discoveredAssets = all;
  _discoveryFetchedAt = Date.now();
  console.log(`🔍 Dynamic discovery: ${all.length} assets found`);
};

/** Trigger background refresh if cache expired (non-blocking) */
const _ensureDiscovery = () => {
  if (Date.now() - _discoveryFetchedAt > DISCOVERY_TTL) {
    _refreshDiscovery().catch(() => {});
  }
};

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

/** Await this before getScannerUniverse to ensure discovery data is loaded (for Serverless) */
export const ensureDiscoveryReady = async (): Promise<void> => {
  if (Date.now() - _discoveryFetchedAt > DISCOVERY_TTL) {
    try {
      await _refreshDiscovery();
    } catch (err) {
      console.warn('Discovery refresh failed:', err instanceof Error ? err.message : err);
    }
  }
};

export const getScannerUniverse = (markets?: ScannerMarket[]): ScannerUniverseAsset[] => {
  // Merge core + discovered, deduplicate by symbol
  const seen = new Set<string>();
  const merged: ScannerUniverseAsset[] = [];
  for (const a of scannerUniverse) {
    if (!seen.has(a.symbol)) { seen.add(a.symbol); merged.push(a); }
  }
  for (const a of _discoveredAssets) {
    if (!seen.has(a.symbol)) { seen.add(a.symbol); merged.push(a); }
  }

  if (markets && markets.length > 0) {
    const s = new Set(markets);
    return merged.filter((a) => s.has(a.market));
  }
  return merged;
};
