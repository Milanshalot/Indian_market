// Trade Service - Database operations for trades
import { ObjectId } from 'mongodb'
import { getCollection } from '../mongodb'
import { Trade, TradeCollections } from '../../models/Trade'

export class TradeService {
  // Create new trade
  static async createTrade(trade: Omit<Trade, '_id' | 'createdAt' | 'updatedAt'>): Promise<Trade> {
    const trades = await getCollection<Trade>(TradeCollections.TRADES)

    const newTrade: Trade = {
      ...trade,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await trades.insertOne(newTrade)
    return { ...newTrade, _id: result.insertedId }
  }

  // Get user trades
  static async getUserTrades(
    userId: string | ObjectId,
    limit: number = 100,
    skip: number = 0
  ): Promise<Trade[]> {
    const trades = await getCollection<Trade>(TradeCollections.TRADES)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId

    return trades
      .find({ userId: id })
      .sort({ date: -1 })
      .limit(limit)
      .skip(skip)
      .toArray()
  }

  // Get trade by ID
  static async getTradeById(tradeId: string | ObjectId): Promise<Trade | null> {
    const trades = await getCollection<Trade>(TradeCollections.TRADES)
    const id = typeof tradeId === 'string' ? new ObjectId(tradeId) : tradeId
    return trades.findOne({ _id: id })
  }

  // Update trade
  static async updateTrade(
    tradeId: string | ObjectId,
    updates: Partial<Trade>
  ): Promise<boolean> {
    const trades = await getCollection<Trade>(TradeCollections.TRADES)
    const id = typeof tradeId === 'string' ? new ObjectId(tradeId) : tradeId

    const result = await trades.updateOne(
      { _id: id },
      { $set: { ...updates, updatedAt: new Date() } }
    )

    return result.modifiedCount > 0
  }

  // Delete trade
  static async deleteTrade(tradeId: string | ObjectId): Promise<boolean> {
    const trades = await getCollection<Trade>(TradeCollections.TRADES)
    const id = typeof tradeId === 'string' ? new ObjectId(tradeId) : tradeId

    const result = await trades.deleteOne({ _id: id })
    return result.deletedCount > 0
  }

  // Get trade statistics
  static async getTradeStats(userId: string | ObjectId): Promise<{
    totalTrades: number
    profitableTrades: number
    winRate: number
    totalPnL: number
    avgPnL: number
    bestTrade: number
    worstTrade: number
  }> {
    const trades = await getCollection<Trade>(TradeCollections.TRADES)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId

    const userTrades = await trades.find({ userId: id, exit: { $exists: true } }).toArray()

    const totalTrades = userTrades.length
    const profitableTrades = userTrades.filter(t => (t.pnl || 0) > 0).length
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0
    const totalPnL = userTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0
    const bestTrade = Math.max(...userTrades.map(t => t.pnl || 0), 0)
    const worstTrade = Math.min(...userTrades.map(t => t.pnl || 0), 0)

    return {
      totalTrades,
      profitableTrades,
      winRate,
      totalPnL,
      avgPnL,
      bestTrade,
      worstTrade,
    }
  }

  // Get trades by symbol
  static async getTradesBySymbol(
    userId: string | ObjectId,
    symbol: string
  ): Promise<Trade[]> {
    const trades = await getCollection<Trade>(TradeCollections.TRADES)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId

    return trades
      .find({ userId: id, symbol })
      .sort({ date: -1 })
      .toArray()
  }

  // Get trades by date range
  static async getTradesByDateRange(
    userId: string | ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<Trade[]> {
    const trades = await getCollection<Trade>(TradeCollections.TRADES)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId

    return trades
      .find({
        userId: id,
        date: { $gte: startDate, $lte: endDate }
      })
      .sort({ date: -1 })
      .toArray()
  }
}
