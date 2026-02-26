import { useState, useEffect } from 'react'
import useSWR from 'swr'
import SimpleAnalysisPanel from '../components/SimpleAnalysisPanel'

interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume?: number
  isFNO?: boolean
  technicalSignals?: TechnicalSignal[]
  rsi?: number
  macdSignal?: string
  operatorGame?: OperatorGame
  operatorStrength?: OperatorStrength
}

interface OperatorGame {
  type: string
  confidence: string
  action: string
  description: string
  indicators: string[]
}

interface OperatorStrength {
  score: number
  sentiment: string
  description: string
}

interface TechnicalSignal {
  pattern: string
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  strength: 'STRONG' | 'MODERATE' | 'WEAK'
  description: string
}

interface OptionChainInfo {
  pcr: number
  pcrInterpretation: string
  maxPain: number
  oiSupport: number
  oiResistance: number
  strikePrice: number
  optionType: string
  optionEntry: number
  optionTarget: number
  optionStopLoss: number
  confidence: string
  avgCallIV: number
  avgPutIV: number
  ivSkew: string
  callOIChange: number
  putOIChange: number
  topStrikes: {
    strike: number
    callOI: number
    putOI: number
    callOIChange: number
    putOIChange: number
    interpretation: string
  }[]
  reasons: string[]
}

interface Recommendation {
  symbol?: string
  index?: string
  name?: string
  action: string
  type: string
  entry: number
  target: number
  stopLoss: number
  reason: string
  optionChain?: OptionChainInfo
}

interface IndexData {
  price: number
  change: number
  changePercent: number
}

interface OptionChainSummary {
  symbol: string
  spotPrice: number
  pcr: number
  pcrInterpretation: string
  maxPainStrike: number
  highestCallOIStrike: number
  highestPutOIStrike: number
  callOITotal: number
  putOITotal: number
  callOIChange: number
  putOIChange: number
  avgCallIV: number
  avgPutIV: number
  ivSkew: string
}

interface MarketData {
  gainers: Stock[]
  losers: Stock[]
  fnoGainers: Stock[]
  fnoLosers: Stock[]
  allStocks: Stock[]
  indexRecommendations: Recommendation[]
  stockRecommendations: Recommendation[]
  optionChainData?: {
    nifty: OptionChainSummary
    bankNifty: OptionChainSummary
    sensex: OptionChainSummary
  }
  indices: {
    nifty: IndexData
    bankNifty: IndexData
    sensex: IndexData
  }
  timestamp: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Home() {
  const [marketOpen, setMarketOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'fno'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  
  const { data, error, mutate } = useSWR<MarketData>('/api/market-data-fast', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds (faster)
    revalidateOnFocus: true,
    dedupingInterval: 10000 // Prevent duplicate requests within 10 seconds
  })

  useEffect(() => {
    checkMarketStatus()
    const interval = setInterval(checkMarketStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const checkMarketStatus = () => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const day = now.getDay()
    
    const isWeekday = day >= 1 && day <= 5
    const isMarketHours = (hours === 9 && minutes >= 0) || 
                          (hours > 9 && hours < 15) || 
                          (hours === 15 && minutes <= 30)
    
    setMarketOpen(isWeekday && isMarketHours)
  }

  const loading = !data && !error
  const lastUpdate = data?.timestamp ? new Date(data.timestamp) : new Date()

  const filteredStocks = data?.allStocks.filter(stock => 
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <div className="container">
      <div className="header">
        <h1>🇮🇳 Indian Stock Market Dashboard</h1>
        <div className={`market-status ${marketOpen ? 'market-open' : 'market-closed'}`}>
          {marketOpen ? '🟢 Market Open' : '🔴 Market Closed'}
        </div>
        <p style={{ marginTop: '10px', color: '#6b7280' }} suppressHydrationWarning>
          Last Updated: {lastUpdate.toLocaleTimeString('en-IN')}
        </p>
        <button className="refresh-btn" onClick={() => mutate()}>
          🔄 Refresh Data
        </button>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ Failed to load market data. Please try again.
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading live market data...</p>
        </div>
      ) : data ? (
        <>
          {/* Index Cards */}
          <div className="indices-grid">
            <div className="index-card">
              <div className="index-name">NIFTY 50</div>
              <div className="index-price">₹{data.indices.nifty.price.toFixed(2)}</div>
              <div className={`index-change ${data.indices.nifty.change >= 0 ? 'positive' : 'negative'}`}>
                {data.indices.nifty.change >= 0 ? '+' : ''}{data.indices.nifty.change.toFixed(2)} 
                ({data.indices.nifty.changePercent.toFixed(2)}%)
              </div>
            </div>
            <div className="index-card">
              <div className="index-name">BANK NIFTY</div>
              <div className="index-price">₹{data.indices.bankNifty.price.toFixed(2)}</div>
              <div className={`index-change ${data.indices.bankNifty.change >= 0 ? 'positive' : 'negative'}`}>
                {data.indices.bankNifty.change >= 0 ? '+' : ''}{data.indices.bankNifty.change.toFixed(2)} 
                ({data.indices.bankNifty.changePercent.toFixed(2)}%)
              </div>
            </div>
            <div className="index-card">
              <div className="index-name">SENSEX</div>
              <div className="index-price">₹{data.indices.sensex.price.toFixed(2)}</div>
              <div className={`index-change ${data.indices.sensex.change >= 0 ? 'positive' : 'negative'}`}>
                {data.indices.sensex.change >= 0 ? '+' : ''}{data.indices.sensex.change.toFixed(2)} 
                ({data.indices.sensex.changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Stocks
            </button>
            <button 
              className={`tab ${activeTab === 'fno' ? 'active' : ''}`}
              onClick={() => setActiveTab('fno')}
            >
              F&O Stocks
            </button>
          </div>

          {/* Gainers and Losers */}
          <div className="grid">
            <div className="card">
              <h2>📈 Top Gainers {activeTab === 'fno' && '(F&O)'}</h2>
              {(activeTab === 'all' ? data.gainers : data.fnoGainers).map((stock, index) => (
                <div 
                  key={index} 
                  className="stock-item gainer"
                  onClick={() => setSelectedStock(stock)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div className="stock-name">
                      {stock.symbol} {stock.isFNO && <span className="fno-badge">F&O</span>}
                    </div>
                    <div className="stock-company">{stock.name}</div>
                    <div className="stock-price">₹{stock.price.toFixed(2)}</div>
                    {stock.technicalSignals && stock.technicalSignals.length > 0 && (
                      <div className="technical-badge bullish">
                        📊 {stock.technicalSignals.filter(s => s.signal === 'BULLISH').length} Bullish Signals
                      </div>
                    )}
                    {stock.operatorGame && (
                      <div className={`operator-badge ${stock.operatorGame.action.toLowerCase()}`}>
                        🎯 {stock.operatorGame.type}
                      </div>
                    )}
                  </div>
                  <div className="stock-change positive">
                    +{stock.changePercent.toFixed(2)}%
                    <div className="stock-change-value">+₹{stock.change.toFixed(2)}</div>
                    {stock.rsi && (
                      <div className="rsi-indicator" style={{ fontSize: '0.7rem', marginTop: '4px' }}>
                        RSI: {stock.rsi.toFixed(0)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <h2>📉 Top Losers {activeTab === 'fno' && '(F&O)'}</h2>
              {(activeTab === 'all' ? data.losers : data.fnoLosers).map((stock, index) => (
                <div 
                  key={index} 
                  className="stock-item loser"
                  onClick={() => setSelectedStock(stock)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div className="stock-name">
                      {stock.symbol} {stock.isFNO && <span className="fno-badge">F&O</span>}
                    </div>
                    <div className="stock-company">{stock.name}</div>
                    <div className="stock-price">₹{stock.price.toFixed(2)}</div>
                    {stock.technicalSignals && stock.technicalSignals.length > 0 && (
                      <div className="technical-badge bearish">
                        📉 {stock.technicalSignals.filter(s => s.signal === 'BEARISH').length} Bearish Signals
                      </div>
                    )}
                    {stock.operatorGame && (
                      <div className={`operator-badge ${stock.operatorGame.action.toLowerCase()}`}>
                        🎯 {stock.operatorGame.type}
                      </div>
                    )}
                  </div>
                  <div className="stock-change negative">
                    {stock.changePercent.toFixed(2)}%
                    <div className="stock-change-value">₹{stock.change.toFixed(2)}</div>
                    {stock.rsi && (
                      <div className="rsi-indicator" style={{ fontSize: '0.7rem', marginTop: '4px' }}>
                        RSI: {stock.rsi.toFixed(0)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Stocks Search */}
          <div className="card">
            <h2>🔍 Search All Stocks ({data.allStocks.length} stocks)</h2>
            <input 
              type="text"
              className="search-input"
              placeholder="Search by symbol or company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="stocks-grid">
              {filteredStocks.slice(0, 20).map((stock, index) => (
                <div key={index} className="stock-card">
                  <div className="stock-card-header">
                    <span className="stock-symbol">{stock.symbol}</span>
                    {stock.isFNO && <span className="fno-badge-small">F&O</span>}
                  </div>
                  <div className="stock-card-name">{stock.name}</div>
                  <div className="stock-card-price">₹{stock.price.toFixed(2)}</div>
                  <div className={`stock-card-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
            {filteredStocks.length > 20 && (
              <p className="showing-text">Showing 20 of {filteredStocks.length} stocks</p>
            )}
          </div>

          {/* Option Chain Overview */}
          {data.optionChainData && (
            <div className="card">
              <h2>🔗 Option Chain Analysis</h2>
              <p className="disclaimer">
                ⚠️ Option chain data from NSE. PCR {'>'} 1 = Bullish (put support), PCR {'<'} 1 = Bearish (call resistance).
              </p>
              <div className="oc-overview-grid">
                {[
                  { label: 'NIFTY', data: data.optionChainData.nifty },
                  { label: 'BANK NIFTY', data: data.optionChainData.bankNifty },
                  { label: 'SENSEX', data: data.optionChainData.sensex },
                ].map((item, idx) => (
                  <div key={idx} className="oc-overview-card">
                    <div className="oc-overview-header">{item.label}</div>
                    <div className="oc-overview-spot">₹{item.data.spotPrice.toLocaleString('en-IN')}</div>
                    <div className="oc-metrics">
                      <div className="oc-metric">
                        <span className="oc-metric-label">PCR</span>
                        <span className={`oc-metric-value ${item.data.pcr > 1 ? 'positive' : item.data.pcr < 0.7 ? 'negative' : ''}`}>
                          {item.data.pcr.toFixed(2)}
                        </span>
                      </div>
                      <div className="oc-metric">
                        <span className="oc-metric-label">Max Pain</span>
                        <span className="oc-metric-value">₹{item.data.maxPainStrike.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="oc-metric">
                        <span className="oc-metric-label">OI Support</span>
                        <span className="oc-metric-value positive">₹{item.data.highestPutOIStrike.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="oc-metric">
                        <span className="oc-metric-label">OI Resistance</span>
                        <span className="oc-metric-value negative">₹{item.data.highestCallOIStrike.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="oc-metric">
                        <span className="oc-metric-label">Call IV</span>
                        <span className="oc-metric-value">{item.data.avgCallIV}%</span>
                      </div>
                      <div className="oc-metric">
                        <span className="oc-metric-label">Put IV</span>
                        <span className="oc-metric-value">{item.data.avgPutIV}%</span>
                      </div>
                    </div>
                    <div className="oc-pcr-interpretation">{item.data.pcrInterpretation}</div>
                    <div className="oc-iv-skew">{item.data.ivSkew}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Index F&O Recommendations (Option Chain Based) */}
          <div className="card">
            <h2>💼 Index F&O Recommendations (Option Chain)</h2>
            <p className="disclaimer">
              ⚠️ Recommendations based on option chain analysis (PCR, OI, Max Pain, IV). 
              Please do your own research before trading.
            </p>
            {data.indexRecommendations.map((rec, index) => (
              <div key={index} className={`recommendation-card ${rec.action.toLowerCase()}`}>
                <div className="rec-header">
                  <h3>{rec.index}</h3>
                  <div className="rec-header-badges">
                    {rec.optionChain && (
                      <span className={`confidence-badge ${rec.optionChain.confidence.toLowerCase()}`}>
                        {rec.optionChain.confidence}
                      </span>
                    )}
                    <div className={`action-badge ${rec.action.toLowerCase()}`}>
                      {rec.action} {rec.type}
                    </div>
                  </div>
                </div>

                {/* Option Chain Details */}
                {rec.optionChain && (
                  <div className="oc-rec-details">
                    <div className="oc-rec-grid">
                      <div className="oc-rec-item">
                        <span className="oc-rec-label">PCR</span>
                        <span className={`oc-rec-value ${rec.optionChain.pcr > 1 ? 'bullish' : rec.optionChain.pcr < 0.7 ? 'bearish' : ''}`}>
                          {rec.optionChain.pcr.toFixed(2)}
                        </span>
                      </div>
                      <div className="oc-rec-item">
                        <span className="oc-rec-label">Max Pain</span>
                        <span className="oc-rec-value">₹{rec.optionChain.maxPain.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="oc-rec-item">
                        <span className="oc-rec-label">OI Support</span>
                        <span className="oc-rec-value bullish">₹{rec.optionChain.oiSupport.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="oc-rec-item">
                        <span className="oc-rec-label">OI Resistance</span>
                        <span className="oc-rec-value bearish">₹{rec.optionChain.oiResistance.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="oc-rec-item">
                        <span className="oc-rec-label">Strike</span>
                        <span className="oc-rec-value">₹{rec.optionChain.strikePrice.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="oc-rec-item">
                        <span className="oc-rec-label">IV (C/P)</span>
                        <span className="oc-rec-value">{rec.optionChain.avgCallIV}% / {rec.optionChain.avgPutIV}%</span>
                      </div>
                    </div>

                    {/* Option Premium Entry/Target/SL */}
                    {rec.optionChain.optionType !== 'NEUTRAL' && (
                      <div className="oc-premium-section">
                        <div className="oc-premium-header">
                          📋 {rec.optionChain.optionType} Option (Strike: ₹{rec.optionChain.strikePrice.toLocaleString('en-IN')})
                        </div>
                        <div className="oc-premium-grid">
                          <div className="oc-premium-item">
                            <span>Premium Entry</span>
                            <strong>₹{rec.optionChain.optionEntry}</strong>
                          </div>
                          <div className="oc-premium-item">
                            <span>Premium Target</span>
                            <strong>₹{rec.optionChain.optionTarget}</strong>
                          </div>
                          <div className="oc-premium-item">
                            <span>Premium SL</span>
                            <strong>₹{rec.optionChain.optionStopLoss}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Top Strikes */}
                    {rec.optionChain.topStrikes && rec.optionChain.topStrikes.length > 0 && (
                      <div className="oc-strikes-section">
                        <div className="oc-strikes-header">📊 Key Strikes by OI</div>
                        {rec.optionChain.topStrikes.map((s, sIdx) => (
                          <div key={sIdx} className="oc-strike-row">
                            <span className="oc-strike-price">₹{s.strike.toLocaleString('en-IN')}</span>
                            <span className="oc-strike-oi">C: {(s.callOI / 1000).toFixed(0)}K / P: {(s.putOI / 1000).toFixed(0)}K</span>
                            <span className="oc-strike-interp">{s.interpretation}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Analysis Reasons */}
                    {rec.optionChain.reasons && rec.optionChain.reasons.length > 0 && (
                      <div className="oc-reasons">
                        <strong>🔍 Option Chain Signals:</strong>
                        <ul>
                          {rec.optionChain.reasons.map((r, rIdx) => (
                            <li key={rIdx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Index Level Targets */}
                <div className="recommendation-details">
                  <div className="detail-item">
                    <div className="detail-label">Spot / Entry</div>
                    <div className="detail-value">₹{rec.entry.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Target Level</div>
                    <div className="detail-value">₹{rec.target.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Stop Loss Level</div>
                    <div className="detail-value">₹{rec.stopLoss.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Risk/Reward</div>
                    <div className="detail-value">
                      1:{Math.abs((rec.target - rec.entry) / (rec.entry - rec.stopLoss || 1)).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stock F&O Recommendations */}
          <div className="card">
            <h2>📊 Stock F&O Trading Opportunities</h2>
            <p className="disclaimer">
              ⚠️ Based on candlestick patterns, chart patterns, and buyer/seller pressure analysis. Use proper risk management.
            </p>
            <div className="stock-recommendations-grid">
              {data.stockRecommendations.map((rec, index) => (
                <div key={index} className={`stock-rec-card ${rec.action.toLowerCase()}`}>
                  <div className="stock-rec-header">
                    <div>
                      <div className="stock-rec-symbol">{rec.symbol}</div>
                      <div className="stock-rec-name">{rec.name}</div>
                    </div>
                    <div className={`action-badge-small ${rec.action.toLowerCase()}`}>
                      {rec.action}
                    </div>
                  </div>
                  <div className="stock-rec-prices">
                    <div className="price-item">
                      <span>Entry:</span> ₹{rec.entry.toFixed(2)}
                    </div>
                    <div className="price-item">
                      <span>Target:</span> ₹{rec.target.toFixed(2)}
                    </div>
                    <div className="price-item">
                      <span>SL:</span> ₹{rec.stopLoss.toFixed(2)}
                    </div>
                  </div>
                  <div className="stock-rec-reason">{rec.reason}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Analysis Modal */}
          {selectedStock && (
            <div className="modal-overlay" onClick={() => setSelectedStock(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{selectedStock.symbol} - Advanced Analysis</h2>
                  <button className="modal-close" onClick={() => setSelectedStock(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="modal-stock-info">
                    <div className="modal-price">₹{selectedStock.price.toFixed(2)}</div>
                    <div className={`modal-change ${selectedStock.change >= 0 ? 'positive' : 'negative'}`}>
                      {selectedStock.change >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
                    </div>
                  </div>

                  {/* NEW: AI Analysis Panel */}
                  <SimpleAnalysisPanel symbol={selectedStock.symbol} />
                  
                  <div className="technical-indicators">
                    <div className="indicator-item">
                      <span className="indicator-label">RSI (14)</span>
                      <span className={`indicator-value ${
                        selectedStock.rsi && selectedStock.rsi < 30 ? 'oversold' : 
                        selectedStock.rsi && selectedStock.rsi > 70 ? 'overbought' : 'neutral'
                      }`}>
                        {selectedStock.rsi?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    <div className="indicator-item">
                      <span className="indicator-label">MACD Signal</span>
                      <span className={`indicator-value ${
                        selectedStock.macdSignal === 'BULLISH' ? 'bullish' : 
                        selectedStock.macdSignal === 'BEARISH' ? 'bearish' : 'neutral'
                      }`}>
                        {selectedStock.macdSignal || 'N/A'}
                      </span>
                    </div>
                    {selectedStock.operatorStrength && (
                      <>
                        <div className="indicator-item">
                          <span className="indicator-label">Operator Score</span>
                          <span className={`indicator-value ${
                            selectedStock.operatorStrength.score > 65 ? 'bullish' : 
                            selectedStock.operatorStrength.score < 35 ? 'bearish' : 'neutral'
                          }`}>
                            {selectedStock.operatorStrength.score}/100
                          </span>
                        </div>
                        <div className="indicator-item">
                          <span className="indicator-label">Operator Sentiment</span>
                          <span className={`indicator-value ${selectedStock.operatorStrength.sentiment.toLowerCase()}`}>
                            {selectedStock.operatorStrength.sentiment}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {selectedStock.operatorGame && (
                    <div className="operator-game-section">
                      <h3>🎯 Operator Game Detected</h3>
                      <div className={`operator-game-card ${selectedStock.operatorGame.action.toLowerCase()}`}>
                        <div className="operator-game-header">
                          <span className="operator-game-type">{selectedStock.operatorGame.type}</span>
                          <span className={`confidence-badge ${selectedStock.operatorGame.confidence.toLowerCase()}`}>
                            {selectedStock.operatorGame.confidence} CONFIDENCE
                          </span>
                        </div>
                        <div className="operator-game-action">
                          Action: <strong>{selectedStock.operatorGame.action}</strong>
                        </div>
                        <div className="operator-game-description">
                          {selectedStock.operatorGame.description}
                        </div>
                        <div className="operator-game-indicators">
                          <strong>Key Indicators:</strong>
                          <ul>
                            {selectedStock.operatorGame.indicators.map((indicator, idx) => (
                              <li key={idx}>{indicator}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedStock.operatorStrength && (
                    <div className="operator-strength-section">
                      <h3>💪 Operator Strength Analysis</h3>
                      <div className="operator-strength-bar">
                        <div 
                          className="operator-strength-fill"
                          style={{ 
                            width: `${selectedStock.operatorStrength.score}%`,
                            background: selectedStock.operatorStrength.score > 65 ? '#10b981' : 
                                      selectedStock.operatorStrength.score < 35 ? '#ef4444' : '#f59e0b'
                          }}
                        ></div>
                      </div>
                      <p className="operator-strength-desc">{selectedStock.operatorStrength.description}</p>
                    </div>
                  )}

                  <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Detected Patterns</h3>
                  {selectedStock.technicalSignals && selectedStock.technicalSignals.length > 0 ? (
                    <div className="patterns-list">
                      {selectedStock.technicalSignals.map((signal, idx) => (
                        <div key={idx} className={`pattern-card ${signal.signal.toLowerCase()}`}>
                          <div className="pattern-header">
                            <span className="pattern-name">{signal.pattern}</span>
                            <span className={`pattern-badge ${signal.strength.toLowerCase()}`}>
                              {signal.strength}
                            </span>
                          </div>
                          <div className="pattern-description">{signal.description}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-patterns">No significant patterns detected</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
