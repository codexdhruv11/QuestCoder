import { Router, Request, Response } from 'express'
import { authenticateToken } from '@/middleware/auth'
import NotificationService from '@/services/notificationService'
import { logger } from '@/utils/logger'
import mongoose from 'mongoose'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticateToken)

/**
 * GET /notifications
 * Get user notifications with pagination and filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?.userId)
    const { 
      page = '1', 
      limit = '20', 
      type, 
      isRead 
    } = req.query

    const pageNumber = Math.max(1, parseInt(page as string))
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit as string)))
    const offset = (pageNumber - 1) * limitNumber

    const filters: any = {
      limit: limitNumber,
      offset
    }

    if (type) {
      filters.type = type
    }

    if (isRead !== undefined) {
      filters.isRead = isRead === 'true'
    }

    const result = await NotificationService.getUserNotifications(userId, filters)
    
    res.json({
      success: true,
      data: {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        pagination: {
          currentPage: pageNumber,
          totalPages: Math.ceil(result.totalCount / limitNumber),
          totalItems: result.totalCount,
          itemsPerPage: limitNumber
        }
      }
    })
  } catch (error) {
    logger.error('Error getting notifications:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications'
    })
  }
})

/**
 * GET /notifications/stats
 * Get notification statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?.userId)
    const stats = await NotificationService.getUserNotificationStats(userId)
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Error getting notification stats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get notification stats'
    })
  }
})

/**
 * PUT /notifications/:id/read
 * Mark a specific notification as read
 */
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const notificationId = new mongoose.Types.ObjectId(req.params.id)
    const userId = new mongoose.Types.ObjectId(req.user?.userId)

    await NotificationService.markAsRead(notificationId, userId)
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    })
  } catch (error) {
    logger.error('Error marking notification as read:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark notification as read'
    })
  }
})

/**
 * PUT /notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?.userId)
    const modifiedCount = await NotificationService.markAllAsRead(userId)
    
    res.json({
      success: true,
      message: `${modifiedCount} notifications marked as read`
    })
  } catch (error) {
    logger.error('Error marking all notifications as read:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    })
  }
})

/**
 * DELETE /notifications/:id
 * Delete a specific notification
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const notificationId = new mongoose.Types.ObjectId(req.params.id)
    const userId = new mongoose.Types.ObjectId(req.user?.userId)

    await NotificationService.deleteNotification(notificationId, userId)
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting notification:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete notification'
    })
  }
})

export default router
