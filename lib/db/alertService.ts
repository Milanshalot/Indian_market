// Alert Service - Database operations for alerts
import { ObjectId } from 'mongodb'
import { getCollection } from '../mongodb'
import { Alert, AlertType, AlertCollections } from '../../models/Alert'

export class AlertService {
  // Create alert
  static async createAlert(
    userId: string | ObjectId,
    type: AlertType,
    symbol: string,
    condition: string,
    value: number
  ): Promise<Alert> {
    const alerts = await getCollection<Alert>(AlertCollections.ALERTS)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId

    const alert: Alert = {
      userId: id,
      type,
      symbol,
      condition,
      value,
      triggered: false,
      active: true,
      createdAt: new Date(),
    }

    const result = await alerts.insertOne(alert)
    return { ...alert, _id: result.insertedId }
  }

  // Get user alerts
  static async getUserAlerts(
    userId: string | ObjectId,
    activeOnly: boolean = true
  ): Promise<Alert[]> {
    const alerts = await getCollection<Alert>(AlertCollections.ALERTS)
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId

    const query: any = { userId: id }
    if (activeOnly) {
      query.active = true
      query.triggered = false
    }

    return alerts.find(query).sort({ createdAt: -1 }).toArray()
  }

  // Get alert by ID
  static async getAlertById(alertId: string | ObjectId): Promise<Alert | null> {
    const alerts = await getCollection<Alert>(AlertCollections.ALERTS)
    const id = typeof alertId === 'string' ? new ObjectId(alertId) : alertId
    return alerts.findOne({ _id: id })
  }

  // Trigger alert
  static async triggerAlert(alertId: string | ObjectId): Promise<boolean> {
    const alerts = await getCollection<Alert>(AlertCollections.ALERTS)
    const id = typeof alertId === 'string' ? new ObjectId(alertId) : alertId

    const result = await alerts.updateOne(
      { _id: id },
      { 
        $set: { 
          triggered: true,
          triggeredAt: new Date()
        }
      }
    )

    return result.modifiedCount > 0
  }

  // Deactivate alert
  static async deactivateAlert(alertId: string | ObjectId): Promise<boolean> {
    const alerts = await getCollection<Alert>(AlertCollections.ALERTS)
    const id = typeof alertId === 'string' ? new ObjectId(alertId) : alertId

    const result = await alerts.updateOne(
      { _id: id },
      { $set: { active: false } }
    )

    return result.modifiedCount > 0
  }

  // Reactivate alert
  static async reactivateAlert(alertId: string | ObjectId): Promise<boolean> {
    const alerts = await getCollection<Alert>(AlertCollections.ALERTS)
    const id = typeof alertId === 'string' ? new ObjectId(alertId) : alertId

    const result = await alerts.updateOne(
      { _id: id },
      { 
        $set: { 
          active: true,
          triggered: false
        },
        $unset: { triggeredAt: '' }
      }
    )

    return result.modifiedCount > 0
  }

  // Delete alert
  static async deleteAlert(alertId: string | ObjectId): Promise<boolean> {
    const alerts = await getCollection<Alert>(AlertCollections.ALERTS)
    const id = typeof alertId === 'string' ? new ObjectId(alertId) : alertId

    const result = await alerts.deleteOne({ _id: id })
    return result.deletedCount > 0
  }

  // Get alerts by symbol
  static async getAlertsBySymbol(symbol: string): Promise<Alert[]> {
    const alerts = await getCollection<Alert>(AlertCollections.ALERTS)

    return alerts
      .find({ 
        symbol,
        active: true,
        triggered: false
      })
      .toArray()
  }

  // Check and trigger alerts based on current price
  static async checkPriceAlerts(symbol: string, currentPrice: number): Promise<Alert[]> {
    const alerts = await getCollection<Alert>(AlertCollections.ALERTS)

    const triggeredAlerts: Alert[] = []

    // Find active price alerts for this symbol
    const priceAlerts = await alerts
      .find({
        symbol,
        active: true,
        triggered: false,
        type: { $in: ['PRICE_ABOVE', 'PRICE_BELOW'] }
      })
      .toArray()

    for (const alert of priceAlerts) {
      let shouldTrigger = false

      if (alert.type === 'PRICE_ABOVE' && currentPrice >= alert.value) {
        shouldTrigger = true
      } else if (alert.type === 'PRICE_BELOW' && currentPrice <= alert.value) {
        shouldTrigger = true
      }

      if (shouldTrigger) {
        await this.triggerAlert(alert._id!)
        triggeredAlerts.push(alert)
      }
    }

    return triggeredAlerts
  }
}
