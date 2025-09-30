import { Router, Request, Response } from 'express'
import { authenticate } from '@/middleware/auth'
import { adminAuth } from '@/middleware/admin'
import UserProgress from '@/models/UserProgress'
import { PatternService } from '@/services/patternService'
import { logger } from '@/utils/logger'
import mongoose from 'mongoose'

const router = Router()

/**
 * POST /migration/backfill-platform-data
 * Backfill platform information for existing activity logs
 * Admin only endpoint
 */
router.post('/backfill-platform-data', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    logger.info('Starting platform data backfill migration')

    // Load all patterns to get problem platform information
    const patterns = await PatternService.loadPatterns()
    const problemPlatformMap = new Map<string, string>()

    // Build a map of problemId -> platform
    patterns.forEach((pattern: any) => {
      if (pattern.subPatterns && Array.isArray(pattern.subPatterns)) {
        pattern.subPatterns.forEach((subPattern: any) => {
          if (subPattern.problems && Array.isArray(subPattern.problems)) {
            subPattern.problems.forEach((problem: any) => {
              if (problem.id && problem.platform) {
                problemPlatformMap.set(problem.id.toString(), problem.platform.toLowerCase())
              }
            })
          }
        })
      }
    })

    logger.info(`Built platform map for ${problemPlatformMap.size} problems`)

    // Get all user progress documents
    const userProgressDocs = await UserProgress.find({})
    let totalUpdated = 0
    let totalLogs = 0

    for (const userProgress of userProgressDocs) {
      let docUpdated = false

      // Update activity logs that are missing platform data
      for (const log of userProgress.activityLog) {
        totalLogs++

        if (log.type === 'problem_solved' && log.problemId && (!log.metadata || !log.metadata.platform)) {
          const platform = problemPlatformMap.get(log.problemId.toString())

          if (platform) {
            // Initialize metadata if it doesn't exist
            if (!log.metadata) {
              log.metadata = {}
            }

            log.metadata.platform = platform
            docUpdated = true
            totalUpdated++
          }
        }
      }

      // Save the document if any logs were updated
      if (docUpdated) {
        await userProgress.save()
        logger.info(`Updated platform data for user ${userProgress.userId}`)
      }
    }

    logger.info(`Migration completed. Updated ${totalUpdated} out of ${totalLogs} activity logs`)

    res.json({
      success: true,
      message: 'Platform data backfill completed',
      data: {
        totalActivityLogs: totalLogs,
        updatedLogs: totalUpdated,
        usersProcessed: userProgressDocs.length,
        problemsWithPlatformData: problemPlatformMap.size
      }
    })

  } catch (error) {
    logger.error('Error during platform data backfill:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to complete platform data backfill',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /migration/platform-data-status
 * Check the status of platform data in activity logs
 * Admin only endpoint
 */
router.get('/platform-data-status', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const userProgressDocs = await UserProgress.find({})

    let totalLogs = 0
    let logsWithPlatform = 0
    let logsWithoutPlatform = 0
    const platformCounts: { [key: string]: number } = {}

    userProgressDocs.forEach(userProgress => {
      userProgress.activityLog.forEach(log => {
        if (log.type === 'problem_solved') {
          totalLogs++

          const platform = log.metadata?.platform
          if (platform) {
            logsWithPlatform++
            platformCounts[platform] = (platformCounts[platform] || 0) + 1
          } else {
            logsWithoutPlatform++
          }
        }
      })
    })

    res.json({
      success: true,
      data: {
        totalProblemSolvedLogs: totalLogs,
        logsWithPlatformData: logsWithPlatform,
        logsWithoutPlatformData: logsWithoutPlatform,
        platformDistribution: platformCounts,
        completionPercentage: totalLogs > 0 ? Math.round((logsWithPlatform / totalLogs) * 100) : 0
      }
    })

  } catch (error) {
    logger.error('Error checking platform data status:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to check platform data status'
    })
  }
})

export default router