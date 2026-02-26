# 🗄️ MongoDB Setup Guide

## ✅ MongoDB Integration Complete!

Your Indian Stock Market platform is now configured with MongoDB Atlas.

---

## 📦 What's Been Set Up

### 1. Database Connection
- **File:** `lib/mongodb.ts`
- **Connection String:** `mongodb+srv://mavi123:mavi%40123@cluster0.10wqp.mongodb.net/indian-stock-market`
- **Features:**
  - Connection pooling
  - Development mode caching
  - Production-ready configuration

### 2. Data Models
Created models for:
- **Users** (`models/User.ts`) - User accounts and profiles
- **Trades** (`models/Trade.ts`) - Trade journal entries
- **Watchlists** (`models/Watchlist.ts`) - User watchlists
- **Alerts** (`models/Alert.ts`) - Price and pattern alerts
- **Market Data** (`models/MarketData.ts`) - Caching layer

### 3. Database Services
Created service layers for all operations:
- **UserService** (`lib/db/userService.ts`)
  - User registration/login
  - Profile management
  - Points and badges system
  
- **TradeService** (`lib/db/tradeService.ts`)
  - Trade CRUD operations
  - Trade statistics
  - Performance analytics
  
- **WatchlistService** (`lib/db/watchlistService.ts`)
  - Watchlist management
  - Symbol add/remove
  
- **AlertService** (`lib/db/alertService.ts`)
  - Alert creation
  - Alert triggering
  - Price monitoring

---

## 🚀 Installation Steps

### Step 1: Install Dependencies

```bash
npm install mongodb bcryptjs
npm install --save-dev @types/bcryptjs
```

### Step 2: Environment Variables

The `.env.local` file has been created with your MongoDB connection string:

```env
MONGODB_URI=mongodb+srv://mavi123:mavi%40123@cluster0.10wqp.mongodb.net/indian-stock-market?retryWrites=true&w=majority
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
```

**⚠️ IMPORTANT:** Change `NEXTAUTH_SECRET` before deploying to production!

Generate a secure secret:
```bash
openssl rand -base64 32
```

### Step 3: Test Connection

Create a test API route to verify MongoDB connection:

```typescript
// pages/api/test-db.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { getDatabase } from '../../lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDatabase()
    const collections = await db.listCollections().toArray()
    
    res.status(200).json({
      success: true,
      message: 'MongoDB connected successfully!',
      database: db.databaseName,
      collections: collections.map(c => c.name)
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
```

Test it: `http://localhost:3000/api/test-db`

---

## 📊 Database Collections

Your MongoDB database will have these collections:

### 1. `users`
```javascript
{
  _id: ObjectId,
  email: String,
  name: String,
  passwordHash: String,
  plan: 'FREE' | 'PRO' | 'PREMIUM',
  createdAt: Date,
  updatedAt: Date
}
```

### 2. `user_profiles`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  level: Number,
  points: Number,
  badges: [String],
  winRate: Number,
  totalTrades: Number,
  profitableTrades: Number,
  updatedAt: Date
}
```

### 3. `trades`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  date: Date,
  symbol: String,
  type: 'EQUITY' | 'OPTION' | 'FUTURE',
  action: 'BUY' | 'SELL',
  entry: Number,
  exit: Number,
  quantity: Number,
  pnl: Number,
  pnlPercent: Number,
  strategy: String,
  emotionalState: String,
  notes: String,
  screenshots: [String],
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

### 4. `watchlists`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  name: String,
  symbols: [String],
  createdAt: Date,
  updatedAt: Date
}
```

### 5. `alerts`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'VOLUME_SPIKE' | 'BREAKOUT' | 'OPERATOR_GAME' | 'PATTERN_DETECTED',
  symbol: String,
  condition: String,
  value: Number,
  triggered: Boolean,
  active: Boolean,
  createdAt: Date,
  triggeredAt: Date
}
```

### 6. `market_data_cache` (Optional - for caching)
```javascript
{
  _id: ObjectId,
  symbol: String,
  data: Object,
  type: 'STOCK' | 'INDEX' | 'OPTION_CHAIN' | 'ANALYSIS',
  createdAt: Date,
  expiresAt: Date
}
```

---

## 💻 Usage Examples

### Example 1: User Registration

```typescript
import { UserService } from '../lib/db/userService'

// Register new user
const user = await UserService.createUser(
  'trader@example.com',
  'securePassword123',
  'John Trader'
)

console.log('User created:', user._id)
```

### Example 2: Log a Trade

```typescript
import { TradeService } from '../lib/db/tradeService'
import { ObjectId } from 'mongodb'

const trade = await TradeService.createTrade({
  userId: new ObjectId('user_id_here'),
  date: new Date(),
  symbol: 'RELIANCE',
  type: 'EQUITY',
  action: 'BUY',
  entry: 2450.50,
  exit: 2520.00,
  quantity: 10,
  pnl: 695,
  pnlPercent: 2.84,
  strategy: 'SMC Breakout',
  emotionalState: 'CONFIDENT',
  notes: 'Bullish CHOCH detected, entered on order block retest',
  tags: ['smc', 'breakout']
})

console.log('Trade logged:', trade._id)
```

### Example 3: Create Watchlist

```typescript
import { WatchlistService } from '../lib/db/watchlistService'
import { ObjectId } from 'mongodb'

const watchlist = await WatchlistService.createWatchlist(
  new ObjectId('user_id_here'),
  'My Top Picks',
  ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK']
)

console.log('Watchlist created:', watchlist._id)
```

### Example 4: Set Price Alert

```typescript
import { AlertService } from '../lib/db/alertService'
import { ObjectId } from 'mongodb'

const alert = await AlertService.createAlert(
  new ObjectId('user_id_here'),
  'PRICE_ABOVE',
  'RELIANCE',
  'Price crosses above',
  2500
)

console.log('Alert created:', alert._id)
```

### Example 5: Get Trade Statistics

```typescript
import { TradeService } from '../lib/db/tradeService'
import { ObjectId } from 'mongodb'

const stats = await TradeService.getTradeStats(
  new ObjectId('user_id_here')
)

console.log('Win Rate:', stats.winRate.toFixed(2) + '%')
console.log('Total P&L:', stats.totalPnL)
console.log('Best Trade:', stats.bestTrade)
```

---

## 🔐 Security Best Practices

### 1. Password Hashing
All passwords are hashed using bcrypt with 10 salt rounds:
```typescript
const passwordHash = await bcrypt.hash(password, 10)
```

### 2. Environment Variables
Never commit `.env.local` to git. It's already in `.gitignore`.

### 3. Input Validation
Always validate user input before database operations:
```typescript
import { z } from 'zod'

const tradeSchema = z.object({
  symbol: z.string().min(1).max(20),
  entry: z.number().positive(),
  quantity: z.number().int().positive(),
})

const validated = tradeSchema.parse(input)
```

### 4. User Authorization
Always verify user owns the resource:
```typescript
const trade = await TradeService.getTradeById(tradeId)
if (trade.userId.toString() !== session.user.id) {
  throw new Error('Unauthorized')
}
```

---

## 📈 Indexing for Performance

Create these indexes in MongoDB Atlas for better performance:

```javascript
// Users collection
db.users.createIndex({ email: 1 }, { unique: true })

// Trades collection
db.trades.createIndex({ userId: 1, date: -1 })
db.trades.createIndex({ userId: 1, symbol: 1 })

// Watchlists collection
db.watchlists.createIndex({ userId: 1 })

// Alerts collection
db.alerts.createIndex({ userId: 1, active: 1 })
db.alerts.createIndex({ symbol: 1, active: 1, triggered: 1 })

// Market data cache
db.market_data_cache.createIndex({ symbol: 1, type: 1 })
db.market_data_cache.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

You can create these in MongoDB Atlas UI or via MongoDB Compass.

---

## 🔄 Migration from Prisma (Optional)

If you were using Prisma before, you can migrate data:

1. Export data from Prisma:
```bash
npx prisma db pull
```

2. Convert to MongoDB format and import using the services

---

## 🚀 Next Steps

### 1. Create API Routes

Create API routes for user operations:

```typescript
// pages/api/auth/register.ts
import { UserService } from '../../../lib/db/userService'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password, name } = req.body
    const user = await UserService.createUser(email, password, name)
    
    res.status(201).json({ 
      success: true, 
      userId: user._id 
    })
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    })
  }
}
```

### 2. Implement Authentication

Use NextAuth.js with MongoDB adapter:

```bash
npm install next-auth @next-auth/mongodb-adapter
```

### 3. Add Caching Layer

Implement Redis caching for frequently accessed data:
- Market data (60 seconds TTL)
- Analysis results (5 minutes TTL)
- User profiles (10 minutes TTL)

### 4. Set Up Monitoring

Monitor your MongoDB performance:
- Enable MongoDB Atlas monitoring
- Set up alerts for slow queries
- Track connection pool usage

---

## 📚 Resources

- [MongoDB Node.js Driver Docs](https://www.mongodb.com/docs/drivers/node/current/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [NextAuth.js](https://next-auth.js.org/)

---

## 🎉 You're All Set!

Your MongoDB integration is complete. You can now:
- ✅ Store user accounts and profiles
- ✅ Log trades and track performance
- ✅ Manage watchlists
- ✅ Set up price alerts
- ✅ Cache market data

**Start building your features! 🚀**
