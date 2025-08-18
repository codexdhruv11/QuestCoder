import mongoose from 'mongoose'
import Notification from '@/models/Notification'
import { logger } from '@/utils/logger'

export interface NotificationData {
  type: 'badge_unlocked' | 'level_up' | 'challenge_invite' | 'group_invite' | 'challenge_completed' | 'group_joined' | 'achievement' | 'system'
  title: string
  message: string
  data?: any
  expiresAt?: Date
}

export interface NotificationFilters {
  type?: string
  isRead?: boolean
  limit?: number
  offset?: number
}

export class NotificationService {
  private static socketInstance: any = null

  /**
   * Set Socket.IO instance for real-time notifications
   */
  static setSocketInstance(io: any): void {
    this.socketInstance = io
  }

  /**
   * Create a new notification for a user
   */
  static async createNotification(
    userId: mongoose.Types.ObjectId,
    notificationData: NotificationData
  ): Promise<any> {
    try {
      const notification = new Notification({
        userId,
        ...notificationData
      })

      await notification.save()

      // Send real-time notification via Socket.IO
      if (this.socketInstance) {
        this.socketInstance.to(`user_${userId}`).emit('notification', {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          createdAt: notification.createdAt,
          isRead: notification.isRead
        })
      }

      logger.info(`Notification created for user ${userId}: ${notification.title}`)
      return notification.toObject()

    } catch (error) {
      logger.error('Error creating notification:', error)
      throw error
    }
  }

  /**
   * Create multiple notifications (batch)
   */
  static async createBatchNotifications(
    notifications: Array<{ userId: mongoose.Types.ObjectId } & NotificationData>
  ): Promise<void> {
    try {
      // Avoid spamming - group by user and type
      const grouped = this.groupNotifications(notifications)
      
      for (const [key, notificationGroup] of grouped) {
        const [userId, type] = key.split('_')
        const count = notificationGroup.length

        if (count === 1) {
          // Single notification
          await this.createNotification(
            new mongoose.Types.ObjectId(userId),
            notificationGroup[0]
          )
        } else {
          // Batch notification
          await this.createNotification(
            new mongoose.Types.ObjectId(userId),
            {
              type: type as any,
              title: `${count} new ${type.replace('_', ' ')} notifications`,
              message: `You have ${count} new notifications`,
              data: { count, notifications: notificationGroup }
            }
          )
        }
      }

    } catch (error) {
      logger.error('Error creating batch notifications:', error)
      throw error
    }
  }

  /**
   * Get user notifications with pagination and filters
   */
  static async getUserNotifications(
    userId: mongoose.Types.ObjectId,
    filters: NotificationFilters = {}
  ): Promise<{ notifications: any[], totalCount: number, unreadCount: number }> {
    try {
      const { type, isRead, limit = 20, offset = 0 } = filters

      // Build query
      const query: any = { userId }
      if (type) query.type = type
      if (isRead !== undefined) query.isRead = isRead

      // Get total counts
      const [totalCount, unreadCount] = await Promise.all([
        Notification.countDocuments(query),
        Notification.countDocuments({ userId, isRead: false })
      ])

      // Get notifications with pagination
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()

      return {
        notifications,
        totalCount,
        unreadCount
      }

    } catch (error) {
      logger.error('Error getting user notifications:', error)
      throw error
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(
    notificationId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
  ): Promise<void> {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        userId
      })

      if (!notification) {
        throw new Error('Notification not found')
      }

      await notification.markAsRead()

      // Emit real-time update
      if (this.socketInstance) {
        this.socketInstance.to(`user_${userId}`).emit('notification_read', {
          notificationId
        })
      }

    } catch (error) {
      logger.error('Error marking notification as read:', error)
      throw error
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: mongoose.Types.ObjectId): Promise<number> {
    try {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } }
      )

      // Emit real-time update
      if (this.socketInstance) {
        this.socketInstance.to(`user_${userId}`).emit('all_notifications_read')
      }

      logger.info(`Marked ${result.modifiedCount} notifications as read for user ${userId}`)
      return result.modifiedCount

    } catch (error) {
      logger.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(
    notificationId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
  ): Promise<void> {
    try {
      const result = await Notification.deleteOne({
        _id: notificationId,
        userId
      })

      if (result.deletedCount === 0) {
        throw new Error('Notification not found')
      }

      // Emit real-time update
      if (this.socketInstance) {
        this.socketInstance.to(`user_${userId}`).emit('notification_deleted', {
          notificationId
        })
      }

    } catch (error) {
      logger.error('Error deleting notification:', error)
      throw error
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications(): Promise<number> {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      })

      logger.info(`Cleaned up ${result.deletedCount} expired notifications`)
      return result.deletedCount

    } catch (error) {
      logger.error('Error cleaning up expired notifications:', error)
      return 0
    }
  }

  /**
   * Get notification statistics for a user
   */
  static async getUserNotificationStats(userId: mongoose.Types.ObjectId): Promise<{
    total: number
    unread: number
    byType: Record<string, number>
  }> {
    try {
      const pipeline = [
        { $match: { userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: {
              $sum: {
                $cond: [{ $eq: ['$isRead', false] }, 1, 0]
              }
            },
            byType: {
              $push: {
                type: '$type',
                isRead: '$isRead'
              }
            }
          }
        }
      ]

      const result = await Notification.aggregate(pipeline)
      const stats = result[0] || { total: 0, unread: 0, byType: [] }

      // Calculate by type
      const byType: Record<string, number> = {}
      stats.byType.forEach(({ type }: { type: string }) => {
        byType[type] = (byType[type] || 0) + 1
      })

      return {
        total: stats.total,
        unread: stats.unread,
        byType
      }

    } catch (error) {
      logger.error('Error getting notification stats:', error)
      return { total: 0, unread: 0, byType: {} }
    }
  }

  /**
   * Send badge unlock notification
   */
  static async sendBadgeUnlockNotification(
    userId: mongoose.Types.ObjectId,
    badge: any
  ): Promise<void> {
    await this.createNotification(userId, {
      type: 'badge_unlocked',
      title: 'New Badge Unlocked!',
      message: `Congratulations! You've unlocked the "${badge.name}" badge.`,
      data: {
        badgeId: badge._id,
        badgeName: badge.name,
        badgeDescription: badge.description,
        xpBonus: badge.xpReward
      }
    })
  }

  /**
   * Send level up notification
   */
  static async sendLevelUpNotification(
    userId: mongoose.Types.ObjectId,
    newLevel: number,
    totalXp: number
  ): Promise<void> {
    await this.createNotification(userId, {
      type: 'level_up',
      title: 'Level Up!',
      message: `Amazing! You've reached level ${newLevel}!`,
      data: {
        newLevel,
        totalXp
      }
    })
  }

  /**
   * Send challenge invite notification
   */
  static async sendChallengeInviteNotification(
    userId: mongoose.Types.ObjectId,
    challenge: any,
    inviterName: string
  ): Promise<void> {
    await this.createNotification(userId, {
      type: 'challenge_invite',
      title: 'Challenge Invitation',
      message: `${inviterName} invited you to join the "${challenge.title}" challenge.`,
      data: {
        challengeId: challenge._id,
        challengeTitle: challenge.title,
        inviterName
      }
    })
  }

  /**
   * Send group invite notification
   */
  static async sendGroupInviteNotification(
    userId: mongoose.Types.ObjectId,
    group: any,
    inviterName: string
  ): Promise<void> {
    await this.createNotification(userId, {
      type: 'group_invite',
      title: 'Study Group Invitation',
      message: `${inviterName} invited you to join the "${group.name}" study group.`,
      data: {
        groupId: group._id,
        groupName: group.name,
        inviterName
      }
    })
  }

  // Helper methods

  private static groupNotifications(
    notifications: Array<{ userId: mongoose.Types.ObjectId } & NotificationData>
  ): Map<string, NotificationData[]> {
    const grouped = new Map<string, NotificationData[]>()

    notifications.forEach(notification => {
      const key = `${notification.userId}_${notification.type}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(notification)
    })

    return grouped
  }
}

export default NotificationService
