// Option Strike Price Calculator for Indian Markets

interface OptionRecommendation {
  strikePrice: number
  optionType: 'CALL' | 'PUT'
  premium: number
  breakeven: number
  maxProfit: string
  maxLoss: number
  strategy: string
}

// Calculate ATM, ITM, OTM strikes
export function calculateOptionStrikes(currentPrice: number, optionType: 'CALL' | 'PUT') {
  // Round to nearest strike (Indian options are typically in multiples of 50 or 100)
  const strikeInterval = currentPrice > 10000 ? 100 : 50
  const atmStrike = Math.round(currentPrice / strikeInterval) * strikeInterval
  
  if (optionType === 'CALL') {
    return {
      itm: atmStrike - strikeInterval, // In The Money
      atm: atmStrike,                   // At The Money
      otm: atmStrike + strikeInterval   // Out of The Money
    }
  } else {
    return {
      itm: atmStrike + strikeInterval,
      atm: atmStrike,
      otm: atmStrike - strikeInterval
    }
  }
}

// Estimate option premium (simplified calculation)
export function estimateOptionPremium(
  currentPrice: number,
  strikePrice: number,
  optionType: 'CALL' | 'PUT',
  daysToExpiry: number = 7
): number {
  const intrinsicValue = optionType === 'CALL' 
    ? Math.max(0, currentPrice - strikePrice)
    : Math.max(0, strikePrice - currentPrice)
  
  // Time value estimation (simplified)
  const volatility = 0.20 // Assume 20% volatility
  const timeValue = (currentPrice * volatility * Math.sqrt(daysToExpiry / 365)) / 2
  
  return Math.round(intrinsicValue + timeValue)
}

// Generate option recommendation
export function generateOptionRecommendation(
  symbol: string,
  currentPrice: number,
  action: 'BUY' | 'SELL',
  targetPercent: number,
  stopLossPercent: number
): OptionRecommendation {
  const optionType = action === 'BUY' ? 'CALL' : 'PUT'
  const strikes = calculateOptionStrikes(currentPrice, optionType)
  
  // Use ATM strike for recommendations
  const strikePrice = strikes.atm
  const premium = estimateOptionPremium(currentPrice, strikePrice, optionType)
  
  const breakeven = optionType === 'CALL' 
    ? strikePrice + premium 
    : strikePrice - premium
  
  const maxLoss = premium
  
  // Calculate potential profit
  const targetPrice = action === 'BUY' 
    ? currentPrice * (1 + targetPercent / 100)
    : currentPrice * (1 - targetPercent / 100)
  
  const profitAtTarget = optionType === 'CALL'
    ? Math.max(0, targetPrice - strikePrice) - premium
    : Math.max(0, strikePrice - targetPrice) - premium
  
  const strategy = optionType === 'CALL' 
    ? 'Long Call - Bullish Strategy'
    : 'Long Put - Bearish Strategy'
  
  return {
    strikePrice,
    optionType,
    premium,
    breakeven,
    maxProfit: profitAtTarget > 0 ? `₹${profitAtTarget.toFixed(2)}` : 'Unlimited',
    maxLoss,
    strategy
  }
}

// Calculate option Greeks (simplified)
export function calculateOptionGreeks(
  currentPrice: number,
  strikePrice: number,
  optionType: 'CALL' | 'PUT',
  daysToExpiry: number = 7
) {
  // Simplified Delta calculation
  const moneyness = optionType === 'CALL' 
    ? (currentPrice - strikePrice) / currentPrice
    : (strikePrice - currentPrice) / currentPrice
  
  const delta = optionType === 'CALL'
    ? Math.min(0.9, Math.max(0.1, 0.5 + moneyness))
    : Math.min(0.9, Math.max(0.1, 0.5 - moneyness))
  
  // Simplified Theta (time decay per day)
  const theta = -(currentPrice * 0.20 * Math.sqrt(1 / 365)) / (2 * Math.sqrt(daysToExpiry / 365))
  
  return {
    delta: delta.toFixed(2),
    theta: theta.toFixed(2),
    gamma: '0.05', // Simplified
    vega: '0.15'   // Simplified
  }
}

// Generate weekly expiry date (Thursday)
export function getNextExpiryDate(): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7
  
  const expiryDate = new Date(today)
  expiryDate.setDate(today.getDate() + daysUntilThursday)
  
  return expiryDate.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  })
}

// Calculate days to expiry
export function getDaysToExpiry(): number {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7
  return daysUntilThursday
}
