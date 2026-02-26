// Watchlist Service - Database operations for watchlists
import { ObjectId } from 'mongodb'
import { getCollection } from '../mongodb'
import { Watchlist, WatchlistCollections } from '../../models/Watchlist'

export class WatchlistService {
  // Create watchlist
  static async createWatchlist(
    userId: string | ObjectId,
    name: string,
    symbols: string[] = []
  ): Promise<Watchlist> {
    const watchlists = await getCollection<Watchlist>(WatchlistCollections.WATCHLISTS)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId

    const watchlist: Watchlist = {
      userId: id,
      name,
      symbols,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await watchlists.insertOne(watchlist)
    return { ...watchlist, _id: result.insertedId }
  }

  // Get user watchlists
  static async getUserWatchlists(userId: string | ObjectId): Promise<Watchlist[]> {
    const watchlists = await getCollection<Watchlist>(WatchlistCollections.WATCHLISTS)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId

    return watchlists.find({ userId: id }).sort({ createdAt: -1 }).toArray()
  }

  // Get watchlist by ID
  static async getWatchlistById(watchlistId: string | ObjectId): Promise<Watchlist | null> {
    const watchlists = await getCollection<Watchlist>(WatchlistCollections.WATCHLISTS)
    const id = typeof watchlistId === 'string' ? new ObjectId(watchlistId) : watchlistId
    return watchlists.findOne({ _id: id })
  }

  // Add symbol to watchlist
  static async addSymbol(
    watchlistId: string | ObjectId,
    symbol: string
  ): Promise<boolean> {
    const watchlists = await getCollection<Watchlist>(WatchlistCollections.WATCHLISTS)
    const id = typeof watchlistId === 'string' ? new ObjectId(watchlistId) : watchlistId

    const result = await watchlists.updateOne(
      { _id: id },
      { 
        $addToSet: { symbols: symbol },
        $set: { updatedAt: new Date() }
      }
    )

    return result.modifiedCount > 0
  }

  // Remove symbol from watchlist
  static async removeSymbol(
    watchlistId: string | ObjectId,
    symbol: string
  ): Promise<boolean> {
    const watchlists = await getCollection<Watchlist>(WatchlistCollections.WATCHLISTS)
    const id = typeof watchlistId === 'string' ? new ObjectId(watchlistId) : watchlistId

    const result = await watchlists.updateOne(
      { _id: id },
      { 
        $pull: { symbols: symbol },
        $set: { updatedAt: new Date() }
      }
    )

    return result.modifiedCount > 0
  }

  // Update watchlist name
  static async updateWatchlistName(
    watchlistId: string | ObjectId,
    name: string
  ): Promise<boolean> {
    const watchlists = await getCollection<Watchlist>(WatchlistCollections.WATCHLISTS)
    const id = typeof watchlistId === 'string' ? new ObjectId(watchlistId) : watchlistId

    const result = await watchlists.updateOne(
      { _id: id },
      { $set: { name, updatedAt: new Date() } }
    )

    return result.modifiedCount > 0
  }

  // Delete watchlist
  static async deleteWatchlist(watchlistId: string | ObjectId): Promise<boolean> {
    const watchlists = await getCollection<Watchlist>(WatchlistCollections.WATCHLISTS)
    const id = typeof watchlistId === 'string' ? new ObjectId(watchlistId) : watchlistId

    const result = await watchlists.deleteOne({ _id: id })
    return result.deletedCount > 0
  }
}
