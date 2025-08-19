import { Router, Request, Response } from 'express'
import { authenticate } from '@/middleware/auth'
import GamificationService from '@/services/gamificationService'
import LeaderboardService from '@/services/leaderboardService'
import { logger } from '@/utils/logger'
import mongoose from 'mongoose'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticate)

/**
 * GET /gamification/profile
 * Get user's gamification profile (XP, level, badges)
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    const profile = await GamificationService.getUserGamificationStats(userId)
    
    res.json({
      success: true,
      data: profile
    })
  } catch (error) {
    logger.error('Error getting gamification profile:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get gamification profile'
    })
  }
})

/**
 * GET /gamification/badges
 * Get available badges and user progress
 */
router.get('/badges', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    const { category } = req.query
    
    const [availableBadges, userBadgeProgress] = await Promise.all([
      GamificationService.getAvailableBadges(category as string),
      GamificationService.getUserBadgeProgress(userId)
    ])
    
    res.json({
      success: true,
      data: {
        available: availableBadges,
        progress: userBadgeProgress
      }
    })
  } catch (error) {
    logger.error('Error getting badges:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get badges'
    })
  }
})

/**
 * GET /gamification/leaderboard
 * Get leaderboard rankings
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    const { 
      type = 'xp', 
      timeframe = 'all', 
      limit = '10', 
      offset = '0',
      groupId 
    } = req.query

    // Check if requesting group leaderboard
    if (groupId) {
      try {
        const groupLeaderboard = await LeaderboardService.getGroupLeaderboard(
          new mongoose.Types.ObjectId(groupId as string),
          { limit: parseInt(limit as string), offset: parseInt(offset as string), timeframe: timeframe as any },
          userId
        )
        return res.json({
          success: true,
          data: groupLeaderboard
        })
      } catch (error) {
        logger.error('Error getting group leaderboard:', error)
        return res.status(500).json({
          success: false,
          message: 'Failed to get group leaderboard'
        })
      }
    }

    const validTypes = ['xp', 'problems', 'streak']
    if (!validTypes.includes(type as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leaderboard type. Must be xp, problems, or streak'
      })
    }

    const validTimeframes = ['all', 'monthly', 'weekly', 'daily']
    if (!validTimeframes.includes(timeframe as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe. Must be all, monthly, weekly, or daily'
      })
    }

    const limitNumber = parseInt(limit as string)
    const offsetNumber = parseInt(offset as string)

    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit. Must be between 1 and 100'
      })
    }

    if (isNaN(offsetNumber) || offsetNumber < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offset. Must be 0 or greater'
      })
    }

    const filters = {
      timeframe: timeframe as any,
      limit: limitNumber,
      offset: offsetNumber
    }

    let leaderboard
    switch (type) {
      case 'xp':
        leaderboard = await LeaderboardService.getXpLeaderboard(filters, userId)
        break
      case 'problems':
        leaderboard = await LeaderboardService.getProblemsLeaderboard(filters, userId)
        break
      case 'streak':
        leaderboard = await LeaderboardService.getStreakLeaderboard(filters, userId)
        break
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid leaderboard type'
        })
    }
    
    res.json({
      success: true,
      data: {
        type,
        timeframe,
        ...leaderboard
      }
    })
  } catch (error) {
    logger.error('Error getting leaderboard:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard'
    })
  }
})

/**
 * GET /gamification/levels
 * Get level progression information
 */
router.get('/levels', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    const userStats = await GamificationService.getUserGamificationStats(userId)
    
    // Calculate level progression data
    const currentLevel = userStats.currentLevel
    const totalXp = userStats.totalXp
    const xpProgress = userStats.xpProgress
    
    // Calculate next few levels
    const levelData = []
    for (let level = 1; level <= currentLevel + 5; level++) {
      const xpRequired = GamificationService.calculateXpForLevel(level)
      levelData.push({
        level,
        xpRequired,
        isUnlocked: level <= currentLevel,
        isCurrent: level === currentLevel
      })
    }
    
    res.json({
      success: true,
      data: {
        currentLevel,
        totalXp,
        xpProgress,
        levelData,
        levelHistory: userStats.levelHistory
      }
    })
  } catch (error) {
    logger.error('Error getting level information:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get level information'
    })
  }
})

/**
 * GET /gamification/stats
 * Get comprehensive gamification statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    
    const [userStats, badgeProgress, xpLeaderboard] = await Promise.all([
      GamificationService.getUserGamificationStats(userId),
      GamificationService.getUserBadgeProgress(userId),
      LeaderboardService.getXpLeaderboard({ limit: 10 }, userId)
    ])

    // Calculate some additional stats
    const unlockedBadgeCount = userStats.unlockedBadges.length
    const totalBadgeCount = badgeProgress.length
    const badgeCompletionRate = totalBadgeCount > 0 ? (unlockedBadgeCount / totalBadgeCount) * 100 : 0

    res.json({
      success: true,
      data: {
        profile: userStats,
        badges: {
          unlocked: unlockedBadgeCount,
          total: totalBadgeCount,
          completionRate: Math.round(badgeCompletionRate)
        },
        leaderboard: {
          currentRank: xpLeaderboard.currentUserRank,
          totalParticipants: xpLeaderboard.totalEntries
        }
      }
    })
  } catch (error) {
    logger.error('Error getting gamification stats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get gamification stats'
    })
  }
})

/**
 * POST /gamification/initialize
 * Initialize gamification for a user (mainly for testing or migration)
 */
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    await GamificationService.initializeUserGamification(userId)
    
    res.json({
      success: true,
      message: 'Gamification initialized successfully'
    })
  } catch (error) {
    logger.error('Error initializing gamification:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to initialize gamification'
    })
  }
})

/**
 * POST /gamification/badges/:id/claim
 * Claim an eligible badge
 */
router.post('/badges/:id/claim', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id)
    const badgeId = new mongoose.Types.ObjectId(req.params.id)
    
    // Check and unlock eligible badges (this will validate eligibility)
    const unlockedBadges = await GamificationService.checkAndUnlockBadges(userId)
    
    // Check if the requested badge was unlocked
    const claimedBadge = unlockedBadges.find(b => b.badge._id.equals(badgeId))
    
    if (claimedBadge) {
      res.json({
        success: true,
        data: claimedBadge,
        message: 'Badge claimed successfully'
      })
    } else {
      res.status(400).json({
        success: false,
        message: 'Badge not eligible or already claimed'
      })
    }
  } catch (error) {
    logger.error('Error claiming badge:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to claim badge'
    })
  }
})

export default router
