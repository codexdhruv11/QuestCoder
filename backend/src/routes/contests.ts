import { Router } from 'express'
import { logger } from '@/utils/logger'
import { optionalAuthenticate } from '@/middleware/auth'
import { ContestService } from '@/services/contestService'

const router = Router()

// Get all upcoming contests (LeetCode and Codeforces)
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    const { platform } = req.query

    // Validate platform parameter if provided
    if (platform && typeof platform === 'string') {
      const validPlatforms = ['leetcode', 'codeforces']
      if (!validPlatforms.includes(platform.toLowerCase())) {
        res.status(400).json({
          success: false,
          message: 'Invalid platform. Must be "leetcode" or "codeforces"'
        })
        return
      }
    }

    // Get contests data
    const data = await ContestService.getUpcomingContests(platform as string)

    res.json({
      success: true,
      data: data.data,
      meta: {
        total: data.data.length,
        platform: platform || 'all',
        lastUpdated: data.lastUpdated,
        cached: data.cached
      }
    })
  } catch (error) {
    logger.error('Contests API error:', error)

    // Safely extract error message to avoid circular references
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch contest data',
      error: errorMessage
    })
  }
})

// Get LeetCode contests only
router.get('/leetcode', optionalAuthenticate, async (req, res) => {
  try {
    const data = await ContestService.getLeetCodeContests()

    res.json({
      success: true,
      data: data.data,
      meta: {
        total: data.data.length,
        platform: 'leetcode',
        lastUpdated: data.lastUpdated,
        cached: data.cached
      }
    })
  } catch (error) {
    logger.error('LeetCode contests API error:', error)

    // Safely extract error message to avoid circular references
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch LeetCode contest data',
      error: errorMessage
    })
  }
})

// Get Codeforces contests only
router.get('/codeforces', optionalAuthenticate, async (req, res) => {
  try {
    const data = await ContestService.getCodeforcesContests()

    res.json({
      success: true,
      data: data.data,
      meta: {
        total: data.data.length,
        platform: 'codeforces',
        lastUpdated: data.lastUpdated,
        cached: data.cached
      }
    })
  } catch (error) {
    logger.error('Codeforces contests API error:', error)

    // Safely extract error message to avoid circular references
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch Codeforces contest data',
      error: errorMessage
    })
  }
})

// Clear contest cache (admin endpoint)
router.delete('/cache', optionalAuthenticate, async (req, res) => {
  try {
    const { platform } = req.query

    if (platform && typeof platform === 'string') {
      const validPlatforms = ['leetcode', 'codeforces']
      if (!validPlatforms.includes(platform.toLowerCase())) {
        res.status(400).json({
          success: false,
          message: 'Invalid platform. Must be "leetcode" or "codeforces"'
        })
        return
      }
      ContestService.clearCache(platform)
    } else {
      ContestService.clearAllCache()
    }

    res.json({
      success: true,
      message: `Contest cache cleared${platform ? ` for ${platform}` : ' for all platforms'}`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Clear contest cache error:', error)

    // Safely extract error message to avoid circular references
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    res.status(500).json({
      success: false,
      message: 'Failed to clear contest cache',
      error: errorMessage
    })
  }
})

// Health check endpoint for contest service
router.get('/health', optionalAuthenticate, async (req, res) => {
  try {
    // Try to fetch a small amount of data to test the service
    const testData = await ContestService.getUpcomingContests()

    res.json({
      success: true,
      message: 'Contest service is healthy',
      status: {
        api: 'operational',
        contestsAvailable: testData.data.length,
        lastUpdated: testData.lastUpdated,
        cached: testData.cached
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Contest service health check failed:', error)

    // Safely extract error message to avoid circular references
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    res.status(503).json({
      success: false,
      message: 'Contest service is unhealthy',
      status: {
        api: 'error',
        error: errorMessage
      },
      timestamp: new Date().toISOString()
    })
  }
})

export default router