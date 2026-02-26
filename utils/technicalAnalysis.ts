// Technical Analysis Utilities for Chart Patterns and Candlestick Analysis

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
  description: string
}

// Candlestick Pattern Detection
export function detectCandlestickPatterns(candles: CandleData[]): TechnicalSignal[] {
  const signals: TechnicalSignal[] = []
  
  if (candles.length < 3) return signals

  const current = candles[candles.length - 1]
  const previous = candles[candles.length - 2]
  const twoDaysAgo = candles[candles.length - 3]

  // Bullish Patterns
  
  // 1. Bullish Engulfing
  if (isBullishEngulfing(previous, current)) {
    signals.push({
      pattern: 'Bullish Engulfing',
      signal: 'BULLISH',
      strength: 'STRONG',
      description: 'Strong reversal pattern. Green candle completely engulfs previous red candle. Buyers taking control.'
    })
  }

  // 2. Morning Star
  if (isMorningStar(twoDaysAgo, previous, current)) {
    signals.push({
      pattern: 'Morning Star',
      signal: 'BULLISH',
      strength: 'STRONG',
      description: 'Three-candle reversal pattern indicating trend change from bearish to bullish. Strong buy signal.'
    })
  }

  // 3. Hammer
  if (isHammer(current)) {
    signals.push({
      pattern: 'Hammer',
      signal: 'BULLISH',
      strength: 'MODERATE',
      description: 'Bullish reversal pattern with long lower shadow. Buyers rejected lower prices, potential uptrend.'
    })
  }

  // 4. Piercing Pattern
  if (isPiercingPattern(previous, current)) {
    signals.push({
      pattern: 'Piercing Pattern',
      signal: 'BULLISH',
      strength: 'MODERATE',
      description: 'Bullish reversal pattern. Green candle closes above midpoint of previous red candle.'
    })
  }

  // Bearish Patterns
  
  // 5. Bearish Engulfing
  if (isBearishEngulfing(previous, current)) {
    signals.push({
      pattern: 'Bearish Engulfing',
      signal: 'BEARISH',
      strength: 'STRONG',
      description: 'Strong reversal pattern. Red candle completely engulfs previous green candle. Sellers dominating.'
    })
  }

  // 6. Evening Star
  if (isEveningstar(twoDaysAgo, previous, current)) {
    signals.push({
      pattern: 'Evening Star',
      signal: 'BEARISH',
      strength: 'STRONG',
      description: 'Three-candle reversal pattern indicating trend change from bullish to bearish. Strong sell signal.'
    })
  }

  // 7. Shooting Star
  if (isShootingStar(current)) {
    signals.push({
      pattern: 'Shooting Star',
      signal: 'BEARISH',
      strength: 'MODERATE',
      description: 'Bearish reversal pattern with long upper shadow. Sellers rejected higher prices, potential downtrend.'
    })
  }

  // 8. Dark Cloud Cover
  if (isDarkCloudCover(previous, current)) {
    signals.push({
      pattern: 'Dark Cloud Cover',
      signal: 'BEARISH',
      strength: 'MODERATE',
      description: 'Bearish reversal pattern. Red candle closes below midpoint of previous green candle.'
    })
  }

  // 9. Doji
  if (isDoji(current)) {
    signals.push({
      pattern: 'Doji',
      signal: 'NEUTRAL',
      strength: 'WEAK',
      description: 'Indecision pattern. Open and close are nearly equal. Market uncertainty, wait for confirmation.'
    })
  }

  return signals
}

// Chart Pattern Detection
export function detectChartPatterns(candles: CandleData[]): TechnicalSignal[] {
  const signals: TechnicalSignal[] = []
  
  if (candles.length < 10) return signals

  const closes = candles.map(c => c.close)
  const highs = candles.map(c => c.high)
  const lows = candles.map(c => c.low)

  // 1. Higher Highs and Higher Lows (Uptrend)
  if (isUptrend(closes)) {
    signals.push({
      pattern: 'Uptrend',
      signal: 'BULLISH',
      strength: 'STRONG',
      description: 'Series of higher highs and higher lows. Strong upward momentum. Trend is your friend.'
    })
  }

  // 2. Lower Highs and Lower Lows (Downtrend)
  if (isDowntrend(closes)) {
    signals.push({
      pattern: 'Downtrend',
      signal: 'BEARISH',
      strength: 'STRONG',
      description: 'Series of lower highs and lower lows. Strong downward momentum. Avoid longs.'
    })
  }

  // 3. Double Bottom (Bullish)
  if (isDoubleBottom(lows)) {
    signals.push({
      pattern: 'Double Bottom',
      signal: 'BULLISH',
      strength: 'STRONG',
      description: 'W-shaped pattern indicating strong support. Bullish reversal signal after downtrend.'
    })
  }

  // 4. Double Top (Bearish)
  if (isDoubleTop(highs)) {
    signals.push({
      pattern: 'Double Top',
      signal: 'BEARISH',
      strength: 'STRONG',
      description: 'M-shaped pattern indicating strong resistance. Bearish reversal signal after uptrend.'
    })
  }

  // 5. Breakout
  const breakout = detectBreakout(candles)
  if (breakout) {
    signals.push(breakout)
  }

  return signals
}

// Buyer/Seller Pressure Analysis
export function analyzeBuyerSellerPressure(candles: CandleData[]): TechnicalSignal {
  if (candles.length < 5) {
    return {
      pattern: 'Insufficient Data',
      signal: 'NEUTRAL',
      strength: 'WEAK',
      description: 'Not enough data for pressure analysis'
    }
  }

  const recent = candles.slice(-5)
  let buyerPressure = 0
  let sellerPressure = 0

  recent.forEach(candle => {
    const body = Math.abs(candle.close - candle.open)
    const range = candle.high - candle.low
    const upperShadow = candle.high - Math.max(candle.open, candle.close)
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low

    // Green candle = buyer pressure
    if (candle.close > candle.open) {
      buyerPressure += body / range
      buyerPressure += lowerShadow / range * 0.5 // Lower shadow shows buying support
    } else {
      sellerPressure += body / range
      sellerPressure += upperShadow / range * 0.5 // Upper shadow shows selling pressure
    }

    // Volume analysis
    if (candle.volume > 0) {
      const volumeWeight = candle.volume / 1000000
      if (candle.close > candle.open) {
        buyerPressure += volumeWeight * 0.1
      } else {
        sellerPressure += volumeWeight * 0.1
      }
    }
  })

  const ratio = buyerPressure / (buyerPressure + sellerPressure)

  if (ratio > 0.65) {
    return {
      pattern: 'Strong Buyer Pressure',
      signal: 'BULLISH',
      strength: 'STRONG',
      description: `Buyers dominating with ${(ratio * 100).toFixed(0)}% pressure. Strong accumulation phase. Good for long positions.`
    }
  } else if (ratio > 0.55) {
    return {
      pattern: 'Moderate Buyer Pressure',
      signal: 'BULLISH',
      strength: 'MODERATE',
      description: `Buyers slightly ahead with ${(ratio * 100).toFixed(0)}% pressure. Cautious bullish sentiment.`
    }
  } else if (ratio < 0.35) {
    return {
      pattern: 'Strong Seller Pressure',
      signal: 'BEARISH',
      strength: 'STRONG',
      description: `Sellers dominating with ${((1 - ratio) * 100).toFixed(0)}% pressure. Strong distribution phase. Avoid longs.`
    }
  } else if (ratio < 0.45) {
    return {
      pattern: 'Moderate Seller Pressure',
      signal: 'BEARISH',
      strength: 'MODERATE',
      description: `Sellers slightly ahead with ${((1 - ratio) * 100).toFixed(0)}% pressure. Cautious bearish sentiment.`
    }
  } else {
    return {
      pattern: 'Balanced Pressure',
      signal: 'NEUTRAL',
      strength: 'WEAK',
      description: 'Buyers and sellers in equilibrium. Wait for clear direction before trading.'
    }
  }
}

// Helper Functions

function isBullishEngulfing(prev: CandleData, curr: CandleData): boolean {
  return prev.close < prev.open && // Previous is bearish
         curr.close > curr.open && // Current is bullish
         curr.open < prev.close && // Opens below previous close
         curr.close > prev.open    // Closes above previous open
}

function isBearishEngulfing(prev: CandleData, curr: CandleData): boolean {
  return prev.close > prev.open && // Previous is bullish
         curr.close < curr.open && // Current is bearish
         curr.open > prev.close && // Opens above previous close
         curr.close < prev.open    // Closes below previous open
}

function isMorningStar(first: CandleData, second: CandleData, third: CandleData): boolean {
  const firstBearish = first.close < first.open
  const secondSmall = Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.3
  const thirdBullish = third.close > third.open && third.close > (first.open + first.close) / 2
  return firstBearish && secondSmall && thirdBullish
}

function isEveningstar(first: CandleData, second: CandleData, third: CandleData): boolean {
  const firstBullish = first.close > first.open
  const secondSmall = Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.3
  const thirdBearish = third.close < third.open && third.close < (first.open + first.close) / 2
  return firstBullish && secondSmall && thirdBearish
}

function isHammer(candle: CandleData): boolean {
  const body = Math.abs(candle.close - candle.open)
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low
  const upperShadow = candle.high - Math.max(candle.open, candle.close)
  return lowerShadow > body * 2 && upperShadow < body * 0.5
}

function isShootingStar(candle: CandleData): boolean {
  const body = Math.abs(candle.close - candle.open)
  const upperShadow = candle.high - Math.max(candle.open, candle.close)
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low
  return upperShadow > body * 2 && lowerShadow < body * 0.5
}

function isDoji(candle: CandleData): boolean {
  const body = Math.abs(candle.close - candle.open)
  const range = candle.high - candle.low
  return body < range * 0.1
}

function isPiercingPattern(prev: CandleData, curr: CandleData): boolean {
  return prev.close < prev.open && // Previous is bearish
         curr.close > curr.open && // Current is bullish
         curr.close > (prev.open + prev.close) / 2 && // Closes above midpoint
         curr.close < prev.open
}

function isDarkCloudCover(prev: CandleData, curr: CandleData): boolean {
  return prev.close > prev.open && // Previous is bullish
         curr.close < curr.open && // Current is bearish
         curr.close < (prev.open + prev.close) / 2 && // Closes below midpoint
         curr.close > prev.open
}

function isUptrend(closes: number[]): boolean {
  const recent = closes.slice(-10)
  let higherHighs = 0
  let higherLows = 0
  
  for (let i = 2; i < recent.length; i++) {
    if (recent[i] > recent[i - 2]) higherHighs++
    if (recent[i] > recent[i - 2]) higherLows++
  }
  
  return higherHighs >= 6 && higherLows >= 6
}

function isDowntrend(closes: number[]): boolean {
  const recent = closes.slice(-10)
  let lowerHighs = 0
  let lowerLows = 0
  
  for (let i = 2; i < recent.length; i++) {
    if (recent[i] < recent[i - 2]) lowerHighs++
    if (recent[i] < recent[i - 2]) lowerLows++
  }
  
  return lowerHighs >= 6 && lowerLows >= 6
}

function isDoubleBottom(lows: number[]): boolean {
  const recent = lows.slice(-20)
  const min1 = Math.min(...recent.slice(0, 10))
  const min2 = Math.min(...recent.slice(10))
  const diff = Math.abs(min1 - min2) / min1
  return diff < 0.02 // Within 2%
}

function isDoubleTop(highs: number[]): boolean {
  const recent = highs.slice(-20)
  const max1 = Math.max(...recent.slice(0, 10))
  const max2 = Math.max(...recent.slice(10))
  const diff = Math.abs(max1 - max2) / max1
  return diff < 0.02 // Within 2%
}

function detectBreakout(candles: CandleData[]): TechnicalSignal | null {
  const recent = candles.slice(-20)
  const current = candles[candles.length - 1]
  
  const highs = recent.map(c => c.high)
  const lows = recent.map(c => c.low)
  
  const resistance = Math.max(...highs.slice(0, -1))
  const support = Math.min(...lows.slice(0, -1))
  
  if (current.close > resistance * 1.01) {
    return {
      pattern: 'Resistance Breakout',
      signal: 'BULLISH',
      strength: 'STRONG',
      description: `Price broke above resistance at ₹${resistance.toFixed(2)}. Strong bullish breakout with momentum.`
    }
  }
  
  if (current.close < support * 0.99) {
    return {
      pattern: 'Support Breakdown',
      signal: 'BEARISH',
      strength: 'STRONG',
      description: `Price broke below support at ₹${support.toFixed(2)}. Strong bearish breakdown, avoid longs.`
    }
  }
  
  return null
}
