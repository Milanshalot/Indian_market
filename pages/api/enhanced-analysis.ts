// Enhanced Analysis API - Combines SMC, MTF, and AI Confidence
import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { RSI, MACD } from 'technicalindicators'
import { detectCandlestickPatterns, detectChartPatterns, analyzeBuyerSellerPressure } from '../../utils/technicalAnalysis'
import { detectOperatorGame, calculateOperatorStrength } from '../../utils/operatorAnalysis'
import { analyzeSMC } from '../../utils/smartMoneyAnalysis'
import { analyzeMultiTimeframe } from '../../utils/multiTimeframeAnalysis'
import { calculateAIConfidence } from '../../utils/aiConfidenceEngine'

interface CandleData {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp?: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { symbol } = req.query

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Symbol parameter required' })
  }

  try {
    console.log(`Fetching enhanced analysis for ${symbol}...`)

    // Fetch historical data
    const histUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1d&range=3mo`
    const histResponse = await axios.get(histUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000,
    })

    const histResult = histResponse.data.chart.result[0]
    const timestamps = histResult.timestamp
    const histQuote = histResult.indicators.quote[0]
    const meta = histResult.meta

    const candles: CandleData[] = timestamps.map((ts: number, idx: number) => ({
      open: histQuote.open[idx] || 0,
      high: histQuote.high[idx] || 0,
      low: histQuote.low[idx] || 0,
      close: histQuote.close[idx] || 0,
      volume: histQuote.volume[idx] || 0,
      timestamp: ts,
    })).filter((c: CandleData) => c.close > 0)

    if (candles.length < 50) {
      return res.status(400).json({ error: 'Insufficient data for analysis' })
    }

    const currentPrice = meta.regularMarketPrice || candles[candles.length - 1].close

    // Technical Analysis
    const closes = candles.map(c => c.close)
    let rsi = 50
    let macdSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'

    if (closes.length >= 14) {
      const rsiValues = RSI.calculate({ values: closes, period: 14 })
      rsi = rsiValues[rsiValues.length - 1] || 50
    }

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
          macdSignal = lastMACD.MACD > lastMACD.signal ? 'BULLISH' : 'BEARISH'
        }
      }
    }

    const candlestickPatterns = detectCandlestickPatterns(candles)
    const chartPatterns = detectChartPatterns(candles)
    const pressureAnalysis = analyzeBuyerSellerPressure(candles)
    const technicalSignals = [...candlestickPatterns, ...chartPatterns, pressureAnalysis]

    // Operator Analysis
    const operatorGame = detectOperatorGame(candles)
    const operatorStrength = calculateOperatorStrength(candles)

    // Smart Money Concepts Analysis
    console.log('Running SMC analysis...')
    const smcAnalysis = analyzeSMC(candles)

    // Multi-Timeframe Analysis
    console.log('Running MTF analysis...')
    const mtfAnalysis = await analyzeMultiTimeframe(symbol)

    // AI Confidence Engine
    console.log('Calculating AI confidence...')
    const aiConfidence = calculateAIConfidence(
      symbol,
      currentPrice,
      candles,
      rsi,
      macdSignal,
      technicalSignals,
      operatorGame,
      operatorStrength,
      smcAnalysis,
      mtfAnalysis
    )

    // Compile response
    const response = {
      symbol,
      currentPrice,
      timestamp: new Date().toISOString(),
      
      // Basic Technical
      technical: {
        rsi,
        macdSignal,
        patterns: technicalSignals.slice(0, 5),
      },

      // Operator Analysis
      operator: {
        game: operatorGame,
        strength: operatorStrength,
      },

      // Smart Money Concepts
      smc: {
        marketStructure: smcAnalysis.marketStructure,
        recommendation: smcAnalysis.recommendation,
        confidence: smcAnalysis.overallConfidence,
        liquiditySweeps: smcAnalysis.liquiditySweeps.slice(0, 3),
        orderBlocks: smcAnalysis.orderBlocks.slice(0, 2),
        fairValueGaps: smcAnalysis.fairValueGaps.slice(0, 3),
        bos: smcAnalysis.bos,
        choch: smcAnalysis.choch,
        reasoning: smcAnalysis.reasoning,
      },

      // Multi-Timeframe
      mtf: {
        overallTrend: mtfAnalysis.overallTrend,
        confidenceScore: mtfAnalysis.confidenceScore,
        alignment: mtfAnalysis.alignment,
        recommendation: mtfAnalysis.recommendation,
        timeframes: {
          '1D': mtfAnalysis.timeframes['1D'],
          '4H': mtfAnalysis.timeframes['4H'],
          '1H': mtfAnalysis.timeframes['1H'],
        },
        heatmapMatrix: mtfAnalysis.heatmapMatrix,
        keyLevels: mtfAnalysis.keyLevels,
        reasoning: mtfAnalysis.reasoning,
      },

      // AI Confidence
      ai: {
        tradeConfidenceScore: aiConfidence.tradeConfidenceScore,
        riskScore: aiConfidence.riskScore,
        probabilityBullish: aiConfidence.probabilityBullish,
        probabilityBearish: aiConfidence.probabilityBearish,
        signalStrength: aiConfidence.signalStrength,
        recommendation: aiConfidence.recommendation,
        timeHorizon: aiConfidence.timeHorizon,
        reasoning: aiConfidence.reasoning,
        keyFactors: aiConfidence.keyFactors,
        warnings: aiConfidence.warnings,
        opportunities: aiConfidence.opportunities,
        componentScores: aiConfidence.componentScores,
        tradeSetup: {
          entry: aiConfidence.suggestedEntry,
          target: aiConfidence.suggestedTarget,
          stopLoss: aiConfidence.suggestedStopLoss,
          riskReward: aiConfidence.riskRewardRatio,
          positionSize: aiConfidence.positionSize,
        },
      },
    }

    res.status(200).json(response)
  } catch (error) {
    console.error('Enhanced analysis error:', error)
    res.status(500).json({ 
      error: 'Failed to generate enhanced analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
