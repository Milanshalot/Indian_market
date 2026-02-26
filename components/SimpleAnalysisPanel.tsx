import { useState } from 'react'

interface SimpleAnalysisPanelProps {
  symbol: string
}

export default function SimpleAnalysisPanel({ symbol }: SimpleAnalysisPanelProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  const runAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/enhanced-analysis?symbol=${symbol}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Analysis error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!data && !loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <button 
          onClick={runAnalysis}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          🧠 Run AI Analysis
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#f9fafb' }}>
        <div style={{ marginBottom: '10px' }}>⏳</div>
        <p>Running advanced analysis...</p>
        <p style={{ fontSize: '14px', color: '#9ca3af' }}>Analyzing SMC, MTF, and AI confidence...</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div style={{ 
      background: '#111827', 
      borderRadius: '12px', 
      padding: '20px', 
      margin: '20px 0',
      color: '#f9fafb'
    }}>
      <h3 style={{ marginTop: 0 }}>🧠 AI Analysis Results</h3>
      
      {/* Confidence Score */}
      <div style={{ 
        background: '#1f2937', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '48px', fontWeight: 'bold', textAlign: 'center' }}>
          {data.ai?.tradeConfidenceScore || 0}
        </div>
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>Confidence Score</div>
        <div style={{ 
          textAlign: 'center', 
          marginTop: '10px',
          padding: '8px',
          background: data.ai?.recommendation?.includes('BUY') ? '#10b981' : 
                     data.ai?.recommendation?.includes('SELL') ? '#ef4444' : '#f59e0b',
          borderRadius: '6px',
          fontWeight: '600'
        }}>
          {data.ai?.recommendation || 'HOLD'}
        </div>
      </div>

      {/* Probabilities */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Bullish</span>
            <span>{data.ai?.probabilityBullish?.toFixed(0) || 0}%</span>
          </div>
          <div style={{ 
            height: '8px', 
            background: '#1f2937', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%', 
              width: `${data.ai?.probabilityBullish || 0}%`,
              background: '#10b981'
            }}></div>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Bearish</span>
            <span>{data.ai?.probabilityBearish?.toFixed(0) || 0}%</span>
          </div>
          <div style={{ 
            height: '8px', 
            background: '#1f2937', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%', 
              width: `${data.ai?.probabilityBearish || 0}%`,
              background: '#ef4444'
            }}></div>
          </div>
        </div>
      </div>

      {/* Trade Setup */}
      {data.ai?.tradeSetup && (
        <div style={{ 
          background: '#1f2937', 
          padding: '16px', 
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <h4 style={{ marginTop: 0 }}>📊 Trade Setup</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>Entry</div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>
                ₹{data.ai.tradeSetup.entry?.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>Target</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#10b981' }}>
                ₹{data.ai.tradeSetup.target?.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>Stop Loss</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#ef4444' }}>
                ₹{data.ai.tradeSetup.stopLoss?.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>Risk:Reward</div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>
                1:{data.ai.tradeSetup.riskReward?.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Factors */}
      {data.ai?.keyFactors && data.ai.keyFactors.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4>🔑 Key Factors</h4>
          {data.ai.keyFactors.slice(0, 3).map((factor: any, idx: number) => (
            <div key={idx} style={{ 
              background: '#1f2937', 
              padding: '12px', 
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong>{factor.name}</strong>
                <span style={{ 
                  color: factor.score > 0 ? '#10b981' : factor.score < 0 ? '#ef4444' : '#9ca3af'
                }}>
                  {factor.score > 0 ? '+' : ''}{factor.score?.toFixed(0)}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>{factor.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {data.ai?.warnings && data.ai.warnings.length > 0 && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid #ef4444',
          padding: '12px', 
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <h4 style={{ marginTop: 0, color: '#ef4444' }}>⚠️ Warnings</h4>
          {data.ai.warnings.map((warning: string, idx: number) => (
            <div key={idx} style={{ fontSize: '14px', marginBottom: '4px' }}>{warning}</div>
          ))}
        </div>
      )}

      {/* Opportunities */}
      {data.ai?.opportunities && data.ai.opportunities.length > 0 && (
        <div style={{ 
          background: 'rgba(16, 185, 129, 0.1)', 
          border: '1px solid #10b981',
          padding: '12px', 
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <h4 style={{ marginTop: 0, color: '#10b981' }}>🎯 Opportunities</h4>
          {data.ai.opportunities.map((opp: string, idx: number) => (
            <div key={idx} style={{ fontSize: '14px', marginBottom: '4px' }}>{opp}</div>
          ))}
        </div>
      )}

      <button 
        onClick={runAnalysis}
        style={{
          width: '100%',
          padding: '10px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        🔄 Refresh Analysis
      </button>
    </div>
  )
}
