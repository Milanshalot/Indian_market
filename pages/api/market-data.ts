import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { RSI, MACD } from 'technicalindicators'
import { detectCandlestickPatterns, detectChartPatterns, analyzeBuyerSellerPressure } from '../../utils/technicalAnalysis'
import { detectOperatorGame, calculateOperatorStrength } from '../../utils/operatorAnalysis'
import { generateOptionRecommendation, getNextExpiryDate, getDaysToExpiry, calculateOptionGreeks } from '../../utils/optionCalculator'
import { getOptionChainAnalysis, OptionChainAnalysis } from '../../utils/optionChainAnalysis'

// All NSE stocks
const NSE_STOCKS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
  'LT.NS', 'AXISBANK.NS', 'ASIANPAINT.NS', 'MARUTI.NS', 'TITAN.NS',
  'SUNPHARMA.NS', 'ULTRACEMCO.NS', 'BAJFINANCE.NS', 'NESTLEIND.NS', 'WIPRO.NS',
  'TATASTEEL.NS', 'HINDALCO.NS', 'COALINDIA.NS', 'VEDL.NS', 'JSWSTEEL.NS',
  'ADANIPORTS.NS', 'POWERGRID.NS', 'NTPC.NS', 'ONGC.NS', 'TATAMOTORS.NS',
  'HCLTECH.NS', 'BAJAJFINSV.NS', 'TECHM.NS', 'INDUSINDBK.NS', 'DRREDDY.NS',
  'APOLLOHOSP.NS', 'DIVISLAB.NS', 'EICHERMOT.NS', 'HEROMOTOCO.NS', 'CIPLA.NS',
  'BRITANNIA.NS', 'TATACONSUM.NS', 'GRASIM.NS', 'ADANIENT.NS', 'BPCL.NS',
  'M&M.NS', 'ADANIGREEN.NS', 'AMBUJACEM.NS', 'BANDHANBNK.NS', 'BANKBARODA.NS',
  'BIOCON.NS', 'CANBK.NS', 'DLF.NS', 'GAIL.NS', 'GODREJCP.NS',
  'HAVELLS.NS', 'HDFCLIFE.NS', 'INDIGO.NS', 'IOC.NS', 'JINDALSTEL.NS',
  'LUPIN.NS', 'MARICO.NS', 'NMDC.NS', 'PNB.NS', 'SAIL.NS',
  'SBILIFE.NS', 'TRENT.NS', 'UPL.NS', 'ZOMATO.NS'
]

const FNO_STOCKS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
  'LT.NS', 'AXISBANK.NS', 'ASIANPAINT.NS', 'MARUTI.NS', 'TITAN.NS',
  'SUNPHARMA.NS', 'ULTRACEMCO.NS', 'BAJFINANCE.NS', 'WIPRO.NS', 'HCLTECH.NS',
  'TATASTEEL.NS', 'HINDALCO.NS', 'COALINDIA.NS', 'VEDL.NS', 'JSWSTEEL.NS',
  'ADANIPORTS.NS', 'POWERGRID.NS', 'NTPC.NS', 'ONGC.NS', 'TATAMOTORS.NS',
  'BAJAJFINSV.NS', 'TECHM.NS', 'INDUSINDBK.NS', 'DRREDDY.NS', 'APOLLOHOSP.NS',
  'DIVISLAB.NS', 'EICHERMOT.NS', 'HEROMOTOCO.NS', 'CIPLA.NS', 'BRITANNIA.NS',
  'M&M.NS', 'BANDHANBNK.NS', 'BANKBARODA.NS', 'BIOCON.NS', 'CANBK.NS',
  'DLF.NS', 'GAIL.NS', 'GODREJCP.NS', 'HAVELLS.NS', 'HDFCLIFE.NS',
  'INDIGO.NS', 'IOC.NS', 'JINDALSTEL.NS', 'LUPIN.NS', 'MARICO.NS',
  'NMDC.NS', 'PNB.NS', 'SAIL.NS', 'SBILIFE.NS', 'TRENT.NS', 'UPL.NS', 'ZOMATO.NS'
]

interface StockData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume?: number
  isFNO?: boolean
  technicalSignals?: any[]
  rsi?: number
  macdSignal?: string
  operatorGame?: any
  operatorStrength?: any
}

// Fetch stock data from Yahoo Finance
async function fetchStockData(symbol: string): Promise<StockData | null> {
  try {
    // Fetch quote data
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    const quoteResponse = await axios.get(quoteUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const result = quoteResponse.data.chart.result[0]
    const meta = result.meta
    const quote = result.indicators.quote[0]

    const currentPrice = meta.regularMarketPrice || meta.previousClose
    const previousClose = meta.previousClose || meta.chartPreviousClose
    const change = currentPrice - previousClose
    const changePercent = (change / previousClose) * 100

    // Fetch historical data for technical analysis
    const histUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=30d`
    const histResponse = await axios.get(histUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const histResult = histResponse.data.chart.result[0]
    const timestamps = histResult.timestamp
    const histQuote = histResult.indicators.quote[0]

    const candles = timestamps.map((ts: number, idx: number) => ({
      open: histQuote.open[idx] || 0,
      high: histQuote.high[idx] || 0,
      low: histQuote.low[idx] || 0,
      close: histQuote.close[idx] || 0,
      volume: histQuote.volume[idx] || 0
    })).filter((c: any) => c.close > 0)

    // Technical analysis
    let technicalSignals: any[] = []
    let rsi = 50
    let macdSignal = 'NEUTRAL'
    let operatorGame = null
    let operatorStrength = null

    if (candles.length >= 10) {
      const candlestickPatterns = detectCandlestickPatterns(candles)
      const chartPatterns = detectChartPatterns(candles)
      const pressureAnalysis = analyzeBuyerSellerPressure(candles)
      operatorGame = detectOperatorGame(candles)
      operatorStrength = calculateOperatorStrength(candles)
      technicalSignals = [...candlestickPatterns, ...chartPatterns, pressureAnalysis]

      // RSI
      const closes = candles.map((c: any) => c.close)
      if (closes.length >= 14) {
        const rsiValues = RSI.calculate({ values: closes, period: 14 })
        rsi = rsiValues[rsiValues.length - 1] || 50
      }

      // MACD
      if (closes.length >= 26) {
        const macdValues = MACD.calculate({
          values: closes,
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
          SimpleMAOscillator: false,
          SimpleMASignal: false
        })
        if (macdValues.length > 0) {
          const lastMACD = macdValues[macdValues.length - 1]
          if (lastMACD && lastMACD.MACD && lastMACD.signal) {
            macdSignal = lastMACD.MACD > lastMACD.signal ? 'BULLISH' : 'BEARISH'
          }
        }
      }
    }

    return {
      symbol: symbol.replace('.NS', ''),
      name: meta.longName || meta.shortName || symbol,
      price: currentPrice,
      change,
      changePercent,
      volume: meta.regularMarketVolume || 0,
      isFNO: FNO_STOCKS.includes(symbol),
      technicalSignals,
      rsi,
      macdSignal,
      operatorGame,
      operatorStrength
    }
  } catch (error) {
    console.log(`Error fetching ${symbol}:`, error)
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Fetching live market data from Yahoo Finance...')

    // Fetch all stocks in parallel (limit to 10 at a time to avoid rate limiting)
    const batchSize = 10
    const allStockData: StockData[] = []

    for (let i = 0; i < NSE_STOCKS.length; i += batchSize) {
      const batch = NSE_STOCKS.slice(i, i + batchSize)
      const batchPromises = batch.map(symbol => fetchStockData(symbol))
      const batchResults = await Promise.all(batchPromises)
      allStockData.push(...batchResults.filter(Boolean) as StockData[])
      
      // Small delay between batches
      if (i + batchSize < NSE_STOCKS.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    console.log(`Successfully fetched ${allStockData.length} stocks`)

    // Sort and filter
    const gainers = allStockData
      .filter(s => s.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10)

    const losers = allStockData
      .filter(s => s.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 10)

    const fnoStocks = allStockData.filter(s => s.isFNO)
    const fnoGainers = fnoStocks
      .filter(s => s.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10)

    const fnoLosers = fnoStocks
      .filter(s => s.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 10)

    // Fetch indices
    const niftyData = await fetchStockData('^NSEI')
    const bankNiftyData = await fetchStockData('^NSEBANK')
    const sensexData = await fetchStockData('^BSESN')

    // Fetch option chain analysis for all 3 indices in parallel
    console.log('Fetching option chain data...')
    const [niftyOC, bankNiftyOC, sensexOC] = await Promise.all([
      getOptionChainAnalysis(
        'NIFTY',
        niftyData?.price || 0,
        niftyData?.changePercent || 0,
        niftyData?.rsi
      ),
      getOptionChainAnalysis(
        'BANKNIFTY',
        bankNiftyData?.price || 0,
        bankNiftyData?.changePercent || 0,
        bankNiftyData?.rsi
      ),
      getOptionChainAnalysis(
        'SENSEX',
        sensexData?.price || 0,
        sensexData?.changePercent || 0,
        sensexData?.rsi
      ),
    ])

    // Generate recommendations using option chain data
    const indexRecommendations = generateIndexRecommendations(
      niftyData || { price: 0, changePercent: 0 },
      bankNiftyData || { price: 0, changePercent: 0 },
      sensexData || { price: 0, changePercent: 0 },
      niftyOC,
      bankNiftyOC,
      sensexOC
    )

    const stockRecommendations = generateStockRecommendations(fnoStocks)

    res.status(200).json({
      gainers,
      losers,
      fnoGainers,
      fnoLosers,
      allStocks: allStockData,
      indexRecommendations,
      stockRecommendations,
      optionChainData: {
        nifty: niftyOC,
        bankNifty: bankNiftyOC,
        sensex: sensexOC,
      },
      indices: {
        nifty: {
          price: niftyData?.price || 0,
          change: niftyData?.change || 0,
          changePercent: niftyData?.changePercent || 0
        },
        bankNifty: {
          price: bankNiftyData?.price || 0,
          change: bankNiftyData?.change || 0,
          changePercent: bankNiftyData?.changePercent || 0
        },
        sensex: {
          price: sensexData?.price || 0,
          change: sensexData?.change || 0,
          changePercent: sensexData?.changePercent || 0
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in market-data API:', error)
    res.status(500).json({ error: 'Failed to fetch market data' })
  }
}

function generateIndexRecommendations(
  nifty: any,
  bankNifty: any,
  sensex: any,
  niftyOC?: OptionChainAnalysis,
  bankNiftyOC?: OptionChainAnalysis,
  sensexOC?: OptionChainAnalysis
) {
  const recommendations: any[] = []

  // Helper to build recommendation from option chain analysis
  function buildFromOC(indexName: string, priceData: any, oc?: OptionChainAnalysis) {
    if (oc && oc.recommendation) {
      const rec = oc.recommendation
      const actionMap: Record<string, string> = { 'BUY_CALL': 'BUY', 'BUY_PUT': 'SELL', 'HOLD': 'HOLD' }
      const typeMap: Record<string, string> = { 'BUY_CALL': 'CALL', 'BUY_PUT': 'PUT', 'HOLD': 'NEUTRAL' }

      // Use OC-derived entry/target/SL for option premium, but also show index levels
      const spotPrice = oc.spotPrice || priceData.price || 0
      let entry = spotPrice
      let target = spotPrice
      let stopLoss = spotPrice

      if (rec.action === 'BUY_CALL') {
        entry = Math.round(spotPrice)
        target = oc.highestCallOIStrike || Math.round(spotPrice * 1.015)
        stopLoss = oc.highestPutOIStrike || Math.round(spotPrice * 0.993)
      } else if (rec.action === 'BUY_PUT') {
        entry = Math.round(spotPrice)
        target = oc.highestPutOIStrike || Math.round(spotPrice * 0.985)
        stopLoss = oc.highestCallOIStrike || Math.round(spotPrice * 1.007)
      } else {
        entry = Math.round(spotPrice)
        target = Math.round(spotPrice * 1.01)
        stopLoss = Math.round(spotPrice * 0.99)
      }

      // Build detailed reason from option chain
      const reasonParts = [
        `📊 Option Chain: ${rec.action.replace('_', ' ')} | Strike: ${rec.strikePrice}`,
        `PCR: ${oc.pcr} (${oc.pcrInterpretation})`,
        `Max Pain: ${oc.maxPainStrike}`,
        `OI Support: ${oc.highestPutOIStrike} | OI Resistance: ${oc.highestCallOIStrike}`,
        `IV: Call ${oc.avgCallIV}% / Put ${oc.avgPutIV}% | ${oc.ivSkew}`,
        ...rec.reasons.slice(0, 2),
      ]

      recommendations.push({
        index: indexName,
        action: actionMap[rec.action] || 'HOLD',
        type: typeMap[rec.action] || 'NEUTRAL',
        entry,
        target,
        stopLoss,
        reason: reasonParts.join(' | '),
        optionChain: {
          pcr: oc.pcr,
          pcrInterpretation: oc.pcrInterpretation,
          maxPain: oc.maxPainStrike,
          oiSupport: oc.highestPutOIStrike,
          oiResistance: oc.highestCallOIStrike,
          strikePrice: rec.strikePrice,
          optionType: rec.type,
          optionEntry: rec.entry,
          optionTarget: rec.target,
          optionStopLoss: rec.stopLoss,
          confidence: rec.confidence,
          avgCallIV: oc.avgCallIV,
          avgPutIV: oc.avgPutIV,
          ivSkew: oc.ivSkew,
          callOIChange: oc.callOIChange,
          putOIChange: oc.putOIChange,
          topStrikes: oc.topStrikes,
          reasons: rec.reasons,
        },
      })
    } else {
      // Fallback to old price-based logic
      const pct = priceData.changePercent || 0
      const price = priceData.price || 0

      if (pct > 0.5) {
        recommendations.push({
          index: indexName,
          action: 'BUY', type: 'CALL',
          entry: Math.round(price),
          target: Math.round(price * 1.015),
          stopLoss: Math.round(price * 0.993),
          reason: `Bullish momentum ${pct.toFixed(2)}%. Option chain data unavailable.`,
        })
      } else if (pct < -0.5) {
        recommendations.push({
          index: indexName,
          action: 'SELL', type: 'PUT',
          entry: Math.round(price),
          target: Math.round(price * 0.985),
          stopLoss: Math.round(price * 1.007),
          reason: `Bearish pressure ${pct.toFixed(2)}%. Option chain data unavailable.`,
        })
      } else {
        recommendations.push({
          index: indexName,
          action: 'HOLD', type: 'NEUTRAL',
          entry: Math.round(price),
          target: Math.round(price * 1.01),
          stopLoss: Math.round(price * 0.99),
          reason: 'Consolidation phase. Option chain data unavailable.',
        })
      }
    }
  }

  buildFromOC('NIFTY 50', nifty, niftyOC)
  buildFromOC('BANK NIFTY', bankNifty, bankNiftyOC)
  buildFromOC('SENSEX', sensex, sensexOC)

  return recommendations
}

function generateStockRecommendations(fnoStocks: StockData[]) {
  const recommendations: any[] = []
  const expiryDate = getNextExpiryDate()
  const daysToExpiry = getDaysToExpiry()

  // Operator game stocks
  const operatorGameStocks = fnoStocks
    .filter(s => s.operatorGame && (s.operatorGame.action === 'BUY' || s.operatorGame.action === 'SELL'))
    .sort((a, b) => {
      const aScore = a.operatorGame.confidence === 'HIGH' ? 3 : 2
      const bScore = b.operatorGame.confidence === 'HIGH' ? 3 : 2
      return bScore - aScore
    })
    .slice(0, 10)

  operatorGameStocks.forEach(stock => {
    const game = stock.operatorGame
    const optionRec = generateOptionRecommendation(
      stock.symbol,
      stock.price,
      game.action,
      6,
      4
    )
    const greeks = calculateOptionGreeks(
      stock.price,
      optionRec.strikePrice,
      game.action === 'BUY' ? 'CALL' : 'PUT',
      daysToExpiry
    )
    
    recommendations.push({
      symbol: stock.symbol,
      name: stock.name,
      action: game.action,
      type: game.action === 'BUY' ? 'CALL' : 'PUT',
      entry: stock.price,
      target: game.action === 'BUY' ? stock.price * 1.06 : stock.price * 0.94,
      stopLoss: game.action === 'BUY' ? stock.price * 0.96 : stock.price * 1.04,
      reason: `🎯 OPERATOR GAME: ${game.type} - ${game.description}`,
      option: {
        strikePrice: optionRec.strikePrice,
        optionType: optionRec.optionType,
        premium: optionRec.premium,
        breakeven: optionRec.breakeven,
        maxProfit: optionRec.maxProfit,
        maxLoss: optionRec.maxLoss,
        expiry: expiryDate,
        strategy: optionRec.strategy,
        greeks
      }
    })
  })

  // Strong technical stocks
  const technicalStocks = fnoStocks
    .filter(s => s.technicalSignals && s.technicalSignals.length > 0 && Math.abs(s.changePercent) > 1)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 15)

  technicalStocks.forEach(stock => {
    const isBullish = stock.changePercent > 0
    const signal = stock.technicalSignals?.find(s => s.signal === (isBullish ? 'BULLISH' : 'BEARISH'))
    
    if (signal) {
      const optionRec = generateOptionRecommendation(
        stock.symbol,
        stock.price,
        isBullish ? 'BUY' : 'SELL',
        4,
        2
      )
      const greeks = calculateOptionGreeks(
        stock.price,
        optionRec.strikePrice,
        isBullish ? 'CALL' : 'PUT',
        daysToExpiry
      )
      
      recommendations.push({
        symbol: stock.symbol,
        name: stock.name,
        action: isBullish ? 'BUY' : 'SELL',
        type: isBullish ? 'CALL' : 'PUT',
        entry: stock.price,
        target: isBullish ? stock.price * 1.04 : stock.price * 0.96,
        stopLoss: isBullish ? stock.price * 0.98 : stock.price * 1.02,
        reason: `📊 ${signal.pattern}: ${signal.description} | RSI: ${stock.rsi?.toFixed(0)}`,
        option: {
          strikePrice: optionRec.strikePrice,
          optionType: optionRec.optionType,
          premium: optionRec.premium,
          breakeven: optionRec.breakeven,
          maxProfit: optionRec.maxProfit,
          maxLoss: optionRec.maxLoss,
          expiry: expiryDate,
          strategy: optionRec.strategy,
          greeks
        }
      })
    }
  })

  return recommendations.slice(0, 25)
}
