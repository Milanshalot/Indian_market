// Multi-Timeframe Analysis Engine
// Analyzes 6 timeframes (1m, 5m, 15m, 1H, 4H, 1D) for trend alignment and confluence

import axios from 'axios'
import { RSI, MACD, EMA } from 'technicalindicators'

interface CandleData {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
}

interface TimeframeSignal {
  timeframe: '1m' | '5m' | '15m' | '1H' | '4H' | '1D'
  trend: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH'
  score: number // -100 to +100
  rsi: number
  macd: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  ema: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  priceAction: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  volume: 'HIGH' | 'NORMAL' | 'LOW'
  confidence: number // 0-100
}

interface HeatmapCell {
  timeframe: string
  indicator: string
  value: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  color: string
}

export interface MTFAnalysis {
  symbol: string
  currentPrice: number
  timeframes: {
    '1m': TimeframeSignal
    '5m': TimeframeSignal
    '15m': TimeframeSignal
    '1H': TimeframeSignal
    '4H': TimeframeSignal
    '1D': TimeframeSignal
  }
  overallTrend: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH'
  confidenceScore: number // 0-100
  alignment: number // 0-100% (how many timeframes agree)
  heatmapMatrix: HeatmapCell[][]
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
  reasoning: string[]
  keyLevels: {
    support: number[]
    resistance: number[]
  }
}

// Timeframe weights for scoring
const TIMEFRAME_WEIGHTS = {
  '1m': 0.03,
  '5m': 0.07,
  '15m': 0.15,
  '1H': 0.20,
  '4H': 0.25,
  '1D': 0.30,
}

// Main MTF Analysis Function
export async function analyzeMultiTimeframe(symbol: string): Promise<MTFAnalysis> {
  try {
    // Fetch data for all timeframes
    const timeframeData = await fetchAllTimeframes(symbol)
    
    // Analyze each timeframe
    const timeframes = {
      '1m': analyzeTimeframe(timeframeData['1m'], '1m'),
      '5m': analyzeTimeframe(timeframeData['5m'], '5m'),
      '15m': analyzeTimeframe(timeframeData['15m'], '15m'),
      '1H': analyzeTimeframe(timeframeData['1H'], '1H'),
      '4H': analyzeTimeframe(timeframeData['4H'], '4H'),
      '1D': analyzeTimeframe(timeframeData['1D'], '1D'),
    }

    // Calculate overall metrics
    const overallTrend = calculateOverallTrend(timeframes)
    const confidenceScore = calculateConfidenceScore(timeframes)
    const alignment = calculateAlignment(timeframes)
    const heatmapMatrix = generateHeatmap(timeframes)
    const recommendation = generateRecommendation(timeframes, overallTrend, confidenceScore)
    const reasoning = generateReasoning(timeframes, overallTrend, alignment)
    const keyLevels = identifyKeyLevels(timeframeData)

    const currentPrice = timeframeData['1D'][timeframeData['1D'].length - 1]?.close || 0

    return {
      symbol,
      currentPrice,
      timeframes,
      overallTrend,
      confidenceScore,
      alignment,
      heatmapMatrix,
      recommendation,
      reasoning,
      keyLevels,
    }
  } catch (error) {
    console.error('MTF Analysis error:', error)
    return getDefaultMTFAnalysis(symbol)
  }
}

// Fetch data for all timeframes
async function fetchAllTimeframes(symbol: string): Promise<Record<string, CandleData[]>> {
  const intervals = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '1H': '1h',
    '4H': '1h', // Will aggregate
    '1D': '1d',
  }

  const ranges = {
    '1m': '1d',
    '5m': '5d',
    '15m': '5d',
    '1H': '1mo',
    '4H': '3mo',
    '1D': '1y',
  }

  const data: Record<string, CandleData[]> = {}

  for (const [tf, interval] of Object.entries(intervals)) {
    try {
      const range = ranges[tf as keyof typeof ranges]
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=${interval}&range=${range}`
      
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000,
      })

      const result = response.data.chart.result[0]
      const timestamps = result.timestamp
      const quote = result.indicators.quote[0]

      let candles = timestamps.map((ts: number, idx: number) => ({
        open: quote.open[idx] || 0,
        high: quote.high[idx] || 0,
        low: quote.low[idx] || 0,
        close: quote.close[idx] || 0,
        volume: quote.volume[idx] || 0,
        timestamp: ts,
      })).filter((c: CandleData) => c.close > 0)

      // Aggregate 1H to 4H if needed
      if (tf === '4H') {
        candles = aggregateTo4H(candles)
      }

      data[tf] = candles
    } catch (error) {
      console.error(`Failed to fetch ${tf} data:`, error)
      data[tf] = []
    }
  }

  return data
}

// Aggregate 1H candles to 4H
function aggregateTo4H(candles: CandleData[]): CandleData[] {
  const aggregated: CandleData[] = []
  
  for (let i = 0; i < candles.length; i += 4) {
    const chunk = candles.slice(i, i + 4)
    if (chunk.length === 0) continue

    aggregated.push({
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0),
      timestamp: chunk[0].timestamp,
    })
  }

  return aggregated
}

// Analyze single timeframe
function analyzeTimeframe(candles: CandleData[], timeframe: string): TimeframeSignal {
  if (candles.length < 20) {
    return getDefaultTimeframeSignal(timeframe as any)
  }

  const closes = candles.map(c => c.close)
  const volumes = candles.map(c => c.volume)

  // RSI Analysis
  let rsi = 50
  if (closes.length >= 14) {
    const rsiValues = RSI.calculate({ values: closes, period: 14 })
    rsi = rsiValues[rsiValues.length - 1] || 50
  }

  // MACD Analysis
  let macd: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
  if (closes.length >= 26) {
    const macdValues = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    })
    if (macdValues.length > 0) {
      const lastMACD = macdValues[macdValues.length - 1]
      if (lastMACD && lastMACD.MACD && lastMACD.signal) {
        macd = lastMACD.MACD > lastMACD.signal ? 'BULLISH' : 'BEARISH'
      }
    }
  }

  // EMA Analysis (20, 50)
  let ema: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
  if (closes.length >= 50) {
    const ema20 = EMA.calculate({ values: closes, period: 20 })
    const ema50 = EMA.calculate({ values: closes, period: 50 })
    
    if (ema20.length > 0 && ema50.length > 0) {
      const lastEMA20 = ema20[ema20.length - 1]
      const lastEMA50 = ema50[ema50.length - 1]
      const currentPrice = closes[closes.length - 1]
      
      if (currentPrice > lastEMA20 && lastEMA20 > lastEMA50) {
        ema = 'BULLISH'
      } else if (currentPrice < lastEMA20 && lastEMA20 < lastEMA50) {
        ema = 'BEARISH'
      }
    }
  }

  // Price Action Analysis
  const recent = candles.slice(-10)
  let bullishCandles = 0
  let bearishCandles = 0
  
  recent.forEach(c => {
    if (c.close > c.open) bullishCandles++
    else if (c.close < c.open) bearishCandles++
  })

  const priceAction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 
    bullishCandles > 6 ? 'BULLISH' : 
    bearishCandles > 6 ? 'BEARISH' : 'NEUTRAL'

  // Volume Analysis
  const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length
  const recentVolume = volumes.slice(-5).reduce((sum, v) => sum + v, 0) / 5
  const volume: 'HIGH' | 'NORMAL' | 'LOW' = 
    recentVolume > avgVolume * 1.5 ? 'HIGH' : 
    recentVolume < avgVolume * 0.7 ? 'LOW' : 'NORMAL'

  // Calculate Score (-100 to +100)
  let score = 0
  
  // RSI contribution
  if (rsi > 70) score -= 20
  else if (rsi > 60) score += 10
  else if (rsi > 50) score += 5
  else if (rsi > 40) score -= 5
  else if (rsi > 30) score -= 10
  else score += 20 // Oversold bounce

  // MACD contribution
  if (macd === 'BULLISH') score += 20
  else if (macd === 'BEARISH') score -= 20

  // EMA contribution
  if (ema === 'BULLISH') score += 25
  else if (ema === 'BEARISH') score -= 25

  // Price Action contribution
  if (priceAction === 'BULLISH') score += 20
  else if (priceAction === 'BEARISH') score -= 20

  // Volume contribution
  if (volume === 'HIGH' && score > 0) score += 15
  else if (volume === 'HIGH' && score < 0) score -= 15

  score = Math.max(-100, Math.min(100, score))

  // Determine Trend
  let trend: TimeframeSignal['trend'] = 'NEUTRAL'
  if (score > 60) trend = 'STRONG_BULLISH'
  else if (score > 20) trend = 'BULLISH'
  else if (score < -60) trend = 'STRONG_BEARISH'
  else if (score < -20) trend = 'BEARISH'

  // Calculate Confidence
  const indicators = [macd, ema, priceAction].filter(i => i !== 'NEUTRAL').length
  const confidence = Math.min(100, Math.abs(score) + (indicators * 10))

  return {
    timeframe: timeframe as any,
    trend,
    score,
    rsi,
    macd,
    ema,
    priceAction,
    volume,
    confidence,
  }
}

// Calculate Overall Trend (Weighted)
function calculateOverallTrend(timeframes: Record<string, TimeframeSignal>): MTFAnalysis['overallTrend'] {
  let weightedScore = 0

  Object.entries(timeframes).forEach(([tf, signal]) => {
    const weight = TIMEFRAME_WEIGHTS[tf as keyof typeof TIMEFRAME_WEIGHTS]
    weightedScore += signal.score * weight
  })

  if (weightedScore > 60) return 'STRONG_BULLISH'
  if (weightedScore > 20) return 'BULLISH'
  if (weightedScore < -60) return 'STRONG_BEARISH'
  if (weightedScore < -20) return 'BEARISH'
  return 'NEUTRAL'
}

// Calculate Confidence Score
function calculateConfidenceScore(timeframes: Record<string, TimeframeSignal>): number {
  let weightedConfidence = 0

  Object.entries(timeframes).forEach(([tf, signal]) => {
    const weight = TIMEFRAME_WEIGHTS[tf as keyof typeof TIMEFRAME_WEIGHTS]
    weightedConfidence += signal.confidence * weight
  })

  return Math.round(weightedConfidence)
}

// Calculate Alignment (% of timeframes agreeing)
function calculateAlignment(timeframes: Record<string, TimeframeSignal>): number {
  const trends = Object.values(timeframes).map(tf => tf.trend)
  
  const bullish = trends.filter(t => t === 'BULLISH' || t === 'STRONG_BULLISH').length
  const bearish = trends.filter(t => t === 'BEARISH' || t === 'STRONG_BEARISH').length
  const neutral = trends.filter(t => t === 'NEUTRAL').length

  const maxAlignment = Math.max(bullish, bearish, neutral)
  return Math.round((maxAlignment / trends.length) * 100)
}

// Generate Heatmap Matrix
function generateHeatmap(timeframes: Record<string, TimeframeSignal>): HeatmapCell[][] {
  const indicators = ['Trend', 'RSI', 'MACD', 'EMA', 'Price Action', 'Volume']
  const timeframeOrder = ['1D', '4H', '1H', '15m', '5m', '1m']

  const matrix: HeatmapCell[][] = []

  indicators.forEach(indicator => {
    const row: HeatmapCell[] = []
    
    timeframeOrder.forEach(tf => {
      const signal = timeframes[tf as keyof typeof timeframes]
      let value: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
      let color = '#6b7280' // gray

      if (indicator === 'Trend') {
        value = signal.trend.includes('BULLISH') ? 'BULLISH' : 
                signal.trend.includes('BEARISH') ? 'BEARISH' : 'NEUTRAL'
      } else if (indicator === 'RSI') {
        value = signal.rsi > 60 ? 'BULLISH' : signal.rsi < 40 ? 'BEARISH' : 'NEUTRAL'
      } else if (indicator === 'MACD') {
        value = signal.macd
      } else if (indicator === 'EMA') {
        value = signal.ema
      } else if (indicator === 'Price Action') {
        value = signal.priceAction
      } else if (indicator === 'Volume') {
        value = signal.volume === 'HIGH' ? (signal.score > 0 ? 'BULLISH' : 'BEARISH') : 'NEUTRAL'
      }

      if (value === 'BULLISH') color = '#10b981' // green
      else if (value === 'BEARISH') color = '#ef4444' // red

      row.push({ timeframe: tf, indicator, value, color })
    })

    matrix.push(row)
  })

  return matrix
}

// Generate Recommendation
function generateRecommendation(
  timeframes: Record<string, TimeframeSignal>,
  overallTrend: string,
  confidenceScore: number
): MTFAnalysis['recommendation'] {
  const higherTFScore = (timeframes['1D'].score + timeframes['4H'].score + timeframes['1H'].score) / 3

  if (overallTrend === 'STRONG_BULLISH' && confidenceScore > 70) return 'STRONG_BUY'
  if (overallTrend === 'BULLISH' || (overallTrend === 'STRONG_BULLISH' && confidenceScore > 50)) return 'BUY'
  if (overallTrend === 'STRONG_BEARISH' && confidenceScore > 70) return 'STRONG_SELL'
  if (overallTrend === 'BEARISH' || (overallTrend === 'STRONG_BEARISH' && confidenceScore > 50)) return 'SELL'
  
  // Check higher timeframes for direction
  if (higherTFScore > 40) return 'BUY'
  if (higherTFScore < -40) return 'SELL'
  
  return 'HOLD'
}

// Generate Reasoning
function generateReasoning(
  timeframes: Record<string, TimeframeSignal>,
  overallTrend: string,
  alignment: number
): string[] {
  const reasoning: string[] = []

  // Overall trend
  reasoning.push(`Overall trend: ${overallTrend.replace('_', ' ')} with ${alignment}% timeframe alignment`)

  // Higher timeframe analysis
  const dailyTrend = timeframes['1D'].trend
  const fourHourTrend = timeframes['4H'].trend
  
  if (dailyTrend.includes('BULLISH') && fourHourTrend.includes('BULLISH')) {
    reasoning.push('✅ Higher timeframes (1D, 4H) aligned bullish - strong uptrend')
  } else if (dailyTrend.includes('BEARISH') && fourHourTrend.includes('BEARISH')) {
    reasoning.push('⚠️ Higher timeframes (1D, 4H) aligned bearish - strong downtrend')
  } else {
    reasoning.push('⚖️ Higher timeframes showing divergence - wait for clarity')
  }

  // RSI analysis
  const dailyRSI = timeframes['1D'].rsi
  if (dailyRSI > 70) {
    reasoning.push(`📊 Daily RSI at ${dailyRSI.toFixed(0)} - overbought, potential pullback`)
  } else if (dailyRSI < 30) {
    reasoning.push(`📊 Daily RSI at ${dailyRSI.toFixed(0)} - oversold, potential bounce`)
  }

  // MACD confluence
  const bullishMACD = Object.values(timeframes).filter(tf => tf.macd === 'BULLISH').length
  const bearishMACD = Object.values(timeframes).filter(tf => tf.macd === 'BEARISH').length
  
  if (bullishMACD >= 4) {
    reasoning.push(`🚀 ${bullishMACD}/6 timeframes show bullish MACD - strong momentum`)
  } else if (bearishMACD >= 4) {
    reasoning.push(`📉 ${bearishMACD}/6 timeframes show bearish MACD - weak momentum`)
  }

  // Volume analysis
  const highVolume = Object.values(timeframes).filter(tf => tf.volume === 'HIGH').length
  if (highVolume >= 3) {
    reasoning.push(`📢 High volume detected across ${highVolume} timeframes - strong conviction`)
  }

  return reasoning
}

// Identify Key Support/Resistance Levels
function identifyKeyLevels(timeframeData: Record<string, CandleData[]>): { support: number[]; resistance: number[] } {
  const dailyCandles = timeframeData['1D']
  if (dailyCandles.length < 50) {
    return { support: [], resistance: [] }
  }

  const recent = dailyCandles.slice(-50)
  const highs = recent.map(c => c.high)
  const lows = recent.map(c => c.low)

  // Find swing highs (resistance)
  const resistance: number[] = []
  for (let i = 2; i < highs.length - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] &&
        highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      resistance.push(highs[i])
    }
  }

  // Find swing lows (support)
  const support: number[] = []
  for (let i = 2; i < lows.length - 2; i++) {
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] &&
        lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      support.push(lows[i])
    }
  }

  // Return top 3 of each
  return {
    support: support.sort((a, b) => b - a).slice(0, 3),
    resistance: resistance.sort((a, b) => a - b).slice(0, 3),
  }
}

// Default signals
function getDefaultTimeframeSignal(timeframe: TimeframeSignal['timeframe']): TimeframeSignal {
  return {
    timeframe,
    trend: 'NEUTRAL',
    score: 0,
    rsi: 50,
    macd: 'NEUTRAL',
    ema: 'NEUTRAL',
    priceAction: 'NEUTRAL',
    volume: 'NORMAL',
    confidence: 0,
  }
}

function getDefaultMTFAnalysis(symbol: string): MTFAnalysis {
  return {
    symbol,
    currentPrice: 0,
    timeframes: {
      '1m': getDefaultTimeframeSignal('1m'),
      '5m': getDefaultTimeframeSignal('5m'),
      '15m': getDefaultTimeframeSignal('15m'),
      '1H': getDefaultTimeframeSignal('1H'),
      '4H': getDefaultTimeframeSignal('4H'),
      '1D': getDefaultTimeframeSignal('1D'),
    },
    overallTrend: 'NEUTRAL',
    confidenceScore: 0,
    alignment: 0,
    heatmapMatrix: [],
    recommendation: 'HOLD',
    reasoning: ['Insufficient data for multi-timeframe analysis'],
    keyLevels: { support: [], resistance: [] },
  }
}
