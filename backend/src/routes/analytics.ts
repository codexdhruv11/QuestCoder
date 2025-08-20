import { Router, Request, Response } from 'express'
import { authenticate } from '@/middleware/auth'
import AnalyticsService from '@/services/analyticsService'
import { logger } from '@/utils/logger'
import mongoose from 'mongoose'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticate)

/**
 * GET /analytics/overview
 * Get analytics overview for dashboard
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    const overview = await AnalyticsService.getOverview(userId)
    
    res.json({
      success: true,
      data: overview
    })
  } catch (error) {
    logger.error('Error getting analytics overview:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics overview'
    })
  }
})

/**
 * GET /analytics/progress
 * Get time-series progress data
 */
router.get('/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    const { period = 'daily', days = '30' } = req.query
    
    const validPeriods = ['daily', 'weekly', 'monthly']
    if (!validPeriods.includes(period as string)) {
      res.status(400).json({
        success: false,
        message: 'Invalid period. Must be daily, weekly, or monthly'
      })
    }

    const daysNumber = parseInt(days as string)
    if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
      res.status(400).json({
        success: false,
        message: 'Invalid days parameter. Must be between 1 and 365'
      })
    }

    const progressData = await AnalyticsService.getProgressCharts(
      userId,
      period as 'daily' | 'weekly' | 'monthly',
      daysNumber
    )
    
    res.json({
      success: true,
      data: {
        period,
        days: daysNumber,
        chartData: progressData
      }
    })
  } catch (error) {
    logger.error('Error getting progress analytics:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get progress analytics'
    })
  }
})

/**
 * GET /analytics/patterns
 * Get pattern-specific analytics
 */
router.get('/patterns', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    const patternAnalytics = await AnalyticsService.getPatternAnalytics(userId)
    
    res.json({
      success: true,
      data: {
        patterns: patternAnalytics
      }
    })
  } catch (error) {
    logger.error('Error getting pattern analytics:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get pattern analytics'
    })
  }
})

/**
 * GET /analytics/predictions
 * Get predictive insights and recommendations
 */
router.get('/predictions', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    const insights = await AnalyticsService.getPredictiveInsights(userId)
    
    res.json({
      success: true,
      data: {
        insights
      }
    })
  } catch (error) {
    logger.error('Error getting predictive insights:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get predictive insights'
    })
  }
})

/**
 * GET /analytics/performance
 * Get detailed performance metrics
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    const metrics = await AnalyticsService.getPerformanceMetrics(userId)
    
    res.json({
      success: true,
      data: {
        metrics
      }
    })
  } catch (error) {
    logger.error('Error getting performance metrics:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get performance metrics'
    })
  }
})

/**
 * GET /analytics/summary
 * Get comprehensive analytics summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    
    // Get all analytics data in parallel
    const [overview, patterns, insights, metrics] = await Promise.all([
      AnalyticsService.getOverview(userId),
      AnalyticsService.getPatternAnalytics(userId),
      AnalyticsService.getPredictiveInsights(userId),
      AnalyticsService.getPerformanceMetrics(userId)
    ])
    
    res.json({
      success: true,
      data: {
        overview,
        patterns: patterns.slice(0, 10), // Top 10 patterns
        insights,
        metrics
      }
    })
  } catch (error) {
    logger.error('Error getting analytics summary:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics summary'
    })
  }
})

/**
 * GET /analytics/export
 * Export analytics data as CSV/PDF
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    const { format = 'csv' } = req.query
    
    // Get analytics data
    const [overview, patterns] = await Promise.all([
      AnalyticsService.getOverview(userId),
      AnalyticsService.getPatternAnalytics(userId)
    ])
    
    if (format === 'csv') {
      // Generate CSV content
      const csvContent = [
        'Analytics Export',
        `Date: ${new Date().toISOString()}`,
        '',
        'Overview',
        `Total Problems,${overview.totalProblems}`,
        `Current Streak,${overview.currentStreak}`,
        `Best Streak,${overview.bestStreak}`,
        `Total XP,${overview.totalXP}`,
        '',
        'Pattern Progress',
        'Pattern,Solved,Total,Completion',
        ...patterns.map(p => `${p.patternName},${p.solved},${p.total},${p.completion}%`)
      ].join('\n')
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"')
      res.send(csvContent)
    } else {
      // For PDF, return a placeholder response
      res.json({
        success: false,
        message: 'PDF export is not yet implemented'
      })
    }
  } catch (error) {
    logger.error('Error exporting analytics:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics'
    })
  }
})

export default router
