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
  { id: 'breakout', name: '突破扫描', description: '寻找接近或突破关键阻力位、量价共振的候选标的。', objective: '发现有趋势加速潜力的右侧机会。' },
  { id: 'volume-surge', name: '放量扫描', description: '聚焦近期相对量能显著放大、资金参与度提升的标的。', objective: '捕捉短期资金明显回流的异动方向。' },
  { id: 'oversold-rebound', name: '超跌修复扫描', description: '寻找经历回撤后接近支撑、动量开始修复的标的。', objective: '提前锁定可能出现技术性修复的反弹候选。' },
  { id: 'trend-follow', name: '趋势延续扫描', description: '筛选均线结构健康、趋势分数较高的强势延续标的。', objective: '服务波段和中线趋势跟踪。' },
  { id: 'etf-rotation', name: 'ETF 轮动扫描', description: '只在 ETF 与指数代理资产里选相对强势、低波动的轮动目标。', objective: '给轮动策略和防守型仓位提供优先候选。' },
];

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
  { symbol: 'NFLX', name: 'Netflix, Inc.', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'PLTR', name: 'Palantir Technologies', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'CRM', name: 'Salesforce, Inc.', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor ADR', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'BABA', name: 'Alibaba Group ADR', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'PDD', name: 'PDD Holdings', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'JPM', name: 'JPMorgan Chase', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'COIN', name: 'Coinbase Global', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'MSTR', name: 'MicroStrategy', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'ARM', name: 'Arm Holdings', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: 'SMCI', name: 'Super Micro Computer', market: 'US', assetClass: 'equity', source: 'core' },
  { symbol: '600519.SS', name: '贵州茅台', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '000858.SZ', name: '五粮液', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '300750.SZ', name: '宁德时代', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '002594.SZ', name: '比亚迪', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '601318.SS', name: '中国平安', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '600036.SS', name: '招商银行', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '601899.SS', name: '紫金矿业', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '300059.SZ', name: '东方财富', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '688981.SS', name: '中芯国际', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '300308.SZ', name: '中际旭创', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '601398.SS', name: '工商银行', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '600900.SS', name: '长江电力', market: 'CN', assetClass: 'equity', source: 'core' },
  { symbol: '0700.HK', name: '腾讯控股', market: 'HK', assetClass: 'equity', source: 'core' },
  { symbol: '9988.HK', name: '阿里巴巴-SW', market: 'HK', assetClass: 'equity', source: 'core' },
  { symbol: '3690.HK', name: '美团-W', market: 'HK', assetClass: 'equity', source: 'core' },
  { symbol: '1810.HK', name: '小米集团-W', market: 'HK', assetClass: 'equity', source: 'core' },
  { symbol: '1211.HK', name: '比亚迪股份', market: 'HK', assetClass: 'equity', source: 'core' },
  { symbol: '9618.HK', name: '京东集团-SW', market: 'HK', assetClass: 'equity', source: 'core' },
  { symbol: '2382.HK', name: '舜宇光学科技', market: 'HK', assetClass: 'equity', source: 'core' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'QQQ', name: 'Invesco QQQ', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'DIA', name: 'SPDR Dow Jones ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'SLV', name: 'iShares Silver Trust', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'SOXX', name: 'iShares Semiconductor ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'SMH', name: 'VanEck Semiconductor ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
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
  { symbol: 'IBIT', name: 'iShares Bitcoin Trust ETF', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'USO', name: 'United States Oil Fund', market: 'ETF', assetClass: 'etf', source: 'core' },
  { symbol: 'BTC-USD', name: 'Bitcoin', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
  { symbol: 'ETH-USD', name: 'Ethereum', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
  { symbol: 'SOL-USD', name: 'Solana', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
  { symbol: 'BNB-USD', name: 'BNB', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
  { symbol: 'XRP-USD', name: 'XRP', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
  { symbol: 'DOGE-USD', name: 'Dogecoin', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
  { symbol: 'ADA-USD', name: 'Cardano', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
  { symbol: 'AVAX-USD', name: 'Avalanche', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
  { symbol: 'SUI-USD', name: 'Sui', market: 'CRYPTO', assetClass: 'crypto', source: 'core' },
];

/* ---- Dynamic discovery (fire-and-forget background refresh) ---- */

const DISCOVERY_TTL = 10 * 60 * 1000;
let discoveryAssets: ScannerUniverseAsset[] = [];
let discoveryFetchedAt = 0;

const inferMarket = (s: string): ScannerMarket => {
  if (s.endsWith('.SS') || s.endsWith('.SZ')) return 'CN';
  if (s.endsWith('.HK')) return 'HK';
  if (s.endsWith('-USD')) return 'CRYPTO';
  return 'US';
};

const inferAssetClass = (s: string): 'equity' | 'etf' | 'crypto' => {
  if (s.endsWith('-USD')) return 'crypto';
  const ETF_SET = 'SPY,QQQ,IWM,DIA,TLT,GLD,SLV,SOXX,SMH,ARKK,KWEB,HYG,VNQ,EEM,EFA,IBIT,BITO,USO,VWO,VOO,VTI,XLE,XLK,XLF,XLV,XLY,XLI,XLP,XLU,XLB,XLRE,ARKW,ARKG,FXI,GDX,XBI,IBB,KRE,SOXL,TQQQ,JEPI,SCHD';
  if (ETF_SET.split(',').includes(s.toUpperCase())) return 'etf';
  return 'equity';
};

const safeFetch = async (url: string, headers?: Record<string, string>): Promise<any> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; } finally { clearTimeout(timer); }
};

const refreshDiscovery = async () => {
  const all: ScannerUniverseAsset[] = [];

  // Yahoo trending
  try {
    const json = await safeFetch('https://query1.finance.yahoo.com/v1/finance/trending/US?count=25', { 'User-Agent': 'Mozilla/5.0' });
    const quotes = json?.finance?.result?.[0]?.quotes || [];
    for (const q of quotes) {
      if (q?.symbol) all.push({ symbol: q.symbol, name: q.symbol, market: inferMarket(q.symbol), assetClass: inferAssetClass(q.symbol), source: 'discovery' });
    }
  } catch {}

  // Yahoo day gainers
  try {
    const json = await safeFetch('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers&count=15', { 'User-Agent': 'Mozilla/5.0' });
    const quotes = json?.finance?.result?.[0]?.quotes || [];
    for (const q of quotes) {
      if (q?.symbol && (q?.marketCap ?? 0) > 1e9) all.push({ symbol: q.symbol, name: q.shortName || q.symbol, market: inferMarket(q.symbol), assetClass: inferAssetClass(q.symbol), source: 'discovery' });
    }
  } catch {}

  // Yahoo most actives
  try {
    const json = await safeFetch('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=15', { 'User-Agent': 'Mozilla/5.0' });
    const quotes = json?.finance?.result?.[0]?.quotes || [];
    for (const q of quotes) {
      if (q?.symbol && (q?.marketCap ?? 0) > 1e9) all.push({ symbol: q.symbol, name: q.shortName || q.symbol, market: inferMarket(q.symbol), assetClass: inferAssetClass(q.symbol), source: 'discovery' });
    }
  } catch {}

  // Yahoo active ETFs
  try {
    const json = await safeFetch('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives_etfs&count=15', { 'User-Agent': 'Mozilla/5.0' });
    const quotes = json?.finance?.result?.[0]?.quotes || [];
    for (const q of quotes) {
      if (q?.symbol) all.push({ symbol: q.symbol, name: q.shortName || q.symbol, market: 'ETF', assetClass: 'etf', source: 'discovery' });
    }
  } catch {}

  // Eastmoney A-share gainers
  try {
    const url = `https://push2.eastmoney.com/api/qt/clist/get?fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fid=f3&po=1&pn=1&pz=15&fields=f12,f14`;
    const json = await safeFetch(url);
    const items = json?.data?.diff || [];
    for (const item of items) {
      if (item?.f12 && item?.f14) {
        const code = String(item.f12);
        const suffix = code.startsWith('6') || code.startsWith('9') ? '.SS' : '.SZ';
        all.push({ symbol: `${code}${suffix}`, name: String(item.f14), market: 'CN', assetClass: 'equity', source: 'discovery' });
      }
    }
  } catch {}

  // CoinGecko trending
  try {
    const json = await safeFetch('https://api.coingecko.com/api/v3/search/trending');
    const coins = json?.coins || [];
    for (const entry of coins.slice(0, 8)) {
      const coin = entry?.item;
      if (coin?.symbol) {
        all.push({ symbol: `${String(coin.symbol).toUpperCase()}-USD`, name: coin.name || coin.symbol, market: 'CRYPTO', assetClass: 'crypto', source: 'discovery' });
      }
    }
  } catch {}

  discoveryAssets = all;
  discoveryFetchedAt = Date.now();
  console.log(`🔍 Dynamic discovery: ${all.length} assets found`);
};

/** Trigger background refresh if stale (non-blocking) */
const ensureDiscovery = () => {
  if (Date.now() - discoveryFetchedAt > DISCOVERY_TTL) {
    refreshDiscovery().catch(() => {});
  }
};

/* ---- Public API (all synchronous) ---- */

export const getScannerUniverse = (markets?: ScannerMarket[]): ScannerUniverseAsset[] => {
  ensureDiscovery();
  const seen = new Set<string>();
  const merged: ScannerUniverseAsset[] = [];
  for (const a of coreUniverse) { if (!seen.has(a.symbol)) { seen.add(a.symbol); merged.push(a); } }
  for (const a of discoveryAssets) { if (!seen.has(a.symbol)) { seen.add(a.symbol); merged.push(a); } }
  if (markets && markets.length > 0) {
    const s = new Set(markets);
    return merged.filter((a) => s.has(a.market));
  }
  return merged;
};

/* ---- Evaluation logic (unchanged) ---- */

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round = (v: number, d = 2) => Number(v.toFixed(d));

const riskFromVolatility = (vol: number | null) => {
  if (vol == null) return 45;
  if (vol >= 80) return 88;
  if (vol >= 60) return 74;
  if (vol >= 40) return 56;
  if (vol >= 25) return 40;
  return 28;
};

const createCandidate = (
  asset: ScannerUniverseAsset, template: ScannerTemplate,
  opportunityScore: number, riskScore: number,
  reasons: string[], summary: string, metrics: ScannerCandidate['metrics'],
): ScannerCandidate => ({
  symbol: asset.symbol, name: asset.name, market: asset.market, assetClass: asset.assetClass,
  templateId: template.id, templateName: template.name,
  opportunityScore: clamp(Math.round(opportunityScore), 0, 100),
  riskScore: clamp(Math.round(riskScore), 0, 100),
  actionBias: opportunityScore >= 78 ? 'execute' : opportunityScore >= 62 ? 'prepare' : 'watch',
  summary, reasons: reasons.slice(0, 4), metrics,
});

export const evaluateScannerTemplate = (
  templateId: ScannerTemplateId, asset: ScannerUniverseAsset, packet: AnalysisPacket,
  quote: { regularMarketPrice?: number; regularMarketChangePercent?: number },
) => {
  const template = scannerTemplates.find((i) => i.id === templateId);
  if (!template) return null;
  const s = packet.snapshot;
  const price = quote.regularMarketPrice ?? s.price ?? 0;
  const chg = quote.regularMarketChangePercent ?? s.changePercent ?? 0;
  const rsi = s.momentum.rsi14, rv = s.volume.relativeVolume, av = s.volatility.annualizedVolatility;
  const wr = s.returns.week, mr = s.returns.month;
  const res = s.supportResistance.resistance, sup = s.supportResistance.support, ts = s.trend.score;
  const dR = res && price ? ((res - price) / price) * 100 : null;
  const dS = sup && price ? ((price - sup) / price) * 100 : null;
  const m = { price: round(price), changePercent: round(chg), signalScore: s.signalScore,
    rsi14: rsi == null ? null : round(rsi), relativeVolume: rv == null ? null : round(rv),
    annualizedVolatility: av == null ? null : round(av), weekReturn: wr == null ? null : round(wr), monthReturn: mr == null ? null : round(mr) };

  if (templateId === 'breakout') {
    const sc = (s.signalScore*0.45)+((rv??0)*14)+((mr??0)*0.9)+((dR!=null&&dR<=2.5)?16:0)+(chg>0?8:-8);
    return createCandidate(asset,template,sc,riskFromVolatility(av),[`信号${s.signalScore}/100 ${s.trend.regime}`,rv!=null?`量能${round(rv)}倍`:'量能不足',dR!=null?`距阻力${round(dR)}%`:'阻力不足',mr!=null?`21日${round(mr)}%`:'月收益不足'],'接近关键阻力位且量能放大，适合右侧突破观察。',m);
  }
  if (templateId === 'volume-surge') {
    const sc = (s.signalScore*0.35)+((rv??0)*20)+(chg*2.2)+((wr??0)*0.7);
    return createCandidate(asset,template,sc,riskFromVolatility(av)+6,[rv!=null?`量能${round(rv)}倍`:'量能不足',`涨跌${round(chg)}%`,wr!=null?`5日${round(wr)}%`:'5日不足',`信号${s.signalScore}`],'短线资金参与度提升，适合观察持续异动。',m);
  }
  if (templateId === 'oversold-rebound') {
    const sc = ((rsi!=null?clamp(55-rsi,0,30):0)*1.6)+((dS!=null&&dS<=4)?14:0)+((mr!=null&&mr<0)?Math.abs(mr)*0.7:0)+(s.signalScore*0.25);
    return createCandidate(asset,template,sc,riskFromVolatility(av)+10,[rsi!=null?`RSI${round(rsi)}`:'RSI不足',dS!=null?`距支撑${round(dS)}%`:'支撑不足',mr!=null?`21日${round(mr)}%`:'月收益不足',`趋势${s.trend.regime}`],'经历回撤后靠近支撑，适合超跌修复窗口。',m);
  }
  if (templateId === 'trend-follow') {
    const sc = (ts*0.45)+(s.signalScore*0.35)+((mr??0)*1.1)+((rv??1)>1?6:0);
    return createCandidate(asset,template,sc,riskFromVolatility(av),[`趋势${ts} ${s.trend.regime}`,mr!=null?`21日${round(mr)}%`:'月收益不足',rv!=null?`量能${round(rv)}倍`:'量能不足',`信号${s.signalScore}`],'均线和动量结构完整，适合趋势延续跟踪。',m);
  }
  if (templateId === 'etf-rotation') {
    if (asset.assetClass !== 'etf') return null;
    const sc = (s.signalScore*0.4)+((mr??0)*1.1)+((av!=null?clamp(55-av,0,30):10)*0.9)+((rv??0)*10);
    return createCandidate(asset,template,sc,riskFromVolatility(av)-8,[`ETF信号${s.signalScore}`,mr!=null?`21日${round(mr)}%`:'月收益不足',av!=null?`波动${round(av)}%`:'波动不足',rv!=null?`量能${round(rv)}倍`:'量能不足'],'适合轮动框架下优先观察的ETF候选。',m);
  }
  return null;
};