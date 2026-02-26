// Test MongoDB Connection
import type { NextApiRequest, NextApiResponse } from 'next'
import { getDatabase } from '../../lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDatabase()
    
    // Test connection by listing collections
    const collections = await db.listCollections().toArray()
    
    // Get database stats
    const stats = await db.stats()
    
    res.status(200).json({
      success: true,
      message: '✅ MongoDB connected successfully!',
      database: db.databaseName,
      collections: collections.map(c => c.name),
      stats: {
        collections: stats.collections,
        dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        indexes: stats.indexes,
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('MongoDB connection error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to connect to MongoDB. Check your connection string in .env.local'
    })
  }
}
