export type Timeframe = '1mo' | '3mo' | '6mo' | '1y';

export type AnalysisDimension =
  | 'trend'
  | 'momentum'
  | 'volatility'
  | 'volume'
  | 'supportResistance'
  | 'valuation'
  | 'macro'
  | 'quant';

export interface AnalysisPreferences {
  timeframe: Timeframe;
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  customFocus: string;
  dimensions: AnalysisDimension[];
}

export interface RawChartPoint {
  date: string | Date;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
}

export interface MarketPoint {
  date: string;
  isoDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20: number | null;
  ema20: number | null;
  ema50: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  atr14: number | null;
}

export interface IndicatorSnapshot {
  price: number;
  changePercent: number;
  trend: {
    regime: string;
    score: number;
    sma20: number | null;
    ema20: number | null;
    ema50: number | null;
  };
  momentum: {
    rsi14: number | null;
    macd: number | null;
    signal: number | null;
    histogram: number | null;
    label: string;
  };
  volatility: {
    atr14: number | null;
    annualizedVolatility: number | null;
    label: string;
  };
  volume: {
    latest: number;
    average20: number | null;
    relativeVolume: number | null;
    label: string;
  };
  supportResistance: {
    support: number | null;
    resistance: number | null;
    distanceToSupportPct: number | null;
    distanceToResistancePct: number | null;
  };
  bollinger: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
    positionLabel: string;
  };
  returns: {
    week: number | null;
    month: number | null;
    quarter: number | null;
  };
  signalScore: number;
  signalLabel: string;
  rationale: string[];
}

export interface AnalysisPacket {
  series: MarketPoint[];
  snapshot: IndicatorSnapshot;
}

const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(new Date(value));

const round = (value: number | null, digits = 2) =>
  value == null || Number.isNaN(value) ? null : Number(value.toFixed(digits));

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const sampleStdDev = (values: number[]) => {
  if (values.length < 2) return null;
  const mean = average(values);
  if (mean == null) return null;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

const calculateSMA = (values: number[], period: number) =>
  values.map((_, index) => {
    if (index + 1 < period) return null;
    const window = values.slice(index - period + 1, index + 1);
    return average(window);
  });

const calculateEMA = (values: number[], period: number) => {
  const multiplier = 2 / (period + 1);
  let previous: number | null = null;
  return values.map((value, index) => {
    if (index + 1 < period) return null;
    if (previous == null) {
      previous = average(values.slice(0, period));
      return previous;
    }
    previous = (value - previous) * multiplier + previous;
    return previous;
  });
};

const calculateRSI = (values: number[], period: number) => {
  const result: Array<number | null> = Array(values.length).fill(null);
  if (values.length <= period) return result;

  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const delta = values[index] - values[index - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let index = period + 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    const gain = Math.max(delta, 0);
    const loss = Math.max(-delta, 0);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[index] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
};

const calculateMACD = (values: number[], fast = 12, slow = 26, signalPeriod = 9) => {
  const fastEma = calculateEMA(values, fast);
  const slowEma = calculateEMA(values, slow);
  const macdLine = values.map((_, index) => {
    if (fastEma[index] == null || slowEma[index] == null) return null;
    return (fastEma[index] as number) - (slowEma[index] as number);
  });

  const validMacd = macdLine.filter((value): value is number => value != null);
  const signalValues = calculateEMA(validMacd, signalPeriod);

  let signalIndex = 0;
  const signalLine = macdLine.map((value) => {
    if (value == null) return null;
    const signal = signalValues[signalIndex];
    signalIndex += 1;
    return signal;
  });

  const histogram = macdLine.map((value, index) => {
    if (value == null || signalLine[index] == null) return null;
    return value - (signalLine[index] as number);
  });

  return { macdLine, signalLine, histogram };
};

const calculateBollinger = (values: number[], period = 20, stdMult = 2) => {
  const middle = calculateSMA(values, period);
  return values.map((_, index) => {
    if (index + 1 < period) {
      return { upper: null, middle: null, lower: null };
    }
    const window = values.slice(index - period + 1, index + 1);
    const basis = middle[index];
    const stdDev = sampleStdDev(window);
    if (basis == null || stdDev == null) {
      return { upper: null, middle: null, lower: null };
    }
    return {
      upper: basis + stdMult * stdDev,
      middle: basis,
      lower: basis - stdMult * stdDev,
    };
  });
};

const calculateATR = (points: Array<Pick<RawChartPoint, 'high' | 'low' | 'close'>>, period = 14) => {
  const trueRanges = points.map((point, index) => {
    const high = point.high ?? point.close ?? 0;
    const low = point.low ?? point.close ?? 0;
    if (index === 0) return high - low;
    const previousClose = points[index - 1].close ?? points[index - 1].high ?? high;
    return Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose));
  });

  const atr: Array<number | null> = Array(points.length).fill(null);
  if (points.length < period) return atr;
  const firstAtr = average(trueRanges.slice(0, period));
  atr[period - 1] = firstAtr;
  let previous = firstAtr;
  for (let index = period; index < points.length; index += 1) {
    if (previous == null) break;
    previous = ((previous * (period - 1)) + trueRanges[index]) / period;
    atr[index] = previous;
  }
  return atr;
};

const calcReturn = (values: number[], lookback: number) => {
  if (values.length <= lookback) return null;
  const start = values[values.length - 1 - lookback];
  const end = values[values.length - 1];
  if (!start) return null;
  return ((end - start) / start) * 100;
};

const lastValue = (values: Array<number | null>) => {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] != null) return values[index];
  }
  return null;
};

const describeTrend = (price: number, ema20: number | null, ema50: number | null, sma20: number | null) => {
  let score = 50;
  if (ema20 != null && price > ema20) score += 12;
  if (ema50 != null && price > ema50) score += 14;
  if (ema20 != null && ema50 != null && ema20 > ema50) score += 10;
  if (sma20 != null && price > sma20) score += 6;
  if (ema20 != null && price < ema20) score -= 12;
  if (ema50 != null && price < ema50) score -= 14;
  if (ema20 != null && ema50 != null && ema20 < ema50) score -= 10;

  if (score >= 70) return { regime: '强势上行', score };
  if (score >= 58) return { regime: '温和上行', score };
  if (score <= 32) return { regime: '弱势下行', score };
  if (score <= 45) return { regime: '偏弱震荡', score };
  return { regime: '区间震荡', score };
};

const buildSignalScore = (params: {
  trendScore: number;
  rsi: number | null;
  macdHistogram: number | null;
  relativeVolume: number | null;
  annualizedVolatility: number | null;
  price: number;
  support: number | null;
  resistance: number | null;
}) => {
  let score = params.trendScore;
  const rationale: string[] = [];

  if (params.rsi != null) {
    if (params.rsi >= 60 && params.rsi <= 75) {
      score += 8;
      rationale.push(`RSI ${params.rsi.toFixed(1)}，动量偏强但未极端过热。`);
    } else if (params.rsi > 75) {
      score -= 6;
      rationale.push(`RSI ${params.rsi.toFixed(1)}，短线已有明显过热迹象。`);
    } else if (params.rsi < 35) {
      score += 4;
      rationale.push(`RSI ${params.rsi.toFixed(1)}，接近超卖区域，存在反弹窗口。`);
    }
  }

  if (params.macdHistogram != null) {
    if (params.macdHistogram > 0) {
      score += 6;
      rationale.push('MACD 柱线位于零轴上方，趋势延续概率提升。');
    } else {
      score -= 6;
      rationale.push('MACD 柱线在零轴下方，短线修复仍需确认。');
    }
  }

  if (params.relativeVolume != null) {
    if (params.relativeVolume > 1.25) {
      score += 6;
      rationale.push(`量能放大至 ${params.relativeVolume.toFixed(2)} 倍，资金参与度较高。`);
    } else if (params.relativeVolume < 0.8) {
      score -= 4;
      rationale.push(`量能仅为均量的 ${params.relativeVolume.toFixed(2)} 倍，趋势说服力一般。`);
    }
  }

  if (params.annualizedVolatility != null) {
    if (params.annualizedVolatility > 55) {
      score -= 8;
      rationale.push(`年化波动率约 ${params.annualizedVolatility.toFixed(1)}%，仓位控制应更保守。`);
    } else if (params.annualizedVolatility < 30) {
      score += 4;
      rationale.push(`年化波动率约 ${params.annualizedVolatility.toFixed(1)}%，波动环境相对可控。`);
    }
  }

  if (params.support != null && params.price < params.support) {
    score -= 10;
    rationale.push('价格已跌破近端支撑位，结构需要重新确认。');
  }

  if (params.resistance != null && params.price > params.resistance) {
    score += 8;
    rationale.push('价格突破近端阻力位，存在趋势加速的可能。');
  }

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const signalLabel =
    clampedScore >= 75 ? '强势进攻' :
    clampedScore >= 60 ? '偏多跟踪' :
    clampedScore >= 45 ? '中性观察' :
    clampedScore >= 30 ? '谨慎防守' :
    '高风险回避';

  return { signalScore: clampedScore, signalLabel, rationale };
};

export const createAnalysisPacket = (rawPoints: RawChartPoint[]): AnalysisPacket => {
  const points = rawPoints
    .filter((point) => point.close != null && point.date != null)
    .map((point) => ({
      date: point.date,
      open: point.open ?? point.close ?? 0,
      high: point.high ?? point.close ?? 0,
      low: point.low ?? point.close ?? 0,
      close: point.close ?? 0,
      volume: point.volume ?? 0,
    }));

  const closes = points.map((point) => point.close);
  const volumes = points.map((point) => point.volume);
  const sma20 = calculateSMA(closes, 20);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const rsi14 = calculateRSI(closes, 14);
  const { macdLine, signalLine, histogram } = calculateMACD(closes);
  const bollinger = calculateBollinger(closes, 20, 2);
  const atr14 = calculateATR(points, 14);

  const series: MarketPoint[] = points.map((point, index) => ({
    date: formatDate(point.date),
    isoDate: new Date(point.date).toISOString(),
    open: round(point.open) ?? 0,
    high: round(point.high) ?? 0,
    low: round(point.low) ?? 0,
    close: round(point.close) ?? 0,
    volume: Math.round(point.volume),
    sma20: round(sma20[index]),
    ema20: round(ema20[index]),
    ema50: round(ema50[index]),
    rsi14: round(rsi14[index]),
    macd: round(macdLine[index], 4),
    macdSignal: round(signalLine[index], 4),
    macdHistogram: round(histogram[index], 4),
    bollingerUpper: round(bollinger[index].upper),
    bollingerMiddle: round(bollinger[index].middle),
    bollingerLower: round(bollinger[index].lower),
    atr14: round(atr14[index]),
  }));

  const latest = series[series.length - 1];
  const previousClose = series[series.length - 2]?.close ?? latest?.close ?? 0;
  const price = latest?.close ?? 0;
  const changePercent = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
  const average20Volume = average(volumes.slice(-20));
  const relativeVolume = average20Volume ? (latest?.volume ?? 0) / average20Volume : null;
  const annualizedVolatility = (() => {
    const returns = closes.slice(1).map((close, index) => Math.log(close / closes[index]));
    const stdDev = sampleStdDev(returns.slice(-30));
    return stdDev == null ? null : stdDev * Math.sqrt(252) * 100;
  })();

  const recentWindow = series.slice(-20);
  const support = recentWindow.length ? Math.min(...recentWindow.map((point) => point.low)) : null;
  const resistance = recentWindow.length ? Math.max(...recentWindow.map((point) => point.high)) : null;
  const trend = describeTrend(price, lastValue(ema20), lastValue(ema50), lastValue(sma20));
  const latestRsi = lastValue(rsi14);
  const latestMacd = lastValue(macdLine);
  const latestSignal = lastValue(signalLine);
  const latestHistogram = lastValue(histogram);
  const latestAtr = lastValue(atr14);
  const latestBollinger = bollinger[bollinger.length - 1] ?? { upper: null, middle: null, lower: null };

  const momentumLabel =
    latestRsi == null || latestMacd == null || latestSignal == null ? '数据不足' :
    latestRsi > 70 ? '过热偏强' :
    latestRsi < 30 ? '超卖观察' :
    latestMacd > latestSignal ? '动量增强' :
    '动量转弱';

  const volatilityLabel =
    annualizedVolatility == null ? '数据不足' :
    annualizedVolatility > 60 ? '高波动' :
    annualizedVolatility > 35 ? '中高波动' :
    '可控波动';

  const volumeLabel =
    relativeVolume == null ? '数据不足' :
    relativeVolume > 1.5 ? '放量突破' :
    relativeVolume > 1.0 ? '温和放量' :
    '量能一般';

  const positionLabel =
    latestBollinger.upper == null || latestBollinger.lower == null ? '数据不足' :
    price >= latestBollinger.upper ? '逼近上轨' :
    price <= latestBollinger.lower ? '靠近下轨' :
    '轨道中性';

  const { signalScore, signalLabel, rationale } = buildSignalScore({
    trendScore: trend.score,
    rsi: latestRsi,
    macdHistogram: latestHistogram,
    relativeVolume,
    annualizedVolatility,
    price,
    support,
    resistance,
  });

  return {
    series,
    snapshot: {
      price: round(price) ?? 0,
      changePercent: round(changePercent) ?? 0,
      trend: {
        regime: trend.regime,
        score: trend.score,
        sma20: round(lastValue(sma20)),
        ema20: round(lastValue(ema20)),
        ema50: round(lastValue(ema50)),
      },
      momentum: {
        rsi14: round(latestRsi),
        macd: round(latestMacd, 4),
        signal: round(latestSignal, 4),
        histogram: round(latestHistogram, 4),
        label: momentumLabel,
      },
      volatility: {
        atr14: round(latestAtr),
        annualizedVolatility: round(annualizedVolatility),
        label: volatilityLabel,
      },
      volume: {
        latest: latest?.volume ?? 0,
        average20: round(average20Volume),
        relativeVolume: round(relativeVolume),
        label: volumeLabel,
      },
      supportResistance: {
        support: round(support),
        resistance: round(resistance),
        distanceToSupportPct: support ? round(((price - support) / price) * 100) : null,
        distanceToResistancePct: resistance ? round(((resistance - price) / price) * 100) : null,
      },
      bollinger: {
        upper: round(latestBollinger.upper),
        middle: round(latestBollinger.middle),
        lower: round(latestBollinger.lower),
        positionLabel,
      },
      returns: {
        week: round(calcReturn(closes, 5)),
        month: round(calcReturn(closes, 21)),
        quarter: round(calcReturn(closes, 63)),
      },
      signalScore,
      signalLabel,
      rationale,
    },
  };
};

export const defaultPreferences: AnalysisPreferences = {
  timeframe: '6mo',
  riskProfile: 'balanced',
  customFocus: '',
  dimensions: ['trend', 'momentum', 'volume', 'supportResistance', 'quant'],
};

export const timeframeMonths: Record<Timeframe, number> = {
  '1mo': 1,
  '3mo': 3,
  '6mo': 6,
  '1y': 12,
};
