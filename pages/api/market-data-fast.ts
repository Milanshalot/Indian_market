// Fast Market Data API - Optimized for speed
import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

// Only fetch top 30 most liquid stocks for speed
const TOP_STOCKS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
  'LT.NS', 'AXISBANK.NS', 'ASIANPAINT.NS', 'MARUTI.NS', 'TITAN.NS',
  'SUNPHARMA.NS', 'ULTRACEMCO.NS', 'BAJFINANCE.NS', 'WIPRO.NS', 'HCLTECH.NS',
  'TATASTEEL.NS', 'HINDALCO.NS', 'ADANIPORTS.NS', 'NTPC.NS', 'TATAMOTORS.NS',
  'BAJAJFINSV.NS', 'TECHM.NS', 'INDUSINDBK.NS', 'DRREDDY.NS', 'APOLLOHOSP.NS'
]

const FNO_STOCKS = TOP_STOCKS // All top stocks have F&O

interface StockData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume?: number
  isFNO?: boolean
}

// Simplified fetch - only current price, no technical analysis
async function fetchStockDataFast(symbol: string): Promise<StockData | null> {
  try {
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    const response = await axios.get(quoteUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 3000 // 3 second timeout
    })

    const result = response.data.chart.result[0]
    const meta = result.meta

    const currentPrice = meta.regularMarketPrice || meta.previousClose
    const previousClose = meta.previousClose || meta.chartPreviousClose
    const change = currentPrice - previousClose
    const changePercent = (change / previousClose) * 100

    return {
      symbol: symbol.replace('.NS', ''),
      name: meta.longName || meta.shortName || symbol,
      price: currentPrice,
      change,
      changePercent,
      volume: meta.regularMarketVolume || 0,
      isFNO: FNO_STOCKS.includes(symbol),
    }
  } catch (error) {
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Fetching fast market data...')

    // Fetch all stocks in parallel with aggressive batching
    const batchSize = 15 // Larger batches for speed
    const allStockData: StockData[] = []

    for (let i = 0; i < TOP_STOCKS.length; i += batchSize) {
      const batch = TOP_STOCKS.slice(i, i + batchSize)
      const batchPromises = batch.map(symbol => fetchStockDataFast(symbol))
      const batchResults = await Promise.all(batchPromises)
      allStockData.push(...batchResults.filter(Boolean) as StockData[])
    }

    console.log(`Fetched ${allStockData.length} stocks`)

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
    const [niftyData, bankNiftyData, sensexData] = await Promise.all([
      fetchStockDataFast('^NSEI'),
      fetchStockDataFast('^NSEBANK'),
      fetchStockDataFast('^BSESN')
    ])

    res.status(200).json({
      gainers,
      losers,
      fnoGainers,
      fnoLosers,
      allStocks: allStockData,
      indexRecommendations: [], // Empty for speed
      stockRecommendations: [], // Empty for speed
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
    console.error('Error in fast market-data API:', error)
    res.status(500).json({ error: 'Failed to fetch market data' })
  }
}
