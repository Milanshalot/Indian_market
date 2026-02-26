// Alert Model
import { ObjectId } from 'mongodb'

export type AlertType = 
  | 'PRICE_ABOVE' 
  | 'PRICE_BELOW' 
  | 'VOLUME_SPIKE' 
  | 'BREAKOUT' 
  | 'OPERATOR_GAME' 
  | 'PATTERN_DETECTED'

export interface Alert {
  _id?: ObjectId
  userId: ObjectId
  type: AlertType
  symbol: string
  condition: string
  value: number
  triggered: boolean
  active: boolean
  createdAt: Date
  triggeredAt?: Date
}

export const AlertCollections = {
  ALERTS: 'alerts',
}
