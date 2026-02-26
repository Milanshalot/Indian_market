// Smart Money Concepts (SMC) Analysis
// Detects institutional trading patterns: liquidity sweeps, order blocks, FVGs, BOS, CHOCH

interface CandleData {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp?: number
}

interface LiquiditySweep {
  type: 'BULLISH' | 'BEARISH'
  price: number
  timestamp: number
  description: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

interface OrderBlock {
  type: 'BULLISH' | 'BEARISH'
  high: number
  low: number
  timestamp: number
  strength: 'STRONG' | 'MODERATE' | 'WEAK'
  description: string
}

interface FairValueGap {
  type: 'BULLISH' | 'BEARISH'
  top: number
  bottom: number
  timestamp: number
  filled: boolean
  description: string
}

interface BreakOfStructure {
  type: 'BULLISH_BOS' | 'BEARISH_BOS'
  price: number
  timestamp: number
  previousStructure: number
  description: string
}

interface ChangeOfCharacter {
  type: 'BULLISH_CHOCH' | 'BEARISH_CHOCH'
  price: number
  timestamp: number
  description: string
  significance: 'HIGH' | 'MEDIUM' | 'LOW'
}

interface InstitutionalCandle {
  index: number
  type: 'BULLISH' | 'BEARISH'
  volume: number
  bodySize: number
  description: string
}

interface SupplyDemandZone {
  type: 'SUPPLY' | 'DEMAND'
  top: number
  bottom: number
  strength: number // 0-100
  touches: number
  description: string
}

export interface SMCAnalysis {
  liquiditySweeps: LiquiditySweep[]
  orderBlocks: OrderBlock[]
  fairValueGaps: FairValueGap[]
  marketStructure: 'BULLISH' | 'BEARISH' | 'RANGING'
  bos: BreakOfStructure | null
  choch: ChangeOfCharacter | null
  institutionalCandles: InstitutionalCandle[]
  supplyDemandZones: SupplyDemandZone[]
  overallConfidence: number // 0-100
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
  reasoning: string[]
}

// Main SMC Analysis Function
export function analyzeSMC(candles: CandleData[]): SMCAnalysis {
  if (candles.length < 50) {
    return getDefaultAnalysis()
  }

  const liquiditySweeps = detectLiquiditySweeps(candles)
  const orderBlocks = detectOrderBlocks(candles)
  const fairValueGaps = detectFairValueGaps(candles)
  const marketStructure = determineMarketStructure(candles)
  const bos = detectBreakOfStructure(candles)
  const choch = detectChangeOfCharacter(candles)
  const institutionalCandles = detectInstitutionalCandles(candles)
  const supplyDemandZones = identifySupplyDemandZones(candles)

  const { confidence, recommendation, reasoning } = calculateSMCScore(
    liquiditySweeps,
    orderBlocks,
    fairValueGaps,
    marketStructure,
    bos,
    choch,
    institutionalCandles,
    supplyDemandZones
  )

  return {
    liquiditySweeps,
    orderBlocks,
    fairValueGaps,
    marketStructure,
    bos,
    choch,
    institutionalCandles,
    supplyDemandZones,
    overallConfidence: confidence,
    recommendation,
    reasoning,
  }
}

// 1. Detect Liquidity Sweeps (Stop Hunts)
function detectLiquiditySweeps(candles: CandleData[]): LiquiditySweep[] {
  const sweeps: LiquiditySweep[] = []
  const lookback = 20

  for (let i = lookback; i < candles.length - 1; i++) {
    const current = candles[i]
    const next = candles[i + 1]
    const previous = candles.slice(i - lookback, i)

    // Find swing high/low in previous candles
    const swingHigh = Math.max(...previous.map(c => c.high))
    const swingLow = Math.min(...previous.map(c => c.low))

    // Bullish Liquidity Sweep: Price dips below swing low then reverses
    if (current.low < swingLow && next.close > current.open && next.close > swingLow) {
      sweeps.push({
        type: 'BULLISH',
        price: current.low,
        timestamp: current.timestamp || i,
        description: `Bullish liquidity sweep at ₹${current.low.toFixed(2)}. Price swept below ₹${swingLow.toFixed(2)} to trigger stops, then reversed sharply. Smart money accumulated.`,
        confidence: next.close > current.open * 1.01 ? 'HIGH' : 'MEDIUM',
      })
    }

    // Bearish Liquidity Sweep: Price spikes above swing high then reverses
    if (current.high > swingHigh && next.close < current.open && next.close < swingHigh) {
      sweeps.push({
        type: 'BEARISH',
        price: current.high,
        timestamp: current.timestamp || i,
        description: `Bearish liquidity sweep at ₹${current.high.toFixed(2)}. Price swept above ₹${swingHigh.toFixed(2)} to trigger stops, then reversed. Smart money distributed.`,
        confidence: next.close < current.open * 0.99 ? 'HIGH' : 'MEDIUM',
      })
    }
  }

  return sweeps.slice(-5) // Return last 5 sweeps
}

// 2. Detect Order Blocks
function detectOrderBlocks(candles: CandleData[]): OrderBlock[] {
  const orderBlocks: OrderBlock[] = []

  for (let i = 1; i < candles.length - 3; i++) {
    const current = candles[i]
    const next = candles[i + 1]
    const nextTwo = candles[i + 2]
    const nextThree = candles[i + 3]

    // Bullish Order Block: Last bearish candle before strong bullish move
    const isBearish = current.close < current.open
    const strongBullishMove = next.close > next.open && 
                              nextTwo.close > nextTwo.open && 
                              nextThree.close > current.high

    if (isBearish && strongBullishMove) {
      const strength = nextThree.close > current.high * 1.03 ? 'STRONG' : 
                       nextThree.close > current.high * 1.015 ? 'MODERATE' : 'WEAK'
      
      orderBlocks.push({
        type: 'BULLISH',
        high: current.high,
        low: current.low,
        timestamp: current.timestamp || i,
        strength,
        description: `Bullish order block at ₹${current.low.toFixed(2)}-₹${current.high.toFixed(2)}. Institutions entered here before ${((nextThree.close - current.high) / current.high * 100).toFixed(1)}% rally.`,
      })
    }

    // Bearish Order Block: Last bullish candle before strong bearish move
    const isBullish = current.close > current.open
    const strongBearishMove = next.close < next.open && 
                              nextTwo.close < nextTwo.open && 
                              nextThree.close < current.low

    if (isBullish && strongBearishMove) {
      const strength = nextThree.close < current.low * 0.97 ? 'STRONG' : 
                       nextThree.close < current.low * 0.985 ? 'MODERATE' : 'WEAK'
      
      orderBlocks.push({
        type: 'BEARISH',
        high: current.high,
        low: current.low,
        timestamp: current.timestamp || i,
        strength,
        description: `Bearish order block at ₹${current.low.toFixed(2)}-₹${current.high.toFixed(2)}. Institutions distributed here before ${((current.low - nextThree.close) / current.low * 100).toFixed(1)}% drop.`,
      })
    }
  }

  return orderBlocks.slice(-3) // Return last 3 order blocks
}

// 3. Detect Fair Value Gaps (FVG)
function detectFairValueGaps(candles: CandleData[]): FairValueGap[] {
  const fvgs: FairValueGap[] = []

  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1]
    const current = candles[i]
    const next = candles[i + 1]

    // Bullish FVG: Gap between prev high and next low
    if (next.low > prev.high && current.close > current.open) {
      const gapSize = ((next.low - prev.high) / prev.high) * 100
      if (gapSize > 0.3) { // Minimum 0.3% gap
        fvgs.push({
          type: 'BULLISH',
          top: next.low,
          bottom: prev.high,
          timestamp: current.timestamp || i,
          filled: false,
          description: `Bullish FVG at ₹${prev.high.toFixed(2)}-₹${next.low.toFixed(2)} (${gapSize.toFixed(2)}% gap). Imbalance indicates strong buying pressure.`,
        })
      }
    }

    // Bearish FVG: Gap between prev low and next high
    if (next.high < prev.low && current.close < current.open) {
      const gapSize = ((prev.low - next.high) / prev.low) * 100
      if (gapSize > 0.3) {
        fvgs.push({
          type: 'BEARISH',
          top: prev.low,
          bottom: next.high,
          timestamp: current.timestamp || i,
          filled: false,
          description: `Bearish FVG at ₹${next.high.toFixed(2)}-₹${prev.low.toFixed(2)} (${gapSize.toFixed(2)}% gap). Imbalance indicates strong selling pressure.`,
        })
      }
    }
  }

  return fvgs.slice(-5)
}

// 4. Determine Market Structure
function determineMarketStructure(candles: CandleData[]): 'BULLISH' | 'BEARISH' | 'RANGING' {
  const recent = candles.slice(-20)
  const highs = recent.map(c => c.high)
  const lows = recent.map(c => c.low)

  let higherHighs = 0
  let higherLows = 0
  let lowerHighs = 0
  let lowerLows = 0

  for (let i = 2; i < recent.length; i++) {
    if (highs[i] > highs[i - 2]) higherHighs++
    if (lows[i] > lows[i - 2]) higherLows++
    if (highs[i] < highs[i - 2]) lowerHighs++
    if (lows[i] < lows[i - 2]) lowerLows++
  }

  if (higherHighs >= 8 && higherLows >= 8) return 'BULLISH'
  if (lowerHighs >= 8 && lowerLows >= 8) return 'BEARISH'
  return 'RANGING'
}

// 5. Detect Break of Structure (BOS)
function detectBreakOfStructure(candles: CandleData[]): BreakOfStructure | null {
  const recent = candles.slice(-30)
  const current = candles[candles.length - 1]

  // Find recent swing high/low
  const swingHigh = Math.max(...recent.slice(0, -5).map(c => c.high))
  const swingLow = Math.min(...recent.slice(0, -5).map(c => c.low))

  // Bullish BOS: Price breaks above recent swing high
  if (current.close > swingHigh) {
    return {
      type: 'BULLISH_BOS',
      price: current.close,
      timestamp: current.timestamp || candles.length - 1,
      previousStructure: swingHigh,
      description: `Bullish Break of Structure! Price broke above ₹${swingHigh.toFixed(2)}, confirming uptrend continuation.`,
    }
  }

  // Bearish BOS: Price breaks below recent swing low
  if (current.close < swingLow) {
    return {
      type: 'BEARISH_BOS',
      price: current.close,
      timestamp: current.timestamp || candles.length - 1,
      previousStructure: swingLow,
      description: `Bearish Break of Structure! Price broke below ₹${swingLow.toFixed(2)}, confirming downtrend continuation.`,
    }
  }

  return null
}

// 6. Detect Change of Character (CHOCH)
function detectChangeOfCharacter(candles: CandleData[]): ChangeOfCharacter | null {
  const recent = candles.slice(-20)
  const structure = determineMarketStructure(candles.slice(-40, -20))
  const currentStructure = determineMarketStructure(recent)

  if (structure === 'BULLISH' && currentStructure === 'BEARISH') {
    return {
      type: 'BEARISH_CHOCH',
      price: recent[recent.length - 1].close,
      timestamp: recent[recent.length - 1].timestamp || candles.length - 1,
      description: 'Change of Character detected! Market shifted from bullish to bearish structure. Potential trend reversal.',
      significance: 'HIGH',
    }
  }

  if (structure === 'BEARISH' && currentStructure === 'BULLISH') {
    return {
      type: 'BULLISH_CHOCH',
      price: recent[recent.length - 1].close,
      timestamp: recent[recent.length - 1].timestamp || candles.length - 1,
      description: 'Change of Character detected! Market shifted from bearish to bullish structure. Potential trend reversal.',
      significance: 'HIGH',
    }
  }

  return null
}

// 7. Detect Institutional Candles
function detectInstitutionalCandles(candles: CandleData[]): InstitutionalCandle[] {
  const institutional: InstitutionalCandle[] = []
  const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length

  candles.forEach((candle, index) => {
    const body = Math.abs(candle.close - candle.open)
    const range = candle.high - candle.low
    const bodyRatio = body / range

    // Institutional candle: High volume + Large body
    if (candle.volume > avgVolume * 2 && bodyRatio > 0.7) {
      institutional.push({
        index,
        type: candle.close > candle.open ? 'BULLISH' : 'BEARISH',
        volume: candle.volume,
        bodySize: body,
        description: `Institutional ${candle.close > candle.open ? 'buying' : 'selling'} detected. Volume: ${(candle.volume / avgVolume).toFixed(1)}x average, Body: ${(bodyRatio * 100).toFixed(0)}% of range.`,
      })
    }
  })

  return institutional.slice(-5)
}

// 8. Identify Supply/Demand Zones
function identifySupplyDemandZones(candles: CandleData[]): SupplyDemandZone[] {
  const zones: SupplyDemandZone[] = []
  const lookback = 50

  for (let i = lookback; i < candles.length - 10; i++) {
    const zone = candles.slice(i - 5, i + 1)
    const after = candles.slice(i + 1, i + 11)

    const zoneHigh = Math.max(...zone.map(c => c.high))
    const zoneLow = Math.min(...zone.map(c => c.low))
    const zoneRange = zoneHigh - zoneLow

    // Demand Zone: Price consolidates then rallies
    const rally = after.filter(c => c.close > zoneHigh * 1.02).length
    if (rally >= 5) {
      const touches = candles.slice(i + 11).filter(c => c.low <= zoneHigh && c.low >= zoneLow).length
      zones.push({
        type: 'DEMAND',
        top: zoneHigh,
        bottom: zoneLow,
        strength: Math.min(100, rally * 10 + touches * 5),
        touches,
        description: `Demand zone at ₹${zoneLow.toFixed(2)}-₹${zoneHigh.toFixed(2)}. Strong buying interest, ${touches} retests.`,
      })
    }

    // Supply Zone: Price consolidates then drops
    const drop = after.filter(c => c.close < zoneLow * 0.98).length
    if (drop >= 5) {
      const touches = candles.slice(i + 11).filter(c => c.high >= zoneLow && c.high <= zoneHigh).length
      zones.push({
        type: 'SUPPLY',
        top: zoneHigh,
        bottom: zoneLow,
        strength: Math.min(100, drop * 10 + touches * 5),
        touches,
        description: `Supply zone at ₹${zoneLow.toFixed(2)}-₹${zoneHigh.toFixed(2)}. Strong selling pressure, ${touches} retests.`,
      })
    }
  }

  return zones.slice(-3)
}

// Calculate Overall SMC Score
function calculateSMCScore(
  liquiditySweeps: LiquiditySweep[],
  orderBlocks: OrderBlock[],
  fairValueGaps: FairValueGap[],
  marketStructure: string,
  bos: BreakOfStructure | null,
  choch: ChangeOfCharacter | null,
  institutionalCandles: InstitutionalCandle[],
  supplyDemandZones: SupplyDemandZone[]
): { confidence: number; recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'; reasoning: string[] } {
  let bullishScore = 0
  let bearishScore = 0
  const reasoning: string[] = []

  // Liquidity Sweeps
  const recentBullishSweeps = liquiditySweeps.filter(s => s.type === 'BULLISH').length
  const recentBearishSweeps = liquiditySweeps.filter(s => s.type === 'BEARISH').length
  bullishScore += recentBullishSweeps * 15
  bearishScore += recentBearishSweeps * 15
  if (recentBullishSweeps > 0) reasoning.push(`${recentBullishSweeps} bullish liquidity sweep(s) detected`)
  if (recentBearishSweeps > 0) reasoning.push(`${recentBearishSweeps} bearish liquidity sweep(s) detected`)

  // Order Blocks
  const bullishOB = orderBlocks.filter(ob => ob.type === 'BULLISH' && ob.strength === 'STRONG').length
  const bearishOB = orderBlocks.filter(ob => ob.type === 'BEARISH' && ob.strength === 'STRONG').length
  bullishScore += bullishOB * 20
  bearishScore += bearishOB * 20
  if (bullishOB > 0) reasoning.push(`${bullishOB} strong bullish order block(s)`)
  if (bearishOB > 0) reasoning.push(`${bearishOB} strong bearish order block(s)`)

  // Fair Value Gaps
  const bullishFVG = fairValueGaps.filter(fvg => fvg.type === 'BULLISH').length
  const bearishFVG = fairValueGaps.filter(fvg => fvg.type === 'BEARISH').length
  bullishScore += bullishFVG * 10
  bearishScore += bearishFVG * 10

  // Market Structure
  if (marketStructure === 'BULLISH') {
    bullishScore += 25
    reasoning.push('Bullish market structure (higher highs & higher lows)')
  } else if (marketStructure === 'BEARISH') {
    bearishScore += 25
    reasoning.push('Bearish market structure (lower highs & lower lows)')
  }

  // BOS/CHOCH
  if (bos?.type === 'BULLISH_BOS') {
    bullishScore += 20
    reasoning.push('Bullish Break of Structure confirmed')
  } else if (bos?.type === 'BEARISH_BOS') {
    bearishScore += 20
    reasoning.push('Bearish Break of Structure confirmed')
  }

  if (choch?.type === 'BULLISH_CHOCH') {
    bullishScore += 25
    reasoning.push('Bullish Change of Character - trend reversal')
  } else if (choch?.type === 'BEARISH_CHOCH') {
    bearishScore += 25
    reasoning.push('Bearish Change of Character - trend reversal')
  }

  // Institutional Candles
  const recentBullishInst = institutionalCandles.filter(ic => ic.type === 'BULLISH').length
  const recentBearishInst = institutionalCandles.filter(ic => ic.type === 'BEARISH').length
  bullishScore += recentBullishInst * 10
  bearishScore += recentBearishInst * 10

  const totalScore = bullishScore + bearishScore
  const confidence = Math.min(100, Math.round((Math.max(bullishScore, bearishScore) / (totalScore || 1)) * 100))

  let recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' = 'HOLD'
  if (bullishScore > bearishScore * 1.5) recommendation = 'STRONG_BUY'
  else if (bullishScore > bearishScore) recommendation = 'BUY'
  else if (bearishScore > bullishScore * 1.5) recommendation = 'STRONG_SELL'
  else if (bearishScore > bullishScore) recommendation = 'SELL'

  return { confidence, recommendation, reasoning }
}

function getDefaultAnalysis(): SMCAnalysis {
  return {
    liquiditySweeps: [],
    orderBlocks: [],
    fairValueGaps: [],
    marketStructure: 'RANGING',
    bos: null,
    choch: null,
    institutionalCandles: [],
    supplyDemandZones: [],
    overallConfidence: 0,
    recommendation: 'HOLD',
    reasoning: ['Insufficient data for SMC analysis'],
  }
}
