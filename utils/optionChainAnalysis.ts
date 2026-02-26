// Option Chain Analysis for NIFTY, BANKNIFTY, SENSEX
// Fetches live option chain data from NSE and analyzes PCR, OI, Max Pain, IV

import axios from 'axios'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OptionData {
  strikePrice: number
  expiryDate: string
  openInterest: number
  changeinOpenInterest: number
  totalTradedVolume: number
  impliedVolatility: number
  lastPrice: number
  bidPrice: number
  askPrice: number
}

export interface OptionChainEntry {
  strikePrice: number
  expiryDate: string
  CE?: OptionData
  PE?: OptionData
}

export interface OptionChainAnalysis {
  symbol: string
  spotPrice: number
  pcr: number                    // Put-Call Ratio
  pcrInterpretation: string
  maxPainStrike: number          // Strike where max sellers profit
  highestCallOIStrike: number    // Resistance from OI
  highestPutOIStrike: number     // Support from OI
  callOITotal: number
  putOITotal: number
  callOIChange: number           // Net change in Call OI
  putOIChange: number            // Net change in Put OI
  avgCallIV: number              // Average Call IV
  avgPutIV: number               // Average Put IV
  ivSkew: string                 // IV skew interpretation
  recommendation: OptionChainRecommendation
  topStrikes: StrikeAnalysis[]   // Top strikes by OI
}

export interface OptionChainRecommendation {
  action: 'BUY_CALL' | 'BUY_PUT' | 'HOLD'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  strikePrice: number
  type: 'CALL' | 'PUT' | 'NEUTRAL'
  entry: number
  target: number
  stopLoss: number
  reasons: string[]
}

export interface StrikeAnalysis {
  strike: number
  callOI: number
  putOI: number
  callOIChange: number
  putOIChange: number
  interpretation: string
}

// ─── NSE Session Manager ────────────────────────────────────────────────────

let nseCookies: string = ''
let lastCookieTime: number = 0
const COOKIE_EXPIRY = 5 * 60 * 1000 // 5 minutes

async function getNSESession(): Promise<string> {
  const now = Date.now()
  if (nseCookies && (now - lastCookieTime) < COOKIE_EXPIRY) {
    return nseCookies
  }

  try {
    const response = await axios.get('https://www.nseindia.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      },
      timeout: 10000,
      maxRedirects: 5,
    })

    const setCookieHeaders = response.headers['set-cookie']
    if (setCookieHeaders) {
      nseCookies = setCookieHeaders.map((c: string) => c.split(';')[0]).join('; ')
      lastCookieTime = now
    }
    return nseCookies
  } catch (error) {
    console.log('Failed to get NSE session:', error)
    return ''
  }
}

// ─── Fetch Option Chain from NSE ────────────────────────────────────────────

export async function fetchOptionChain(symbol: string): Promise<OptionChainEntry[] | null> {
  try {
    const cookies = await getNSESession()
    if (!cookies) return null

    // NSE uses NIFTY, BANKNIFTY for indices
    const nseSymbol = symbol === 'SENSEX' ? 'SENSEX' : symbol
    const apiUrl = symbol === 'SENSEX'
      ? `https://www.nseindia.com/api/option-chain-indices?symbol=SENSEX`
      : `https://www.nseindia.com/api/option-chain-indices?symbol=${nseSymbol}`

    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.nseindia.com/option-chain',
        'Cookie': cookies,
      },
      timeout: 15000,
    })

    const data = response.data
    if (!data || !data.records || !data.records.data) return null

    const spotPrice = data.records.underlyingValue || 0
    const entries: OptionChainEntry[] = data.records.data
      .filter((row: any) => row.expiryDate === data.records.expiryDates[0]) // nearest expiry
      .map((row: any) => ({
        strikePrice: row.strikePrice,
        expiryDate: row.expiryDate,
        CE: row.CE ? {
          strikePrice: row.strikePrice,
          expiryDate: row.expiryDate,
          openInterest: row.CE.openInterest || 0,
          changeinOpenInterest: row.CE.changeinOpenInterest || 0,
          totalTradedVolume: row.CE.totalTradedVolume || 0,
          impliedVolatility: row.CE.impliedVolatility || 0,
          lastPrice: row.CE.lastPrice || 0,
          bidPrice: row.CE.bidprice || 0,
          askPrice: row.CE.askPrice || 0,
        } : undefined,
        PE: row.PE ? {
          strikePrice: row.strikePrice,
          expiryDate: row.expiryDate,
          openInterest: row.PE.openInterest || 0,
          changeinOpenInterest: row.PE.changeinOpenInterest || 0,
          totalTradedVolume: row.PE.totalTradedVolume || 0,
          impliedVolatility: row.PE.impliedVolatility || 0,
          lastPrice: row.PE.lastPrice || 0,
          bidPrice: row.PE.bidprice || 0,
          askPrice: row.PE.askPrice || 0,
        } : undefined,
      }))

    // Attach spotPrice to the result for later use
    ;(entries as any).__spotPrice = spotPrice

    return entries
  } catch (error) {
    console.log(`Failed to fetch option chain for ${symbol}:`, error)
    return null
  }
}

// ─── Analyze Option Chain ───────────────────────────────────────────────────

export function analyzeOptionChain(
  symbol: string,
  entries: OptionChainEntry[],
  spotPrice: number
): OptionChainAnalysis {
  // Filter strikes near ATM (±10 strikes around spot price)
  const sortedEntries = entries
    .filter(e => e.CE || e.PE)
    .sort((a, b) => a.strikePrice - b.strikePrice)

  // Find ATM strike
  const atmStrike = sortedEntries.reduce((closest, entry) =>
    Math.abs(entry.strikePrice - spotPrice) < Math.abs(closest.strikePrice - spotPrice)
      ? entry : closest
  )

  const atmIndex = sortedEntries.indexOf(atmStrike)
  const nearATM = sortedEntries.slice(
    Math.max(0, atmIndex - 10),
    Math.min(sortedEntries.length, atmIndex + 11)
  )

  // ─── PCR Calculation ───
  let callOITotal = 0
  let putOITotal = 0
  let callOIChange = 0
  let putOIChange = 0
  let callIVSum = 0
  let putIVSum = 0
  let callIVCount = 0
  let putIVCount = 0

  nearATM.forEach(entry => {
    if (entry.CE) {
      callOITotal += entry.CE.openInterest
      callOIChange += entry.CE.changeinOpenInterest
      if (entry.CE.impliedVolatility > 0) {
        callIVSum += entry.CE.impliedVolatility
        callIVCount++
      }
    }
    if (entry.PE) {
      putOITotal += entry.PE.openInterest
      putOIChange += entry.PE.changeinOpenInterest
      if (entry.PE.impliedVolatility > 0) {
        putIVSum += entry.PE.impliedVolatility
        putIVCount++
      }
    }
  })

  const pcr = callOITotal > 0 ? putOITotal / callOITotal : 1
  const avgCallIV = callIVCount > 0 ? callIVSum / callIVCount : 0
  const avgPutIV = putIVCount > 0 ? putIVSum / putIVCount : 0

  // ─── PCR Interpretation ───
  let pcrInterpretation = ''
  if (pcr > 1.3) pcrInterpretation = 'Very Bullish - Heavy put writing indicates strong support'
  else if (pcr > 1.0) pcrInterpretation = 'Bullish - More puts than calls, support building'
  else if (pcr > 0.7) pcrInterpretation = 'Neutral - Balanced OI, no clear direction'
  else if (pcr > 0.5) pcrInterpretation = 'Bearish - More calls than puts, resistance building'
  else pcrInterpretation = 'Very Bearish - Heavy call writing indicates strong resistance'

  // ─── Max Pain ───
  const maxPainStrike = calculateMaxPain(sortedEntries, spotPrice)

  // ─── Highest OI Strikes (Support/Resistance) ───
  let highestCallOI = 0
  let highestCallOIStrike = spotPrice
  let highestPutOI = 0
  let highestPutOIStrike = spotPrice

  sortedEntries.forEach(entry => {
    if (entry.CE && entry.CE.openInterest > highestCallOI) {
      highestCallOI = entry.CE.openInterest
      highestCallOIStrike = entry.strikePrice
    }
    if (entry.PE && entry.PE.openInterest > highestPutOI) {
      highestPutOI = entry.PE.openInterest
      highestPutOIStrike = entry.strikePrice
    }
  })

  // ─── IV Skew ───
  let ivSkew = 'Neutral'
  if (avgPutIV > avgCallIV * 1.15) ivSkew = 'Put IV Premium - Fear/hedging in market'
  else if (avgCallIV > avgPutIV * 1.15) ivSkew = 'Call IV Premium - Aggressive call buying'
  else ivSkew = 'Balanced IV - No significant skew'

  // ─── Top Strikes Analysis ───
  const topStrikes = getTopStrikes(nearATM, spotPrice)

  // ─── Generate Recommendation ───
  const recommendation = generateOptionRecommendation(
    symbol, spotPrice, pcr, maxPainStrike,
    highestCallOIStrike, highestPutOIStrike,
    callOIChange, putOIChange, avgCallIV, avgPutIV,
    nearATM
  )

  return {
    symbol,
    spotPrice,
    pcr: Math.round(pcr * 100) / 100,
    pcrInterpretation,
    maxPainStrike,
    highestCallOIStrike,
    highestPutOIStrike,
    callOITotal,
    putOITotal,
    callOIChange,
    putOIChange,
    avgCallIV: Math.round(avgCallIV * 100) / 100,
    avgPutIV: Math.round(avgPutIV * 100) / 100,
    ivSkew,
    recommendation,
    topStrikes,
  }
}

// ─── Max Pain Calculation ───────────────────────────────────────────────────

function calculateMaxPain(entries: OptionChainEntry[], spotPrice: number): number {
  let minPain = Infinity
  let maxPainStrike = spotPrice

  entries.forEach(entry => {
    let totalPain = 0

    entries.forEach(other => {
      // Call pain: max(0, strike - expiry_price) * OI
      if (other.CE) {
        totalPain += Math.max(0, entry.strikePrice - other.strikePrice) * other.CE.openInterest
      }
      // Put pain: max(0, expiry_price - strike) * OI
      if (other.PE) {
        totalPain += Math.max(0, other.strikePrice - entry.strikePrice) * other.PE.openInterest
      }
    })

    if (totalPain < minPain) {
      minPain = totalPain
      maxPainStrike = entry.strikePrice
    }
  })

  return maxPainStrike
}

// ─── Top Strikes by OI ─────────────────────────────────────────────────────

function getTopStrikes(entries: OptionChainEntry[], spotPrice: number): StrikeAnalysis[] {
  return entries
    .map(entry => {
      const callOI = entry.CE?.openInterest || 0
      const putOI = entry.PE?.openInterest || 0
      const totalOI = callOI + putOI

      let interpretation = ''
      if (entry.strikePrice > spotPrice && callOI > putOI * 2) {
        interpretation = '🔴 Strong Resistance - Heavy call writing'
      } else if (entry.strikePrice < spotPrice && putOI > callOI * 2) {
        interpretation = '🟢 Strong Support - Heavy put writing'
      } else if (callOI > putOI) {
        interpretation = '⚠️ Mild Resistance - More calls than puts'
      } else if (putOI > callOI) {
        interpretation = '✅ Mild Support - More puts than calls'
      } else {
        interpretation = '⚖️ Balanced - Equal call/put interest'
      }

      return {
        strike: entry.strikePrice,
        callOI,
        putOI,
        callOIChange: entry.CE?.changeinOpenInterest || 0,
        putOIChange: entry.PE?.changeinOpenInterest || 0,
        interpretation,
        _totalOI: totalOI,
      }
    })
    .sort((a, b) => (b as any)._totalOI - (a as any)._totalOI)
    .slice(0, 5)
    .map(({ _totalOI, ...rest }: any) => rest)
}

// ─── Generate Option Recommendation ─────────────────────────────────────────

function generateOptionRecommendation(
  symbol: string,
  spotPrice: number,
  pcr: number,
  maxPainStrike: number,
  highestCallOIStrike: number,
  highestPutOIStrike: number,
  callOIChange: number,
  putOIChange: number,
  avgCallIV: number,
  avgPutIV: number,
  entries: OptionChainEntry[]
): OptionChainRecommendation {
  const reasons: string[] = []
  let bullishScore = 0
  let bearishScore = 0

  // 1. PCR Analysis
  if (pcr > 1.3) {
    bullishScore += 3
    reasons.push(`PCR ${pcr.toFixed(2)} is very bullish - heavy put writing = strong support`)
  } else if (pcr > 1.0) {
    bullishScore += 2
    reasons.push(`PCR ${pcr.toFixed(2)} is bullish - put OI > call OI`)
  } else if (pcr < 0.5) {
    bearishScore += 3
    reasons.push(`PCR ${pcr.toFixed(2)} is very bearish - heavy call writing = strong resistance`)
  } else if (pcr < 0.7) {
    bearishScore += 2
    reasons.push(`PCR ${pcr.toFixed(2)} is bearish - call OI > put OI`)
  }

  // 2. Max Pain Analysis
  const maxPainDiff = ((maxPainStrike - spotPrice) / spotPrice) * 100
  if (maxPainDiff > 0.5) {
    bullishScore += 2
    reasons.push(`Max Pain at ${maxPainStrike} is above spot - price likely to move up`)
  } else if (maxPainDiff < -0.5) {
    bearishScore += 2
    reasons.push(`Max Pain at ${maxPainStrike} is below spot - price likely to move down`)
  }

  // 3. OI Support/Resistance
  if (highestPutOIStrike < spotPrice && (spotPrice - highestPutOIStrike) / spotPrice < 0.03) {
    bullishScore += 1
    reasons.push(`Strong Put OI support at ${highestPutOIStrike} (${((spotPrice - highestPutOIStrike) / spotPrice * 100).toFixed(1)}% below)`)
  }
  if (highestCallOIStrike > spotPrice && (highestCallOIStrike - spotPrice) / spotPrice < 0.03) {
    bearishScore += 1
    reasons.push(`Strong Call OI resistance at ${highestCallOIStrike} (${((highestCallOIStrike - spotPrice) / spotPrice * 100).toFixed(1)}% above)`)
  }

  // 4. Change in OI
  if (putOIChange > 0 && putOIChange > callOIChange) {
    bullishScore += 2
    reasons.push(`Put OI building (+${formatOI(putOIChange)}) - writers adding support`)
  }
  if (callOIChange > 0 && callOIChange > putOIChange) {
    bearishScore += 2
    reasons.push(`Call OI building (+${formatOI(callOIChange)}) - writers adding resistance`)
  }
  if (callOIChange < 0 && Math.abs(callOIChange) > 10000) {
    bullishScore += 1
    reasons.push(`Call unwinding (${formatOI(callOIChange)}) - resistance weakening`)
  }
  if (putOIChange < 0 && Math.abs(putOIChange) > 10000) {
    bearishScore += 1
    reasons.push(`Put unwinding (${formatOI(putOIChange)}) - support weakening`)
  }

  // 5. IV Analysis
  if (avgPutIV > avgCallIV * 1.15) {
    reasons.push(`Put IV (${avgPutIV.toFixed(1)}%) > Call IV (${avgCallIV.toFixed(1)}%) - hedging activity`)
  } else if (avgCallIV > avgPutIV * 1.15) {
    bullishScore += 1
    reasons.push(`Call IV (${avgCallIV.toFixed(1)}%) > Put IV (${avgPutIV.toFixed(1)}%) - aggressive call buying`)
  }

  // ─── Decision Logic ───
  const totalScore = bullishScore + bearishScore
  const netScore = bullishScore - bearishScore

  // Determine strike price for recommendation
  const strikeStep = symbol === 'BANKNIFTY' ? 100 : symbol === 'SENSEX' ? 100 : 50
  const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep

  if (netScore >= 3) {
    // Strong Bullish - Buy Call
    const strikePrice = atmStrike // ATM Call
    const otmStrike = atmStrike + strikeStep // slightly OTM for cheaper entry
    const callEntry = entries.find(e => e.strikePrice === atmStrike)
    const callPremium = callEntry?.CE?.lastPrice || spotPrice * 0.01

    return {
      action: 'BUY_CALL',
      confidence: netScore >= 5 ? 'HIGH' : 'MEDIUM',
      strikePrice: atmStrike,
      type: 'CALL',
      entry: callPremium,
      target: Math.round(callPremium * 1.5),
      stopLoss: Math.round(callPremium * 0.6),
      reasons,
    }
  } else if (netScore <= -3) {
    // Strong Bearish - Buy Put
    const putEntry = entries.find(e => e.strikePrice === atmStrike)
    const putPremium = putEntry?.PE?.lastPrice || spotPrice * 0.01

    return {
      action: 'BUY_PUT',
      confidence: netScore <= -5 ? 'HIGH' : 'MEDIUM',
      strikePrice: atmStrike,
      type: 'PUT',
      entry: putPremium,
      target: Math.round(putPremium * 1.5),
      stopLoss: Math.round(putPremium * 0.6),
      reasons,
    }
  } else {
    // Neutral
    reasons.push('No strong directional bias from option chain - wait for clarity')
    return {
      action: 'HOLD',
      confidence: 'LOW',
      strikePrice: atmStrike,
      type: 'NEUTRAL',
      entry: 0,
      target: 0,
      stopLoss: 0,
      reasons,
    }
  }
}

// ─── Fallback: Generate analysis from price data ────────────────────────────

export function generateFallbackAnalysis(
  symbol: string,
  spotPrice: number,
  changePercent: number,
  rsi?: number
): OptionChainAnalysis {
  // Simulate basic option chain analysis from price movement + RSI
  const strikeStep = symbol === 'BANKNIFTY' ? 100 : symbol === 'SENSEX' ? 100 : 50
  const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep

  const isBullish = changePercent > 0.3
  const isBearish = changePercent < -0.3
  const rsiValue = rsi || 50

  // Estimate PCR from momentum
  let pcr = 1.0
  if (isBullish) pcr = 1.1 + Math.min(changePercent * 0.1, 0.5)
  if (isBearish) pcr = 0.9 - Math.min(Math.abs(changePercent) * 0.1, 0.4)

  const supportStrike = atmStrike - strikeStep * 3
  const resistanceStrike = atmStrike + strikeStep * 3
  const maxPain = atmStrike + (isBullish ? strikeStep : isBearish ? -strikeStep : 0)

  const reasons: string[] = []
  let action: 'BUY_CALL' | 'BUY_PUT' | 'HOLD' = 'HOLD'
  let type: 'CALL' | 'PUT' | 'NEUTRAL' = 'NEUTRAL'
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'

  if (isBullish && rsiValue < 70) {
    action = 'BUY_CALL'
    type = 'CALL'
    confidence = changePercent > 1 ? 'HIGH' : 'MEDIUM'
    reasons.push(
      `Bullish momentum: ${changePercent.toFixed(2)}% move`,
      `RSI at ${rsiValue.toFixed(0)} - not overbought`,
      `Estimated PCR ${pcr.toFixed(2)} favors bulls`,
      `Support at ${supportStrike}, Resistance at ${resistanceStrike}`
    )
  } else if (isBearish && rsiValue > 30) {
    action = 'BUY_PUT'
    type = 'PUT'
    confidence = changePercent < -1 ? 'HIGH' : 'MEDIUM'
    reasons.push(
      `Bearish momentum: ${changePercent.toFixed(2)}% decline`,
      `RSI at ${rsiValue.toFixed(0)} - not oversold`,
      `Estimated PCR ${pcr.toFixed(2)} favors bears`,
      `Support at ${supportStrike}, Resistance at ${resistanceStrike}`
    )
  } else if (rsiValue > 70) {
    action = 'BUY_PUT'
    type = 'PUT'
    confidence = 'MEDIUM'
    reasons.push(
      `RSI ${rsiValue.toFixed(0)} - Overbought territory`,
      `Mean reversion expected, buy puts for protection`,
      `Support at ${supportStrike}`
    )
  } else if (rsiValue < 30) {
    action = 'BUY_CALL'
    type = 'CALL'
    confidence = 'MEDIUM'
    reasons.push(
      `RSI ${rsiValue.toFixed(0)} - Oversold territory`,
      `Bounce expected, buy calls for reversal trade`,
      `Resistance at ${resistanceStrike}`
    )
  } else {
    reasons.push(
      'No clear directional signal',
      `Market change ${changePercent.toFixed(2)}% is within noise range`,
      'Wait for option chain data or clearer trend'
    )
  }

  const estimatedPremium = spotPrice * 0.005
  return {
    symbol,
    spotPrice,
    pcr: Math.round(pcr * 100) / 100,
    pcrInterpretation: pcr > 1.0 ? 'Bullish - Put support building' : 'Bearish - Call resistance building',
    maxPainStrike: maxPain,
    highestCallOIStrike: resistanceStrike,
    highestPutOIStrike: supportStrike,
    callOITotal: 0,
    putOITotal: 0,
    callOIChange: 0,
    putOIChange: 0,
    avgCallIV: 15,
    avgPutIV: 16,
    ivSkew: 'Estimated - Live data unavailable',
    recommendation: {
      action,
      confidence,
      strikePrice: atmStrike,
      type,
      entry: action !== 'HOLD' ? Math.round(estimatedPremium) : 0,
      target: action !== 'HOLD' ? Math.round(estimatedPremium * 1.5) : 0,
      stopLoss: action !== 'HOLD' ? Math.round(estimatedPremium * 0.6) : 0,
      reasons,
    },
    topStrikes: [
      {
        strike: supportStrike,
        callOI: 0, putOI: 0,
        callOIChange: 0, putOIChange: 0,
        interpretation: '🟢 Estimated Support Level',
      },
      {
        strike: atmStrike,
        callOI: 0, putOI: 0,
        callOIChange: 0, putOIChange: 0,
        interpretation: '⚖️ ATM Strike',
      },
      {
        strike: resistanceStrike,
        callOI: 0, putOI: 0,
        callOIChange: 0, putOIChange: 0,
        interpretation: '🔴 Estimated Resistance Level',
      },
    ],
  }
}

// ─── Full Analysis Pipeline ─────────────────────────────────────────────────

export async function getOptionChainAnalysis(
  symbol: string,
  spotPrice: number,
  changePercent: number,
  rsi?: number
): Promise<OptionChainAnalysis> {
  try {
    const entries = await fetchOptionChain(symbol)
    if (entries && entries.length > 0) {
      const actualSpot = (entries as any).__spotPrice || spotPrice
      return analyzeOptionChain(symbol, entries, actualSpot)
    }
  } catch (error) {
    console.log(`Option chain fetch failed for ${symbol}, using fallback`)
  }

  // Fallback to price-based analysis
  return generateFallbackAnalysis(symbol, spotPrice, changePercent, rsi)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatOI(oi: number): string {
  if (Math.abs(oi) >= 10000000) return (oi / 10000000).toFixed(2) + ' Cr'
  if (Math.abs(oi) >= 100000) return (oi / 100000).toFixed(2) + ' L'
  if (Math.abs(oi) >= 1000) return (oi / 1000).toFixed(2) + ' K'
  return oi.toString()
}
