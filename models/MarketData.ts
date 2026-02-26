// Market Data Cache Model
import { ObjectId } from 'mongodb'

export interface MarketDataCache {
  _id?: ObjectId
  symbol: string
  data: any
  type: 'STOCK' | 'INDEX' | 'OPTION_CHAIN' | 'ANALYSIS'
  createdAt: Date
  expiresAt: Date
}

export interface AnalysisCache {
  _id?: ObjectId
  symbol: string
  analysisType: 'SMC' | 'MTF' | 'AI_CONFIDENCE' | 'FULL'
  data: any
  createdAt: Date
  expiresAt: Date
}

export const MarketDataCollections = {
  MARKET_DATA_CACHE: 'market_data_cache',
  ANALYSIS_CACHE: 'analysis_cache',
}
