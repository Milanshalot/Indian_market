// Trade Model
import { ObjectId } from 'mongodb'

export type TradeType = 'EQUITY' | 'OPTION' | 'FUTURE'
export type TradeAction = 'BUY' | 'SELL'
export type EmotionalState = 'CONFIDENT' | 'FEARFUL' | 'GREEDY' | 'NEUTRAL' | 'FRUSTRATED'

export interface Trade {
  _id?: ObjectId
  userId: ObjectId
  date: Date
  symbol: string
  type: TradeType
  action: TradeAction
  entry: number
  exit?: number
  quantity: number
  pnl?: number
  pnlPercent?: number
  strategy?: string
  emotionalState?: EmotionalState
  notes?: string
  screenshots?: string[]
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

export const TradeCollections = {
  TRADES: 'trades',
}
