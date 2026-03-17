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
  source?: 'core' | 'discovery';
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

/* ============================================================
   核心池：始终包含的头部标的
   ============================================================ */
const coreUniverse: ScannerUniverseAsset[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'AMZN', name: 'Amazon.com', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'META', name: 'Meta Platforms', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'GOOGL', name: 'Alphabet Class A', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor ADR', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'BABA', name: 'Alibaba Group ADR', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'JPM', name: 'JPMorgan Chase', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: '600519.SS', name: '贵州茅台', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '300750.SZ', name: '宁德时代', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '002594.SZ', name: '比亚迪', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '601318.SS', name: '中国平安', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '600036.SS', name: '招商银行', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '601899.SS', name: '紫金矿业', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '300059.SZ', name: '东方财富', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '688981.SS', name: '中芯国际', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '0700.HK', name: '腾讯控股', market: 'HK', assetClass: 'equity', source: 'core' },
  { symbol: '9988.HK', name: '阿里巴巴-SW', market: 'HK', assetClass: 'equity', source: 'core' },
  { symbol: '3690.HK', name: '美团-W', market: 'HK', assetClass: 'equity', source: 'core' },
  { symbol: '1810.HK', name: '小米集团-W', market: 'HK', assetClass: 'equity', source: 'core' },
  { symbol: '1211.HK', name: '比亚迪股份', market: 'HK', assetClass: 'equity', source: 'core' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'QQQ', name: 'Invesco QQQ', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'DIA', name: 'SPDR Dow Jones ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'SLV', name: 'iShares Silver Trust', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'SOXX', name: 'iShares Semiconductor ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'XLV', name: 'Health Care Select Sector SPDR', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'XLY', name: 'Consumer Discretionary SPDR', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'XLI', name: 'Industrial Select Sector SPDR', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'KWEB', name: 'KraneShares CSI China Internet ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'HYG', name: 'iShares High Yield Corporate Bond ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'EEM', name: 'iShares MSCI Emerging Markets ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'EFA', name: 'iShares MSCI EAFE ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'IBIT', name: 'iShares Bitcoin Trust ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'USO', name: 'United States Oil Fund', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'SMH', name: 'VanEck Semiconductor ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'BTC-USD', name: 'Bitcoin', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
  { symbol: 'ETH-USD', name: 'Ethereum', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
  { symbol: 'SOL-USD', name: 'Solana', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
  { symbol: 'BNB-USD', name: 'BNB', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
  { symbol: 'XRP-USD', name: 'XRP', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
];

/* ============================================================
   动态发现：从免费 API 获取当日异动/热门标的
   ============================================================ */

const DISCOVERY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 分钟缓存
let discoveryCache: { assets: ScannerUniverseAsset[]; fetchedAt: number } = {
  assets: [],
  fetchedAt: 0,
};

const inferMarket = (symbol: string): ScannerMarket => {
  if (symbol.endsWith('.SS') || symbol.endsWith('.SZ')) return 'CN';
  if (symbol.endsWith('.HK')) return 'HK';
  if (symbol.endsWith('-USD')) return 'CRYPTO';
  return 'US';
};

const KNOWN_ETF_SYMBOLS = new Set([
  'SPY','QQQ','IWM','DIA','TLT','GLD','SLV','SOXX','SMH','ARKK','KWEB',
  'HYG','VNQ','EEM','EFA','IBIT','BITO','USO','VWO','VOO','VTI','VXUS',
  'XLE','XLK','XLF','XLV','XLY','XLI','XLP','XLU','XLB','XLRE',
  'IVV','IJH','IJR','AGG','BND','LQD','TIP','SHY','SHV',
  'ARKW','ARKG','ARKQ','ARKF',
  'FXI','MCHI','GDX','GDXJ','XBI','IBB','KRE','XHB','XRT',
  'SOXL','TQQQ','SQQQ','SPXL','UVXY','VXX',
  'JEPI','JEPQ','SCHD','DIVO','QYLD',
]);

const inferAssetClass = (symbol: string): 'equity' | 'etf' | 'crypto' => {
  if (symbol.endsWith('-USD')) return 'crypto';
  if (KNOWN_ETF_SYMBOLS.has(symbol.toUpperCase())) return 'etf';
  return 'equity';
};

/** Yahoo Finance 热门 — 美股/加密当日热搜 */
const fetchYahooTrending = async (): Promise<ScannerUniverseAsset[]> => {
  try {
    const res = await fetch('https://query1.finance.yahoo.com/v1/finance/trending/US?count=30', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const quotes = json?.finance?.result?.[0]?.quotes || [];
    return quotes
      .map((q: any) => q?.symbol)
      .filter((s: any): s is string => typeof s === 'string' && s.length > 0 && s.length < 12)
      .map((symbol: string) => ({
        symbol,
        name: symbol,
        market: inferMarket(symbol),
        assetClass: inferAssetClass(symbol),
        source: 'discovery' as const,
      }));
  } catch (err) {
    console.warn('Yahoo trending failed:', err instanceof Error ? err.message : err);
    return [];
  }
};

/** Yahoo Finance 筛选器 — 当日涨幅/跌幅/成交活跃 */
const fetchYahooScreener = async (scrId: string, count = 15): Promise<ScannerUniverseAsset[]> => {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${scrId}&count=${count}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return [];
    const json = await res.json();
    const quotes = json?.finance?.result?.[0]?.quotes || [];
    return quotes
      .filter((q: any) => q?.symbol && (q?.marketCap ?? 0) > 1_000_000_000)
      .map((q: any) => ({
        symbol: String(q.symbol),
        name: String(q.shortName || q.longName || q.symbol),
        market: inferMarket(String(q.symbol)),
        assetClass: inferAssetClass(String(q.symbol)),
        source: 'discovery' as const,
      }));
  } catch (err) {
    console.warn(`Yahoo screener(${scrId}) failed:`, err instanceof Error ? err.message : err);
    return [];
  }
};

/** 东方财富 A 股榜单 */
const fetchEastmoneyMovers = async (sortField: string, count = 20): Promise<ScannerUniverseAsset[]> => {
  try {
    const url = new URL('https://push2.eastmoney.com/api/qt/clist/get');
    url.searchParams.set('fs', 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23');
    url.searchParams.set('fid', sortField);
    url.searchParams.set('po', '1');
    url.searchParams.set('pn', '1');
    url.searchParams.set('pz', String(count));
    url.searchParams.set('fields', 'f12,f14');
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.data?.diff || [];
    return items
      .filter((item: any) => item?.f12 && item?.f14)
      .map((item: any) => {
        const code = String(item.f12);
        const suffix = code.startsWith('6') || code.startsWith('9') ? '.SS' : '.SZ';
        return {
          symbol: `${code}${suffix}`,
          name: String(item.f14),
          market: 'CN' as ScannerMarket,
          assetClass: 'equity' as const,
          source: 'discovery' as const,
        };
      });
  } catch (err) {
    console.warn(`Eastmoney(${sortField}) failed:`, err instanceof Error ? err.message : err);
    return [];
  }
};

/** 港股通热门 */
const fetchHKConnect = async (count = 15): Promise<ScannerUniverseAsset[]> => {
  try {
    const url = new URL('https://push2.eastmoney.com/api/qt/clist/get');
    url.searchParams.set('fs', 'b:DLMK0144');
    url.searchParams.set('fid', 'f3');
    url.searchParams.set('po', '1');
    url.searchParams.set('pn', '1');
    url.searchParams.set('pz', String(count));
    url.searchParams.set('fields', 'f12,f14');
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.data?.diff || [];
    return items
      .filter((item: any) => item?.f12 && item?.f14)
      .map((item: any) => ({
        symbol: `${String(item.f12).padStart(4, '0')}.HK`,
        name: String(item.f14),
        market: 'HK' as ScannerMarket,
        assetClass: 'equity' as const,
        source: 'discovery' as const,
      }));
  } catch (err) {
    console.warn('HK Connect failed:', err instanceof Error ? err.message : err);
    return [];
  }
};

/** CoinGecko 加密货币热度榜 */
const fetchCryptoTrending = async (): Promise<ScannerUniverseAsset[]> => {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.coins || [])
      .slice(0, 10)
      .map((entry: any) => {
        const coin = entry?.item;
        if (!coin?.symbol) return null;
        return {
          symbol: `${String(coin.symbol).toUpperCase()}-USD`,
          name: String(coin.name || coin.symbol),
          market: 'CRYPTO' as ScannerMarket,
          assetClass: 'crypto' as const,
          source: 'discovery' as const,
        };
      })
      .filter(Boolean) as ScannerUniverseAsset[];
  } catch (err) {
    console.warn('CoinGecko trending failed:', err instanceof Error ? err.message : err);
    return [];
  }
};

/** Yahoo Finance ETF 筛选 — 当日活跃/涨幅 ETF */
const fetchYahooEtfMovers = async (count = 20): Promise<ScannerUniverseAsset[]> => {
  try {
    // most_actives_etfs 是 Yahoo 内置的 ETF 活跃榜
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives_etfs&count=${count}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return [];
    const json = await res.json();
    const quotes = json?.finance?.result?.[0]?.quotes || [];
    return quotes
      .filter((q: any) => q?.symbol)
      .map((q: any) => ({
        symbol: String(q.symbol),
        name: String(q.shortName || q.longName || q.symbol),
        market: 'ETF' as ScannerMarket,
        assetClass: 'etf' as const,
        source: 'discovery' as const,
      }));
  } catch (err) {
    console.warn('Yahoo ETF movers failed:', err instanceof Error ? err.message : err);
    return [];
  }
};

/** 并行获取所有动态发现源 */
const fetchAllDiscovery = async (): Promise<ScannerUniverseAsset[]> => {
  const results = await Promise.allSettled([
    fetchYahooTrending(),
    fetchYahooScreener('day_gainers', 15),
    fetchYahooScreener('day_losers', 10),
    fetchYahooScreener('most_actives', 15),
    fetchYahooEtfMovers(20),              // ETF 活跃榜
    fetchEastmoneyMovers('f3', 15),       // A 股涨幅榜
    fetchEastmoneyMovers('f5', 10),       // A 股成交量榜
    fetchHKConnect(10),
    fetchCryptoTrending(),
  ]);

  const all: ScannerUniverseAsset[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  // 对动态发现的结果做 ETF 二次校正：如果 symbol 匹配已知 ETF 列表，修正分类
  for (const asset of all) {
    if (asset.assetClass !== 'etf' && KNOWN_ETF_SYMBOLS.has(asset.symbol.toUpperCase())) {
      asset.assetClass = 'etf';
      asset.market = 'ETF';
    }
  }

  return all;
};

/**
 * 获取完整扫描股票池 = 核心池 + 动态发现池（去重，缓存 10 分钟）
 */
export const getScannerUniverse = async (markets?: ScannerMarket[]): Promise<ScannerUniverseAsset[]> => {
  const now = Date.now();
  if (now - discoveryCache.fetchedAt > DISCOVERY_CACHE_TTL_MS) {
    try {
      const discovered = await fetchAllDiscovery();
      discoveryCache = { assets: discovered, fetchedAt: now };
      console.log(`🔍 动态发现：新增 ${discovered.length} 只 (Yahoo热搜/涨跌榜 + 东方财富涨幅/量能 + 港股通 + CoinGecko)`);
    } catch (err) {
      console.warn('动态发现刷新失败，使用缓存:', err instanceof Error ? err.message : err);
    }
  }

  const seen = new Set<string>();
  const merged: ScannerUniverseAsset[] = [];
  for (const a of coreUniverse) { if (!seen.has(a.symbol)) { seen.add(a.symbol); merged.push(a); } }
  for (const a of discoveryCache.assets) { if (!seen.has(a.symbol)) { seen.add(a.symbol); merged.push(a); } }

  if (markets && markets.length > 0) {
    const s = new Set(markets);
    return merged.filter((a) => s.has(a.market));
  }
  return merged;
};

/** 同步版（不触发网络请求，用于 universeSize 展示等） */
export const getScannerUniverseSync = (markets?: ScannerMarket[]): ScannerUniverseAsset[] => {
  const seen = new Set<string>();
  const merged: ScannerUniverseAsset[] = [];
  for (const a of coreUniverse) { if (!seen.has(a.symbol)) { seen.add(a.symbol); merged.push(a); } }
  for (const a of discoveryCache.assets) { if (!seen.has(a.symbol)) { seen.add(a.symbol); merged.push(a); } }
  if (markets && markets.length > 0) {
    const s = new Set(markets);
    return merged.filter((a) => s.has(a.market));
  }
  return merged;
};

/* ============================================================
   评估逻辑（保持不变）
   ============================================================ */

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
  quote: { regularMarketPrice?: number; regularMarketChangePercent?: number },
) => {
  const template = scannerTemplates.find((i) => i.id === templateId);
  if (!template) return null;

  const s = packet.snapshot;
  const price = quote.regularMarketPrice ?? s.price ?? 0;
  const changePercent = quote.regularMarketChangePercent ?? s.changePercent ?? 0;
  const rsi = s.momentum.rsi14;
  const relVol = s.volume.relativeVolume;
  const annVol = s.volatility.annualizedVolatility;
  const weekRet = s.returns.week;
  const monthRet = s.returns.month;
  const resistance = s.supportResistance.resistance;
  const support = s.supportResistance.support;
  const trendScore = s.trend.score;
  const distRes = resistance && price ? ((resistance - price) / price) * 100 : null;
  const distSup = support && price ? ((price - support) / price) * 100 : null;

  const metrics = {
    price: round(price), changePercent: round(changePercent), signalScore: s.signalScore,
    rsi14: rsi == null ? null : round(rsi), relativeVolume: relVol == null ? null : round(relVol),
    annualizedVolatility: annVol == null ? null : round(annVol),
    weekReturn: weekRet == null ? null : round(weekRet), monthReturn: monthRet == null ? null : round(monthRet),
  };

  if (templateId === 'breakout') {
    const score = (s.signalScore * 0.45) + ((relVol ?? 0) * 14) + ((monthRet ?? 0) * 0.9)
      + ((distRes != null && distRes <= 2.5) ? 16 : 0) + (changePercent > 0 ? 8 : -8);
    return createCandidate(asset, template, score, riskFromVolatility(annVol), [
      `综合信号 ${s.signalScore}/100，趋势 ${s.trend.regime}`,
      relVol != null ? `相对量能 ${round(relVol)} 倍` : '量能数据不足',
      distRes != null ? `距阻力位约 ${round(distRes)}%` : '阻力位数据不足',
      monthRet != null ? `近21日收益 ${round(monthRet)}%` : '月度收益不足',
    ], '接近关键阻力位且量能开始放大，适合右侧突破观察。', metrics);
  }

  if (templateId === 'volume-surge') {
    const score = (s.signalScore * 0.35) + ((relVol ?? 0) * 20) + (changePercent * 2.2) + ((weekRet ?? 0) * 0.7);
    return createCandidate(asset, template, score, riskFromVolatility(annVol) + 6, [
      relVol != null ? `量能放大到 ${round(relVol)} 倍` : '量能数据不足',
      `当日涨跌 ${round(changePercent)}%`,
      weekRet != null ? `近5日收益 ${round(weekRet)}%` : '近5日数据不足',
      `信号 ${s.signalScore}/100`,
    ], '短线资金参与度提升，适合观察是否形成持续异动。', metrics);
  }

  if (templateId === 'oversold-rebound') {
    const score = ((rsi != null ? clamp(55 - rsi, 0, 30) : 0) * 1.6) + ((distSup != null && distSup <= 4) ? 14 : 0)
      + ((monthRet != null && monthRet < 0) ? Math.abs(monthRet) * 0.7 : 0) + (s.signalScore * 0.25);
    return createCandidate(asset, template, score, riskFromVolatility(annVol) + 10, [
      rsi != null ? `RSI14 ${round(rsi)}，偏低` : 'RSI不足',
      distSup != null ? `距支撑位约 ${round(distSup)}%` : '支撑位不足',
      monthRet != null ? `近21日收益 ${round(monthRet)}%` : '月度收益不足',
      `趋势 ${s.trend.regime}`,
    ], '经历回撤后靠近支撑，适合寻找超跌修复窗口。', metrics);
  }

  if (templateId === 'trend-follow') {
    const score = (trendScore * 0.45) + (s.signalScore * 0.35) + ((monthRet ?? 0) * 1.1) + ((relVol ?? 1) > 1 ? 6 : 0);
    return createCandidate(asset, template, score, riskFromVolatility(annVol), [
      `趋势分 ${trendScore}，${s.trend.regime}`,
      monthRet != null ? `近21日收益 ${round(monthRet)}%` : '月度收益不足',
      relVol != null ? `量能 ${round(relVol)} 倍` : '量能不足',
      `综合信号 ${s.signalScore}/100`,
    ], '均线和动量结构较完整，更适合趋势延续跟踪。', metrics);
  }

  if (templateId === 'etf-rotation') {
    if (asset.assetClass !== 'etf') return null;
    const score = (s.signalScore * 0.4) + ((monthRet ?? 0) * 1.1)
      + ((annVol != null ? clamp(55 - annVol, 0, 30) : 10) * 0.9) + ((relVol ?? 0) * 10);
    return createCandidate(asset, template, score, riskFromVolatility(annVol) - 8, [
      `ETF信号 ${s.signalScore}/100`,
      monthRet != null ? `近21日收益 ${round(monthRet)}%` : '月度收益不足',
      annVol != null ? `年化波动 ${round(annVol)}%` : '波动率不足',
      relVol != null ? `量能 ${round(relVol)} 倍` : '量能不足',
    ], '适合轮动框架下优先观察的 ETF 候选。', metrics);
  }

  return null;
};
