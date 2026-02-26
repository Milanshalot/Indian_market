// Watchlist Model
import { ObjectId } from 'mongodb'

export interface Watchlist {
  _id?: ObjectId
  userId: ObjectId
  name: string
  symbols: string[]
  createdAt: Date
  updatedAt: Date
}

export const WatchlistCollections = {
  WATCHLISTS: 'watchlists',
}
