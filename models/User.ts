// User Model
import { ObjectId } from 'mongodb'

export interface User {
  _id?: ObjectId
  email: string
  name?: string
  passwordHash: string
  plan: 'FREE' | 'PRO' | 'PREMIUM'
  createdAt: Date
  updatedAt: Date
}

export interface UserProfile {
  _id?: ObjectId
  userId: ObjectId
  level: number
  points: number
  badges: string[]
  winRate?: number
  totalTrades: number
  profitableTrades: number
  updatedAt: Date
}

export const UserCollections = {
  USERS: 'users',
  PROFILES: 'user_profiles',
}
