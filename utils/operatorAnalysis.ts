// Operator Game Detection - Identifies institutional manipulation patterns

interface CandleData {
  open: number
  high: number
  low: number
  close: number
  volume: number
  date?: Date
}

interface OperatorSignal {
  type: 'ACCUMULATION' | 'DISTRIBUTION' | 'BULL_TRAP' | 'BEAR_TRAP' | 'PUMP_DUMP' | 'BREAKOUT_FAKE' | 'SQUEEZE'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  action: 'BUY' | 'SELL' | 'AVOID' | 'WAIT'
  description: string
  indicators: string[]
}

export function detectOperatorGame(candles: CandleData[]): OperatorSignal | null {
  if (candles.length < 10) return null

  // Check for various operator patterns
  const accumulation = detectAccumulation(candles)
  if (accumulation) return accumulation

  const distribution = detectDistribution(candles)
  if (distribution) return distribution

  const bullTrap = detectBullTrap(candles)
  if (bullTrap) return bullTrap

  const bearTrap = detectBearTrap(candles)
  if (bearTrap) return bearTrap

  const pumpDump = detectPumpAndDump(candles)
  if (pumpDump) return pumpDump

  const fakeBreakout = detectFakeBreakout(candles)
  if (fakeBreakout) return fakeBreakout

  const squeeze = detectShortSqueeze(candles)
  if (squeeze) return squeeze

  return null
}

// 1. Accumulation Phase - Operators buying quietly
function detectAccumulation(candles: CandleData[]): OperatorSignal | null {
  const recent = candles.slice(-10)
  const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length
  
  let lowVolumeGreenCandles = 0
  let priceRange = 0
  let volumeIncreasing = false
  
  recent.forEach((candle, idx) => {
    const isGreen = candle.close > candle.open
    const isLowVolume = candle.volume < avgVolume * 0.8
    
    if (isGreen && isLowVolume) {
      lowVolumeGreenCandles++
    }
    
    priceRange += Math.abs(candle.high - candle.low)
  })
  
  // Check if volume is increasing in last 3 candles
  const lastThreeVolumes = recent.slice(-3).map(c => c.volume)
  volumeIncreasing = lastThreeVolumes[2] > lastThreeVolumes[0] * 1.2
  
  const avgPriceRange = priceRange / recent.length
  const currentRange = Math.abs(recent[recent.length - 1].high - recent[recent.length - 1].low)
  const tightRange = currentRange < avgPriceRange * 0.8
  
  // Accumulation signs: Low volume green candles, tight range, then volume spike
  if (lowVolumeGreenCandles >= 5 && tightRange && volumeIncreasing) {
    return {
      type: 'ACCUMULATION',
      confidence: 'HIGH',
      action: 'BUY',
      description: 'Operators accumulating quietly. Multiple low-volume green candles with tight range followed by volume spike. Strong buy signal before breakout.',
      indicators: [
        `${lowVolumeGreenCandles} low-volume green candles detected`,
        'Price consolidating in tight range',
        'Volume increasing - operators loading positions',
        'Expect strong upward move soon'
      ]
    }
  }
  
  return null
}

// 2. Distribution Phase - Operators selling into strength
function detectDistribution(candles: CandleData[]): OperatorSignal | null {
  const recent = candles.slice(-10)
  const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length
  
  let highVolumeRedCandles = 0
  let upperShadows = 0
  let priceStalling = false
  
  recent.forEach((candle, idx) => {
    const isRed = candle.close < candle.open
    const isHighVolume = candle.volume > avgVolume * 1.3
    const upperShadow = candle.high - Math.max(candle.open, candle.close)
    const body = Math.abs(candle.close - candle.open)
    
    if (isRed && isHighVolume) {
      highVolumeRedCandles++
    }
    
    if (upperShadow > body * 1.5) {
      upperShadows++
    }
  })
  
  // Check if price is making lower highs
  const highs = recent.slice(-5).map(c => c.high)
  priceStalling = highs[4] < highs[2] && highs[3] < highs[1]
  
  // Distribution signs: High volume red candles, long upper shadows, lower highs
  if (highVolumeRedCandles >= 3 && upperShadows >= 3 && priceStalling) {
    return {
      type: 'DISTRIBUTION',
      confidence: 'HIGH',
      action: 'SELL',
      description: 'Operators distributing (selling) into strength. High volume red candles with long upper shadows. Price making lower highs. Exit positions.',
      indicators: [
        `${highVolumeRedCandles} high-volume red candles`,
        `${upperShadows} candles with long upper shadows (rejection)`,
        'Price making lower highs - weakness',
        'Operators exiting - avoid longs'
      ]
    }
  }
  
  return null
}

// 3. Bull Trap - False breakout to trap retail buyers
function detectBullTrap(candles: CandleData[]): OperatorSignal | null {
  if (candles.length < 15) return null
  
  const recent = candles.slice(-15)
  const last5 = recent.slice(-5)
  const previous10 = recent.slice(0, 10)
  
  // Find resistance level
  const resistance = Math.max(...previous10.map(c => c.high))
  
  // Check if price broke above resistance then fell back
  let brokeResistance = false
  let fellBack = false
  
  last5.forEach((candle, idx) => {
    if (candle.high > resistance * 1.01) {
      brokeResistance = true
    }
    if (brokeResistance && idx > 1 && candle.close < resistance * 0.99) {
      fellBack = true
    }
  })
  
  const lastCandle = last5[last5.length - 1]
  const highVolume = lastCandle.volume > (recent.reduce((sum, c) => sum + c.volume, 0) / recent.length) * 1.5
  
  if (brokeResistance && fellBack && highVolume) {
    return {
      type: 'BULL_TRAP',
      confidence: 'HIGH',
      action: 'AVOID',
      description: 'Bull Trap detected! Price broke resistance to trap buyers, then reversed sharply. Operators sold into breakout. Avoid buying.',
      indicators: [
        `Fake breakout above ₹${resistance.toFixed(2)}`,
        'Sharp reversal with high volume',
        'Retail trapped at top - operators sold',
        'Wait for genuine support before buying'
      ]
    }
  }
  
  return null
}

// 4. Bear Trap - False breakdown to trap retail sellers
function detectBearTrap(candles: CandleData[]): OperatorSignal | null {
  if (candles.length < 15) return null
  
  const recent = candles.slice(-15)
  const last5 = recent.slice(-5)
  const previous10 = recent.slice(0, 10)
  
  // Find support level
  const support = Math.min(...previous10.map(c => c.low))
  
  // Check if price broke below support then recovered
  let brokeSupport = false
  let recovered = false
  
  last5.forEach((candle, idx) => {
    if (candle.low < support * 0.99) {
      brokeSupport = true
    }
    if (brokeSupport && idx > 1 && candle.close > support * 1.01) {
      recovered = true
    }
  })
  
  const lastCandle = last5[last5.length - 1]
  const highVolume = lastCandle.volume > (recent.reduce((sum, c) => sum + c.volume, 0) / recent.length) * 1.5
  
  if (brokeSupport && recovered && highVolume) {
    return {
      type: 'BEAR_TRAP',
      confidence: 'HIGH',
      action: 'BUY',
      description: 'Bear Trap detected! Price broke support to trap sellers, then reversed sharply upward. Operators accumulated at bottom. Strong buy opportunity.',
      indicators: [
        `Fake breakdown below ₹${support.toFixed(2)}`,
        'Sharp recovery with high volume',
        'Weak hands shaken out - operators bought',
        'Excellent entry point for longs'
      ]
    }
  }
  
  return null
}

// 5. Pump and Dump - Artificial price inflation
function detectPumpAndDump(candles: CandleData[]): OperatorSignal | null {
  const recent = candles.slice(-10)
  
  // Check for sudden spike followed by crash
  let maxGain = 0
  let maxGainIdx = 0
  
  recent.forEach((candle, idx) => {
    if (idx > 0) {
      const gain = ((candle.high - recent[idx - 1].close) / recent[idx - 1].close) * 100
      if (gain > maxGain) {
        maxGain = gain
        maxGainIdx = idx
      }
    }
  })
  
  // Check if crashed after spike
  let crashed = false
  if (maxGainIdx < recent.length - 2) {
    const afterSpike = recent.slice(maxGainIdx + 1)
    const avgDrop = afterSpike.reduce((sum, c, idx) => {
      if (idx > 0) {
        return sum + ((afterSpike[idx - 1].close - c.close) / afterSpike[idx - 1].close) * 100
      }
      return sum
    }, 0) / (afterSpike.length - 1)
    
    crashed = avgDrop > 2
  }
  
  if (maxGain > 5 && crashed) {
    return {
      type: 'PUMP_DUMP',
      confidence: 'HIGH',
      action: 'AVOID',
      description: 'Pump & Dump scheme detected! Artificial spike followed by sharp crash. Operators pumped price and dumped on retail. Stay away.',
      indicators: [
        `Sudden ${maxGain.toFixed(1)}% spike detected`,
        'Sharp crash after spike',
        'Classic operator manipulation',
        'Avoid - high risk of further downside'
      ]
    }
  }
  
  return null
}

// 6. Fake Breakout - Volume analysis
function detectFakeBreakout(candles: CandleData[]): OperatorSignal | null {
  if (candles.length < 20) return null
  
  const recent = candles.slice(-20)
  const last3 = recent.slice(-3)
  const previous = recent.slice(0, -3)
  
  const avgVolume = previous.reduce((sum, c) => sum + c.volume, 0) / previous.length
  const recentVolume = last3.reduce((sum, c) => sum + c.volume, 0) / last3.length
  
  // Low volume breakout = fake
  const lowVolumeBreakout = recentVolume < avgVolume * 0.7
  
  const resistance = Math.max(...previous.map(c => c.high))
  const brokeResistance = last3.some(c => c.high > resistance * 1.02)
  
  if (brokeResistance && lowVolumeBreakout) {
    return {
      type: 'BREAKOUT_FAKE',
      confidence: 'MEDIUM',
      action: 'WAIT',
      description: 'Fake breakout on low volume. Genuine breakouts need volume confirmation. Operators testing resistance. Wait for volume surge.',
      indicators: [
        'Breakout without volume support',
        'Likely to fail and reverse',
        'Wait for volume confirmation',
        'Operators testing retail interest'
      ]
    }
  }
  
  return null
}

// 7. Short Squeeze - Trapped shorts
function detectShortSqueeze(candles: CandleData[]): OperatorSignal | null {
  const recent = candles.slice(-10)
  
  // Look for: Sharp fall, then sudden sharp rise with volume
  let sharpFall = false
  let sharpRise = false
  let volumeSpike = false
  
  const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length
  
  // Check first 5 for fall
  const first5 = recent.slice(0, 5)
  const fallPercent = ((first5[0].close - first5[4].close) / first5[0].close) * 100
  sharpFall = fallPercent > 5
  
  // Check last 3 for rise
  const last3 = recent.slice(-3)
  const risePercent = ((last3[2].close - last3[0].open) / last3[0].open) * 100
  sharpRise = risePercent > 4
  
  volumeSpike = last3.some(c => c.volume > avgVolume * 2)
  
  if (sharpFall && sharpRise && volumeSpike) {
    return {
      type: 'SQUEEZE',
      confidence: 'HIGH',
      action: 'BUY',
      description: 'Short Squeeze in progress! Sharp fall trapped shorts, now forced to cover. Explosive upward move with high volume. Ride the momentum.',
      indicators: [
        `${fallPercent.toFixed(1)}% fall trapped short sellers`,
        `${risePercent.toFixed(1)}% sharp recovery`,
        'Volume spike - shorts covering',
        'Strong momentum - join the rally'
      ]
    }
  }
  
  return null
}

// Operator Strength Score (0-100)
export function calculateOperatorStrength(candles: CandleData[]): {
  score: number
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  description: string
} {
  if (candles.length < 10) {
    return { score: 50, sentiment: 'NEUTRAL', description: 'Insufficient data' }
  }
  
  const recent = candles.slice(-10)
  const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length
  
  let bullishScore = 0
  let bearishScore = 0
  
  recent.forEach((candle, idx) => {
    const isGreen = candle.close > candle.open
    const volumeRatio = candle.volume / avgVolume
    const body = Math.abs(candle.close - candle.open)
    const range = candle.high - candle.low
    const bodyRatio = body / range
    
    // Strong green candle with volume
    if (isGreen && volumeRatio > 1.2 && bodyRatio > 0.6) {
      bullishScore += 10 * volumeRatio
    }
    
    // Strong red candle with volume
    if (!isGreen && volumeRatio > 1.2 && bodyRatio > 0.6) {
      bearishScore += 10 * volumeRatio
    }
    
    // Recent candles have more weight
    const recencyWeight = (idx + 1) / recent.length
    bullishScore *= (1 + recencyWeight * 0.5)
    bearishScore *= (1 + recencyWeight * 0.5)
  })
  
  const totalScore = bullishScore + bearishScore
  const operatorScore = Math.min(100, (bullishScore / (totalScore || 1)) * 100)
  
  let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
  let description = ''
  
  if (operatorScore > 65) {
    sentiment = 'BULLISH'
    description = 'Strong operator buying detected. Institutions accumulating positions.'
  } else if (operatorScore < 35) {
    sentiment = 'BEARISH'
    description = 'Strong operator selling detected. Institutions distributing positions.'
  } else {
    description = 'Balanced operator activity. No clear directional bias.'
  }
  
  return {
    score: Math.round(operatorScore),
    sentiment,
    description
  }
}
