// User Service - Database operations for users
import { ObjectId } from 'mongodb'
import { getCollection } from '../mongodb'
import { User, UserProfile, UserCollections } from '../../models/User'
import bcrypt from 'bcryptjs'

export class UserService {
  // Create new user
  static async createUser(email: string, password: string, name?: string): Promise<User> {
    const users = await getCollection<User>(UserCollections.USERS)
    
    // Check if user exists
    const existingUser = await users.findOne({ email })
    if (existingUser) {
      throw new Error('User already exists')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    const user: User = {
      email,
      name,
      passwordHash,
      plan: 'FREE',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await users.insertOne(user)
    
    // Create user profile
    await this.createUserProfile(result.insertedId)

    return { ...user, _id: result.insertedId }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<User | null> {
    const users = await getCollection<User>(UserCollections.USERS)
    return users.findOne({ email })
  }

  // Get user by ID
  static async getUserById(userId: string | ObjectId): Promise<User | null> {
    const users = await getCollection<User>(UserCollections.USERS)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId
    return users.findOne({ _id: id })
  }

  // Verify password
  static async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email)
    if (!user) return null

    const isValid = await bcrypt.compare(password, user.passwordHash)
    return isValid ? user : null
  }

  // Update user plan
  static async updateUserPlan(userId: string | ObjectId, plan: 'FREE' | 'PRO' | 'PREMIUM'): Promise<boolean> {
    const users = await getCollection<User>(UserCollections.USERS)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId
    
    const result = await users.updateOne(
      { _id: id },
      { $set: { plan, updatedAt: new Date() } }
    )

    return result.modifiedCount > 0
  }

  // Create user profile
  static async createUserProfile(userId: ObjectId): Promise<UserProfile> {
    const profiles = await getCollection<UserProfile>(UserCollections.PROFILES)

    const profile: UserProfile = {
      userId,
      level: 1,
      points: 0,
      badges: [],
      totalTrades: 0,
      profitableTrades: 0,
      updatedAt: new Date(),
    }

    const result = await profiles.insertOne(profile)
    return { ...profile, _id: result.insertedId }
  }

  // Get user profile
  static async getUserProfile(userId: string | ObjectId): Promise<UserProfile | null> {
    const profiles = await getCollection<UserProfile>(UserCollections.PROFILES)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId
    return profiles.findOne({ userId: id })
  }

  // Update user profile
  static async updateUserProfile(
    userId: string | ObjectId,
    updates: Partial<UserProfile>
  ): Promise<boolean> {
    const profiles = await getCollection<UserProfile>(UserCollections.PROFILES)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId

    const result = await profiles.updateOne(
      { userId: id },
      { $set: { ...updates, updatedAt: new Date() } }
    )

    return result.modifiedCount > 0
  }

  // Add points to user
  static async addPoints(userId: string | ObjectId, points: number): Promise<boolean> {
    const profiles = await getCollection<UserProfile>(UserCollections.PROFILES)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId

    const result = await profiles.updateOne(
      { userId: id },
      { 
        $inc: { points },
        $set: { updatedAt: new Date() }
      }
    )

    // Check for level up
    const profile = await this.getUserProfile(id)
    if (profile) {
      const newLevel = Math.floor(profile.points / 100) + 1
      if (newLevel > profile.level) {
        await profiles.updateOne(
          { userId: id },
          { $set: { level: newLevel } }
        )
      }
    }

    return result.modifiedCount > 0
  }

  // Add badge to user
  static async addBadge(userId: string | ObjectId, badge: string): Promise<boolean> {
    const profiles = await getCollection<UserProfile>(UserCollections.PROFILES)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId

    const result = await profiles.updateOne(
      { userId: id },
      { 
        $addToSet: { badges: badge },
        $set: { updatedAt: new Date() }
      }
    )

    return result.modifiedCount > 0
  }
}
