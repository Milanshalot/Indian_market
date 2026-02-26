import type { NextApiRequest, NextApiResponse } from 'next'

// Simplified version with mock data for testing
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Mock stock data
    const mockStocks = [
      { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2456.75, change: 45.30, changePercent: 1.88, volume: 5000000, isFNO: true, rsi: 62, macdSignal: 'BULLISH' },
      { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3678.90, change: 62.15, changePercent: 1.72, volume: 3000000, isFNO: true, rsi: 58, macdSignal: 'BULLISH' },
      { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1654.20, change: 28.45, changePercent: 1.75, volume: 8000000, isFNO: true, rsi: 55, macdSignal: 'BULLISH' },
      { symbol: 'INFY', name: 'Infosys', price: 1432.60, change: 24.80, changePercent: 1.76, volume: 4500000, isFNO: true, rsi: 60, macdSignal: 'BULLISH' },
      { symbol: 'ICICIBANK', name: 'ICICI Bank', price: 987.35, change: 16.90, changePercent: 1.74, volume: 7000000, isFNO: true, rsi: 57, macdSignal: 'BULLISH' },
      { symbol: 'TATASTEEL', name: 'Tata Steel', price: 134.25, change: -3.45, changePercent: -2.51, volume: 6000000, isFNO: true, rsi: 42, macdSignal: 'BEARISH' },
      { symbol: 'HINDALCO', name: 'Hindalco Industries', price: 456.80, change: -10.20, changePercent: -2.18, volume: 3500000, isFNO: true, rsi: 38, macdSignal: 'BEARISH' },
      { symbol: 'COALINDIA', name: 'Coal India', price: 234.50, change: -5.15, changePercent: -2.15, volume: 2500000, isFNO: true, rsi: 40, macdSignal: 'BEARISH' },
      { symbol: 'VEDL', name: 'Vedanta', price: 289.60, change: -6.30, changePercent: -2.13, volume: 4000000, isFNO: true, rsi: 35, macdSignal: 'BEARISH' },
      { symbol: 'JSWSTEEL', name: 'JSW Steel', price: 789.45, change: -16.75, changePercent: -2.08, volume: 3200000, isFNO: true, rsi: 43, macdSignal: 'BEARISH' },
    ]

    // Add technical signals and operator game
    const stocksWithAnalysis = mockStocks.map(stock => ({
      ...stock,
      technicalSignals: stock.changePercent > 0 ? [
        { pattern: 'Bullish Engulfing', signal: 'BULLISH', strength: 'STRONG', description: 'Strong reversal pattern detected' },
        { pattern: 'Uptrend', signal: 'BULLISH', strength: 'MODERATE', description: 'Price making higher highs' }
      ] : [
        { pattern: 'Bearish Engulfing', signal: 'BEARISH', strength: 'STRONG', description: 'Strong bearish reversal' },
        { pattern: 'Downtrend', signal: 'BEARISH', strength: 'MODERATE', description: 'Price making lower lows' }
      ],
      operatorGame: Math.abs(stock.changePercent) > 2 ? {
        type: stock.changePercent > 0 ? 'ACCUMULATION' : 'DISTRIBUTION',
        confidence: 'HIGH',
        action: stock.changePercent > 0 ? 'BUY' : 'SELL',
        description: stock.changePercent > 0 
          ? 'Operators accumulating quietly. Multiple low-volume green candles detected.'
          : 'Operators distributing into strength. High volume red candles with rejection.',
        indicators: [
          'Volume analysis confirms pattern',
          'Price action shows clear intent',
          'Strong momentum detected'
        ]
      } : null,
      operatorStrength: {
        score: stock.changePercent > 0 ? 70 + Math.random() * 20 : 20 + Math.random() * 20,
        sentiment: stock.changePercent > 0 ? 'BULLISH' : 'BEARISH',
        description: stock.changePercent > 0 
          ? 'Strong operator buying detected. Institutions accumulating positions.'
          : 'Strong operator selling detected. Institutions distributing positions.'
      }
    }))

    const gainers = stocksWithAnalysis.filter(s => s.changePercent > 0).slice(0, 10)
    const losers = stocksWithAnalysis.filter(s => s.changePercent < 0).slice(0, 10)
    const fnoGainers = gainers.filter(s => s.isFNO)
    const fnoLosers = losers.filter(s => s.isFNO)

    const indexRecommendations = [
      {
        index: 'NIFTY 50',
        action: 'BUY',
        type: 'CALL',
        entry: 21850,
        target: 22100,
        stopLoss: 21600,
        reason: '📊 Option Chain: BUY CALL | Strike: 21850 | PCR: 1.25 (Bullish - More puts than calls) | Max Pain: 21900 | OI Support: 21600 | OI Resistance: 22100 | IV: Call 12.5% / Put 14.2%',
        optionChain: {
          pcr: 1.25,
          pcrInterpretation: 'Bullish - More puts than calls, support building',
          maxPain: 21900,
          oiSupport: 21600,
          oiResistance: 22100,
          strikePrice: 21850,
          optionType: 'CALL',
          optionEntry: 185,
          optionTarget: 278,
          optionStopLoss: 111,
          confidence: 'HIGH',
          avgCallIV: 12.5,
          avgPutIV: 14.2,
          ivSkew: 'Put IV Premium - Fear/hedging in market',
          callOIChange: -45000,
          putOIChange: 120000,
          topStrikes: [
            { strike: 22000, callOI: 1250000, putOI: 350000, callOIChange: 85000, putOIChange: -12000, interpretation: '🔴 Strong Resistance - Heavy call writing' },
            { strike: 21700, callOI: 180000, putOI: 980000, callOIChange: -25000, putOIChange: 75000, interpretation: '🟢 Strong Support - Heavy put writing' },
            { strike: 21800, callOI: 450000, putOI: 720000, callOIChange: 15000, putOIChange: 45000, interpretation: '✅ Mild Support - More puts than calls' },
            { strike: 22100, callOI: 890000, putOI: 210000, callOIChange: 55000, putOIChange: -8000, interpretation: '🔴 Strong Resistance - Heavy call writing' },
            { strike: 21900, callOI: 620000, putOI: 580000, callOIChange: 22000, putOIChange: 18000, interpretation: '⚖️ Balanced - Equal call/put interest' },
          ],
          reasons: [
            'PCR 1.25 is bullish - put OI > call OI',
            'Put OI building (+1.20 L) - writers adding support',
            'Call unwinding (-45.00 K) - resistance weakening',
            'Max Pain at 21900 is above spot - price likely to move up',
          ],
        },
      },
      {
        index: 'BANK NIFTY',
        action: 'BUY',
        type: 'CALL',
        entry: 46500,
        target: 47200,
        stopLoss: 46000,
        reason: '📊 Option Chain: BUY CALL | Strike: 46500 | PCR: 1.35 (Very Bullish) | Max Pain: 46600 | OI Support: 46000 | OI Resistance: 47200 | IV: Call 14.8% / Put 16.1%',
        optionChain: {
          pcr: 1.35,
          pcrInterpretation: 'Very Bullish - Heavy put writing indicates strong support',
          maxPain: 46600,
          oiSupport: 46000,
          oiResistance: 47200,
          strikePrice: 46500,
          optionType: 'CALL',
          optionEntry: 320,
          optionTarget: 480,
          optionStopLoss: 192,
          confidence: 'HIGH',
          avgCallIV: 14.8,
          avgPutIV: 16.1,
          ivSkew: 'Put IV Premium - Fear/hedging in market',
          callOIChange: -38000,
          putOIChange: 95000,
          topStrikes: [
            { strike: 47000, callOI: 980000, putOI: 280000, callOIChange: 62000, putOIChange: -9000, interpretation: '🔴 Strong Resistance - Heavy call writing' },
            { strike: 46000, callOI: 120000, putOI: 850000, callOIChange: -18000, putOIChange: 58000, interpretation: '🟢 Strong Support - Heavy put writing' },
            { strike: 46500, callOI: 380000, putOI: 650000, callOIChange: 12000, putOIChange: 35000, interpretation: '✅ Mild Support - More puts than calls' },
          ],
          reasons: [
            'PCR 1.35 is very bullish - heavy put writing = strong support',
            'Put OI building (+95.00 K) - writers adding support',
            'Banking sector showing institutional buying',
          ],
        },
      },
      {
        index: 'SENSEX',
        action: 'HOLD',
        type: 'NEUTRAL',
        entry: 72100,
        target: 72600,
        stopLoss: 71800,
        reason: '📊 Option Chain: HOLD | Strike: 72100 | PCR: 0.92 (Neutral) | Max Pain: 72000 | OI Support: 71800 | OI Resistance: 72600 | IV: Call 11.2% / Put 11.8%',
        optionChain: {
          pcr: 0.92,
          pcrInterpretation: 'Neutral - Balanced OI, no clear direction',
          maxPain: 72000,
          oiSupport: 71800,
          oiResistance: 72600,
          strikePrice: 72100,
          optionType: 'NEUTRAL',
          optionEntry: 0,
          optionTarget: 0,
          optionStopLoss: 0,
          confidence: 'LOW',
          avgCallIV: 11.2,
          avgPutIV: 11.8,
          ivSkew: 'Balanced IV - No significant skew',
          callOIChange: 22000,
          putOIChange: 18000,
          topStrikes: [
            { strike: 72500, callOI: 520000, putOI: 180000, callOIChange: 32000, putOIChange: -5000, interpretation: '⚠️ Mild Resistance - More calls than puts' },
            { strike: 71800, callOI: 150000, putOI: 480000, callOIChange: -8000, putOIChange: 28000, interpretation: '✅ Mild Support - More puts than calls' },
            { strike: 72000, callOI: 350000, putOI: 380000, callOIChange: 12000, putOIChange: 15000, interpretation: '⚖️ Balanced - Equal call/put interest' },
          ],
          reasons: [
            'No strong directional bias from option chain - wait for clarity',
            'PCR 0.92 near neutral range',
            'Max Pain near spot price - sideways expected',
          ],
        },
      }
    ]

    // Option chain summary for frontend
    const optionChainData = {
      nifty: {
        symbol: 'NIFTY',
        spotPrice: 21850,
        pcr: 1.25,
        pcrInterpretation: 'Bullish - More puts than calls, support building',
        maxPainStrike: 21900,
        highestCallOIStrike: 22100,
        highestPutOIStrike: 21600,
        callOITotal: 4500000,
        putOITotal: 5625000,
        callOIChange: -45000,
        putOIChange: 120000,
        avgCallIV: 12.5,
        avgPutIV: 14.2,
        ivSkew: 'Put IV Premium - Fear/hedging in market',
      },
      bankNifty: {
        symbol: 'BANKNIFTY',
        spotPrice: 46500,
        pcr: 1.35,
        pcrInterpretation: 'Very Bullish - Heavy put writing indicates strong support',
        maxPainStrike: 46600,
        highestCallOIStrike: 47200,
        highestPutOIStrike: 46000,
        callOITotal: 3200000,
        putOITotal: 4320000,
        callOIChange: -38000,
        putOIChange: 95000,
        avgCallIV: 14.8,
        avgPutIV: 16.1,
        ivSkew: 'Put IV Premium - Fear/hedging in market',
      },
      sensex: {
        symbol: 'SENSEX',
        spotPrice: 72100,
        pcr: 0.92,
        pcrInterpretation: 'Neutral - Balanced OI, no clear direction',
        maxPainStrike: 72000,
        highestCallOIStrike: 72600,
        highestPutOIStrike: 71800,
        callOITotal: 1800000,
        putOITotal: 1656000,
        callOIChange: 22000,
        putOIChange: 18000,
        avgCallIV: 11.2,
        avgPutIV: 11.8,
        ivSkew: 'Balanced IV - No significant skew',
      },
    }

    const stockRecommendations = stocksWithAnalysis
      .filter(s => s.operatorGame)
      .map(s => ({
        symbol: s.symbol,
        name: s.name,
        action: s.operatorGame!.action,
        type: s.changePercent > 0 ? 'CALL' : 'PUT',
        entry: s.price,
        target: s.changePercent > 0 ? s.price * 1.05 : s.price * 0.95,
        stopLoss: s.changePercent > 0 ? s.price * 0.97 : s.price * 1.03,
        reason: `🎯 OPERATOR GAME: ${s.operatorGame!.type} - ${s.operatorGame!.description} Confidence: ${s.operatorGame!.confidence}.`
      }))

    res.status(200).json({
      gainers,
      losers,
      fnoGainers,
      fnoLosers,
      allStocks: stocksWithAnalysis,
      indexRecommendations,
      stockRecommendations,
      optionChainData,
      indices: {
        nifty: { price: 21850, change: 185.50, changePercent: 0.85 },
        bankNifty: { price: 46500, change: 550.30, changePercent: 1.20 },
        sensex: { price: 72100, change: 120.75, changePercent: 0.17 }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Failed to fetch market data' })
  }
}
