// AI Confidence Engine
// Combines all analysis modules to generate trade confidence scores and recommendations

import { SMCAnalysis } from './smartMoneyAnalysis'
import { MTFAnalysis } from './multiTimeframeAnalysis'

interface CandleData {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface TechnicalSignal {
  pattern: string
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  strength: 'STRONG' | 'MODERATE' | 'WEAK'
}

interface OperatorGame {
  type: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  action: 'BUY' | 'SELL' | 'AVOID' | 'WAIT'
}

interface Factor {
  name: string
  score: number // -100 to +100
  weight: number // 0-1
  description: string
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
}

export interface AIConfidence {
  // Core Scores
  tradeConfidenceScore: number // 0-100
  riskScore: number // 0-100 (higher = riskier)
  probabilityBullish: number // 0-100%
  probabilityBearish: number // 0-100%
  
  // Classification
  signalStrength: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'VERY_WEAK'
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
  timeHorizon: 'SCALP' | 'INTRADAY' | 'SWING' | 'POSITIONAL'
  
  // Detailed Analysis
  reasoning: string[]
  keyFactors: Factor[]
  warnings: string[]
  opportunities: string[]
  
  // Component Scores
  componentScores: {
    technical: number
    smc: number
    mtf: number
    operator: number
    volume: number
    momentum: number
  }
  
  // Trade Setup
  suggestedEntry: number
  suggestedTarget: number
  suggestedStopLoss: number
  riskRewardRatio: number
  positionSize: 'SMALL' | 'MEDIUM' | 'LARGE'
}

// Weights for each component
const COMPONENT_WEIGHTS = {
  technical: 0.15,
  smc: 0.25,
  mtf: 0.25,
  operator: 0.20,
  volume: 0.10,
  momentum: 0.05,
}

// Main AI Confidence Function
export function calculateAIConfidence(
  symbol: string,
  currentPrice: number,
  candles: CandleData[],
  rsi: number,
  macdSignal: string,
  technicalSignals: TechnicalSignal[],
  operatorGame: OperatorGame | null,
  operatorStrength: { score: number; sentiment: string } | null,
  smcAnalysis: SMCAnalysis | null,
  mtfAnalysis: MTFAnalysis | null
): AIConfidence {
  
  // Calculate component scores
  const technicalScore = calculateTechnicalScore(rsi, macdSignal, technicalSignals)
  const smcScore = calculateSMCScore(smcAnalysis)
  const mtfScore = calculateMTFScore(mtfAnalysis)
  const operatorScore = calculateOperatorScore(operatorGame, operatorStrength)
  const volumeScore = calculateVolumeScore(candles)
  const momentumScore = calculateMomentumScore(candles, rsi)

  // Weighted confidence score
  const tradeConfidenceScore = Math.round(
    technicalScore * COMPONENT_WEIGHTS.technical +
    smcScore * COMPONENT_WEIGHTS.smc +
    mtfScore * COMPONENT_WEIGHTS.mtf +
    operatorScore * COMPONENT_WEIGHTS.operator +
    volumeScore * COMPONENT_WEIGHTS.volume +
    momentumScore * COMPONENT_WEIGHTS.momentum
  )

  // Calculate probabilities
  const normalizedScore = (tradeConfidenceScore - 50) * 2 // Convert 0-100 to -100 to +100
  const probabilityBullish = Math.max(0, Math.min(100, 50 + normalizedScore / 2))
  const probabilityBearish = 100 - probabilityBullish

  // Risk score (inverse of confidence + volatility)
  const volatility = calculateVolatility(candles)
  const riskScore = Math.round(100 - tradeConfidenceScore * 0.7 + volatility * 0.3)

  // Signal strength
  let signalStrength: AIConfidence['signalStrength']
  if (tradeConfidenceScore > 85) signalStrength = 'VERY_STRONG'
  else if (tradeConfidenceScore > 70) signalStrength = 'STRONG'
  else if (tradeConfidenceScore > 55) signalStrength = 'MODERATE'
  else if (tradeConfidenceScore > 40) signalStrength = 'WEAK'
  else signalStrength = 'VERY_WEAK'

  // Recommendation
  const recommendation = generateRecommendation(
    tradeConfidenceScore,
    probabilityBullish,
    riskScore,
    operatorGame,
    mtfAnalysis
  )

  // Time horizon
  const timeHorizon = determineTimeHorizon(mtfAnalysis, signalStrength)

  // Key factors
  const keyFactors = identifyKeyFactors(
    technicalScore,
    smcScore,
    mtfScore,
    operatorScore,
    volumeScore,
    momentumScore,
    rsi,
    macdSignal,
    operatorGame,
    smcAnalysis,
    mtfAnalysis
  )

  // Reasoning
  const reasoning = generateReasoning(
    keyFactors,
    recommendation,
    signalStrength,
    probabilityBullish,
    tradeConfidenceScore
  )

  // Warnings & Opportunities
  const warnings = identifyWarnings(rsi, riskScore, volatility, mtfAnalysis, operatorGame)
  const opportunities = identifyOpportunities(smcAnalysis, mtfAnalysis, operatorGame, technicalSignals)

  // Trade setup
  const { suggestedEntry, suggestedTarget, suggestedStopLoss, riskRewardRatio } = calculateTradeSetup(
    currentPrice,
    recommendation,
    smcAnalysis,
    mtfAnalysis,
    volatility
  )

  // Position size
  const positionSize = determinePositionSize(tradeConfidenceScore, riskScore, signalStrength)

  return {
    tradeConfidenceScore,
    riskScore,
    probabilityBullish,
    probabilityBearish,
    signalStrength,
    recommendation,
    timeHorizon,
    reasoning,
    keyFactors,
    warnings,
    opportunities,
    componentScores: {
      technical: technicalScore,
      smc: smcScore,
      mtf: mtfScore,
      operator: operatorScore,
      volume: volumeScore,
      momentum: momentumScore,
    },
    suggestedEntry,
    suggestedTarget,
    suggestedStopLoss,
    riskRewardRatio,
    positionSize,
  }
}

// Component Score Calculators

function calculateTechnicalScore(
  rsi: number,
  macdSignal: string,
  technicalSignals: TechnicalSignal[]
): number {
  let score = 50 // Neutral baseline

  // RSI contribution
  if (rsi > 70) score -= 15 // Overbought
  else if (rsi > 60) score += 10
  else if (rsi > 50) score += 15
  else if (rsi > 40) score += 10
  else if (rsi > 30) score -= 10
  else score += 15 // Oversold bounce potential

  // MACD contribution
  if (macdSignal === 'BULLISH') score += 15
  else if (macdSignal === 'BEARISH') score -= 15

  // Technical patterns contribution
  const bullishPatterns = technicalSignals.filter(s => s.signal === 'BULLISH')
  const bearishPatterns = technicalSignals.filter(s => s.signal === 'BEARISH')
  
  bullishPatterns.forEach(p => {
    if (p.strength === 'STRONG') score += 10
    else if (p.strength === 'MODERATE') score += 5
  })
  
  bearishPatterns.forEach(p => {
    if (p.strength === 'STRONG') score -= 10
    else if (p.strength === 'MODERATE') score -= 5
  })

  return Math.max(0, Math.min(100, score))
}

function calculateSMCScore(smcAnalysis: SMCAnalysis | null): number {
  if (!smcAnalysis) return 50

  let score = 50

  // Market structure
  if (smcAnalysis.marketStructure === 'BULLISH') score += 20
  else if (smcAnalysis.marketStructure === 'BEARISH') score -= 20

  // BOS/CHOCH
  if (smcAnalysis.bos?.type === 'BULLISH_BOS') score += 15
  else if (smcAnalysis.bos?.type === 'BEARISH_BOS') score -= 15

  if (smcAnalysis.choch?.type === 'BULLISH_CHOCH') score += 20
  else if (smcAnalysis.choch?.type === 'BEARISH_CHOCH') score -= 20

  // Liquidity sweeps
  const bullishSweeps = smcAnalysis.liquiditySweeps.filter(s => s.type === 'BULLISH').length
  const bearishSweeps = smcAnalysis.liquiditySweeps.filter(s => s.type === 'BEARISH').length
  score += bullishSweeps * 5
  score -= bearishSweeps * 5

  // Order blocks
  const bullishOB = smcAnalysis.orderBlocks.filter(ob => ob.type === 'BULLISH').length
  const bearishOB = smcAnalysis.orderBlocks.filter(ob => ob.type === 'BEARISH').length
  score += bullishOB * 5
  score -= bearishOB * 5

  return Math.max(0, Math.min(100, score))
}

function calculateMTFScore(mtfAnalysis: MTFAnalysis | null): number {
  if (!mtfAnalysis) return 50

  // Use MTF confidence and alignment
  const baseScore = mtfAnalysis.confidenceScore
  const alignmentBonus = (mtfAnalysis.alignment - 50) * 0.5

  let score = baseScore + alignmentBonus

  // Adjust based on overall trend
  if (mtfAnalysis.overallTrend === 'STRONG_BULLISH') score = Math.min(100, score + 10)
  else if (mtfAnalysis.overallTrend === 'STRONG_BEARISH') score = Math.max(0, score - 10)

  return Math.max(0, Math.min(100, score))
}

function calculateOperatorScore(
  operatorGame: OperatorGame | null,
  operatorStrength: { score: number; sentiment: string } | null
): number {
  let score = 50

  if (operatorGame) {
    if (operatorGame.action === 'BUY') {
      score += operatorGame.confidence === 'HIGH' ? 30 : 20
    } else if (operatorGame.action === 'SELL') {
      score -= operatorGame.confidence === 'HIGH' ? 30 : 20
    } else if (operatorGame.action === 'AVOID') {
      score = 30 // Low confidence
    }
  }

  if (operatorStrength) {
    // Operator strength is 0-100, normalize to contribution
    const strengthContribution = (operatorStrength.score - 50) * 0.4
    score += strengthContribution
  }

  return Math.max(0, Math.min(100, score))
}

function calculateVolumeScore(candles: CandleData[]): number {
  if (candles.length < 10) return 50

  const recent = candles.slice(-10)
  const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length
  const currentVolume = recent[recent.length - 1].volume
  const volumeRatio = currentVolume / avgVolume

  let score = 50

  // High volume on bullish candles = bullish
  const lastCandle = recent[recent.length - 1]
  const isBullish = lastCandle.close > lastCandle.open

  if (volumeRatio > 2) {
    score += isBullish ? 30 : -30
  } else if (volumeRatio > 1.5) {
    score += isBullish ? 20 : -20
  } else if (volumeRatio > 1.2) {
    score += isBullish ? 10 : -10
  } else if (volumeRatio < 0.7) {
    score -= 10 // Low volume = weak move
  }

  return Math.max(0, Math.min(100, score))
}

function calculateMomentumScore(candles: CandleData[], rsi: number): number {
  if (candles.length < 5) return 50

  const recent = candles.slice(-5)
  const priceChange = ((recent[4].close - recent[0].close) / recent[0].close) * 100

  let score = 50

  // Price momentum
  if (priceChange > 3) score += 30
  else if (priceChange > 1.5) score += 20
  else if (priceChange > 0.5) score += 10
  else if (priceChange < -3) score -= 30
  else if (priceChange < -1.5) score -= 20
  else if (priceChange < -0.5) score -= 10

  // RSI momentum
  if (rsi > 60 && priceChange > 0) score += 10
  else if (rsi < 40 && priceChange < 0) score -= 10

  return Math.max(0, Math.min(100, score))
}

function calculateVolatility(candles: CandleData[]): number {
  if (candles.length < 20) return 50

  const recent = candles.slice(-20)
  const returns = recent.slice(1).map((c, i) => 
    Math.log(c.close / recent[i].close)
  )
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  
  // Normalize to 0-100 scale (typical stdDev is 0.01-0.05)
  return Math.min(100, stdDev * 2000)
}

// Helper Functions

function generateRecommendation(
  confidence: number,
  probabilityBullish: number,
  riskScore: number,
  operatorGame: OperatorGame | null,
  mtfAnalysis: MTFAnalysis | null
): AIConfidence['recommendation'] {
  // Override for operator traps
  if (operatorGame?.type === 'BULL_TRAP' || operatorGame?.type === 'PUMP_DUMP') {
    return 'STRONG_SELL'
  }
  if (operatorGame?.type === 'BEAR_TRAP') {
    return 'STRONG_BUY'
  }

  // High risk = reduce recommendation strength
  if (riskScore > 75) {
    if (probabilityBullish > 60) return 'HOLD'
    if (probabilityBullish < 40) return 'HOLD'
  }

  // Normal recommendations
  if (confidence > 80 && probabilityBullish > 70) return 'STRONG_BUY'
  if (confidence > 65 && probabilityBullish > 60) return 'BUY'
  if (confidence > 80 && probabilityBullish < 30) return 'STRONG_SELL'
  if (confidence > 65 && probabilityBullish < 40) return 'SELL'
  
  return 'HOLD'
}

function determineTimeHorizon(
  mtfAnalysis: MTFAnalysis | null,
  signalStrength: string
): AIConfidence['timeHorizon'] {
  if (!mtfAnalysis) return 'INTRADAY'

  const htfAligned = mtfAnalysis.timeframes['1D'].trend === mtfAnalysis.timeframes['4H'].trend
  const ltfAligned = mtfAnalysis.timeframes['15m'].trend === mtfAnalysis.timeframes['1H'].trend

  if (htfAligned && signalStrength === 'VERY_STRONG') return 'POSITIONAL'
  if (htfAligned) return 'SWING'
  if (ltfAligned) return 'INTRADAY'
  return 'SCALP'
}

function identifyKeyFactors(
  technicalScore: number,
  smcScore: number,
  mtfScore: number,
  operatorScore: number,
  volumeScore: number,
  momentumScore: number,
  rsi: number,
  macdSignal: string,
  operatorGame: OperatorGame | null,
  smcAnalysis: SMCAnalysis | null,
  mtfAnalysis: MTFAnalysis | null
): Factor[] {
  const factors: Factor[] = []

  // Technical
  factors.push({
    name: 'Technical Indicators',
    score: (technicalScore - 50) * 2,
    weight: COMPONENT_WEIGHTS.technical,
    description: `RSI: ${rsi.toFixed(0)}, MACD: ${macdSignal}`,
    impact: technicalScore > 50 ? 'POSITIVE' : technicalScore < 50 ? 'NEGATIVE' : 'NEUTRAL',
  })

  // SMC
  if (smcAnalysis) {
    factors.push({
      name: 'Smart Money Concepts',
      score: (smcScore - 50) * 2,
      weight: COMPONENT_WEIGHTS.smc,
      description: `${smcAnalysis.marketStructure} structure, ${smcAnalysis.recommendation}`,
      impact: smcScore > 50 ? 'POSITIVE' : smcScore < 50 ? 'NEGATIVE' : 'NEUTRAL',
    })
  }

  // MTF
  if (mtfAnalysis) {
    factors.push({
      name: 'Multi-Timeframe Analysis',
      score: (mtfScore - 50) * 2,
      weight: COMPONENT_WEIGHTS.mtf,
      description: `${mtfAnalysis.overallTrend}, ${mtfAnalysis.alignment}% alignment`,
      impact: mtfScore > 50 ? 'POSITIVE' : mtfScore < 50 ? 'NEGATIVE' : 'NEUTRAL',
    })
  }

  // Operator
  if (operatorGame) {
    factors.push({
      name: 'Operator Activity',
      score: (operatorScore - 50) * 2,
      weight: COMPONENT_WEIGHTS.operator,
      description: `${operatorGame.type}: ${operatorGame.action}`,
      impact: operatorScore > 50 ? 'POSITIVE' : operatorScore < 50 ? 'NEGATIVE' : 'NEUTRAL',
    })
  }

  // Volume
  factors.push({
    name: 'Volume Analysis',
    score: (volumeScore - 50) * 2,
    weight: COMPONENT_WEIGHTS.volume,
    description: volumeScore > 60 ? 'High volume confirmation' : volumeScore < 40 ? 'Low volume warning' : 'Normal volume',
    impact: volumeScore > 50 ? 'POSITIVE' : volumeScore < 50 ? 'NEGATIVE' : 'NEUTRAL',
  })

  // Sort by absolute score
  return factors.sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
}

function generateReasoning(
  keyFactors: Factor[],
  recommendation: string,
  signalStrength: string,
  probabilityBullish: number,
  confidence: number
): string[] {
  const reasoning: string[] = []

  reasoning.push(`Overall Confidence: ${confidence}/100 (${signalStrength})`)
  reasoning.push(`Bullish Probability: ${probabilityBullish.toFixed(0)}%, Bearish: ${(100 - probabilityBullish).toFixed(0)}%`)
  reasoning.push(`Recommendation: ${recommendation}`)

  // Top 3 factors
  keyFactors.slice(0, 3).forEach(factor => {
    const impact = factor.impact === 'POSITIVE' ? '✅' : factor.impact === 'NEGATIVE' ? '⛔' : '⚪'
    reasoning.push(`${impact} ${factor.name}: ${factor.description}`)
  })

  return reasoning
}

function identifyWarnings(
  rsi: number,
  riskScore: number,
  volatility: number,
  mtfAnalysis: MTFAnalysis | null,
  operatorGame: OperatorGame | null
): string[] {
  const warnings: string[] = []

  if (rsi > 75) warnings.push('⚠️ RSI extremely overbought - potential reversal')
  if (rsi < 25) warnings.push('⚠️ RSI extremely oversold - high risk')
  if (riskScore > 75) warnings.push('⚠️ High risk score - use tight stop loss')
  if (volatility > 70) warnings.push('⚠️ High volatility - expect large price swings')
  
  if (mtfAnalysis && mtfAnalysis.alignment < 50) {
    warnings.push('⚠️ Low timeframe alignment - conflicting signals')
  }

  if (operatorGame?.action === 'AVOID') {
    warnings.push(`⚠️ Operator Game: ${operatorGame.type} - Stay away!`)
  }

  return warnings
}

function identifyOpportunities(
  smcAnalysis: SMCAnalysis | null,
  mtfAnalysis: MTFAnalysis | null,
  operatorGame: OperatorGame | null,
  technicalSignals: TechnicalSignal[]
): string[] {
  const opportunities: string[] = []

  if (smcAnalysis?.choch) {
    opportunities.push(`🎯 Change of Character detected - potential trend reversal`)
  }

  if (smcAnalysis?.bos) {
    opportunities.push(`🎯 Break of Structure - trend continuation confirmed`)
  }

  if (mtfAnalysis && mtfAnalysis.alignment > 80) {
    opportunities.push(`🎯 Strong timeframe alignment (${mtfAnalysis.alignment}%) - high probability setup`)
  }

  if (operatorGame?.type === 'BEAR_TRAP') {
    opportunities.push(`🎯 Bear Trap detected - excellent buy opportunity`)
  }

  if (operatorGame?.type === 'ACCUMULATION') {
    opportunities.push(`🎯 Operator accumulation - get in before breakout`)
  }

  const strongBullish = technicalSignals.filter(s => s.signal === 'BULLISH' && s.strength === 'STRONG')
  if (strongBullish.length >= 2) {
    opportunities.push(`🎯 Multiple strong bullish patterns detected`)
  }

  return opportunities
}

function calculateTradeSetup(
  currentPrice: number,
  recommendation: string,
  smcAnalysis: SMCAnalysis | null,
  mtfAnalysis: MTFAnalysis | null,
  volatility: number
): {
  suggestedEntry: number
  suggestedTarget: number
  suggestedStopLoss: number
  riskRewardRatio: number
} {
  const isBullish = recommendation.includes('BUY')
  const volatilityMultiplier = 1 + (volatility / 100) * 0.5

  let entry = currentPrice
  let target = currentPrice
  let stopLoss = currentPrice

  if (isBullish) {
    // Use SMC support as entry if available
    if (smcAnalysis && smcAnalysis.orderBlocks.length > 0) {
      const bullishOB = smcAnalysis.orderBlocks.find(ob => ob.type === 'BULLISH')
      if (bullishOB && bullishOB.low < currentPrice) {
        entry = (bullishOB.low + bullishOB.high) / 2
      }
    }

    // Use MTF resistance as target
    if (mtfAnalysis && mtfAnalysis.keyLevels.resistance.length > 0) {
      target = mtfAnalysis.keyLevels.resistance[0]
    } else {
      target = currentPrice * (1 + 0.03 * volatilityMultiplier)
    }

    // Use MTF support as stop loss
    if (mtfAnalysis && mtfAnalysis.keyLevels.support.length > 0) {
      stopLoss = mtfAnalysis.keyLevels.support[mtfAnalysis.keyLevels.support.length - 1]
    } else {
      stopLoss = currentPrice * (1 - 0.015 * volatilityMultiplier)
    }
  } else if (recommendation.includes('SELL')) {
    // Bearish setup
    if (smcAnalysis && smcAnalysis.orderBlocks.length > 0) {
      const bearishOB = smcAnalysis.orderBlocks.find(ob => ob.type === 'BEARISH')
      if (bearishOB && bearishOB.high > currentPrice) {
        entry = (bearishOB.low + bearishOB.high) / 2
      }
    }

    if (mtfAnalysis && mtfAnalysis.keyLevels.support.length > 0) {
      target = mtfAnalysis.keyLevels.support[mtfAnalysis.keyLevels.support.length - 1]
    } else {
      target = currentPrice * (1 - 0.03 * volatilityMultiplier)
    }

    if (mtfAnalysis && mtfAnalysis.keyLevels.resistance.length > 0) {
      stopLoss = mtfAnalysis.keyLevels.resistance[0]
    } else {
      stopLoss = currentPrice * (1 + 0.015 * volatilityMultiplier)
    }
  } else {
    // HOLD - no setup
    return {
      suggestedEntry: currentPrice,
      suggestedTarget: currentPrice,
      suggestedStopLoss: currentPrice,
      riskRewardRatio: 0,
    }
  }

  const risk = Math.abs(entry - stopLoss)
  const reward = Math.abs(target - entry)
  const riskRewardRatio = risk > 0 ? reward / risk : 0

  return {
    suggestedEntry: Math.round(entry * 100) / 100,
    suggestedTarget: Math.round(target * 100) / 100,
    suggestedStopLoss: Math.round(stopLoss * 100) / 100,
    riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
  }
}

function determinePositionSize(
  confidence: number,
  riskScore: number,
  signalStrength: string
): AIConfidence['positionSize'] {
  if (confidence > 80 && riskScore < 40 && signalStrength === 'VERY_STRONG') {
    return 'LARGE'
  }
  if (confidence > 65 && riskScore < 60) {
    return 'MEDIUM'
  }
  return 'SMALL'
}
