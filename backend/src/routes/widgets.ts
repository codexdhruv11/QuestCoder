import { Router } from 'express'
import { logger } from '@/utils/logger'
import { authenticate, optionalAuthenticate } from '@/middleware/auth'
import { PlatformService } from '@/services/platformService'
import UserProgress from '@/models/UserProgress'
import User from '@/models/User'

const router = Router()

// PlatformService methods are static, no instance needed

// LeetCode stats widget
router.get('/leetcode/:username', optionalAuthenticate, async (req, res) => {
  try {
    const { username } = req.params
    if (!username) {
      res.status(400).json({
        success: false,
        message: 'Username is required'
      })
      return
    }
    
    // Get data from platform service with caching
    const data = await PlatformService.getLeetCodeStats(username)
    
    res.json({
      success: true,
      data,
      cached: false,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    logger.error('LeetCode widget error:', error)
    
    // Return mock data as fallback
    res.json({
      success: true,
      data: {
        handle: req.params['username'],
        totalSolved: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
        acceptanceRate: 0,
        ranking: 0,
        reputation: 0,
        recentSubmissions: [],
        error: 'Failed to fetch real data, showing placeholder'
      },
      cached: false,
      fallback: true
    })
  }
})

// Codeforces stats widget
router.get('/codeforces/:username', optionalAuthenticate, async (req, res) => {
  try {
    const { username } = req.params
    if (!username) {
      res.status(400).json({
        success: false,
        message: 'Username is required'
      })
      return
    }
    
    // Get data from platform service with caching
    const data = await PlatformService.getCodeforcesStats(username)
    
    res.json({
      success: true,
      data,
      cached: false,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Codeforces widget error:', error)
    
    // Return mock data as fallback
    res.json({
      success: true,
      data: {
        handle: req.params['username'],
        rating: 0,
        maxRating: 0,
        rank: 'Unrated',
        maxRank: 'Unrated',
        contestsParticipated: 0,
        problemsSolved: 0,
        recentContests: [],
        error: 'Failed to fetch real data, showing placeholder'
      },
      cached: false,
      fallback: true
    })
  }
})

// HackerEarth stats widget (placeholder implementation)
router.get('/hackerearth/:username', optionalAuthenticate, async (req, res) => {
  try {
    const { username } = req.params
    
    // Return placeholder data for HackerEarth
    // Note: HackerEarth doesn't have a public API, so this is a stub
    res.json({
      success: true,
      data: {
        username,
        rating: 1500,
        problems: 42,
        submissions: 150,
        badges: ['Problem Solver', 'Active Learner'],
        recentActivity: [
          { date: new Date().toISOString(), type: 'problem_solved', title: 'Array Challenge' },
          { date: new Date(Date.now() - 86400000).toISOString(), type: 'contest', title: 'Weekly Contest 42' }
        ],
        message: 'HackerEarth integration pending API availability'
      },
      cached: false,
      placeholder: true
    })
  } catch (error) {
    logger.error('HackerEarth widget error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get HackerEarth data'
    })
  }
})

// GitHub stats widget
router.get('/github/:username', optionalAuthenticate, async (req, res) => {
  try {
    const { username } = req.params
    if (!username) {
      res.status(400).json({
        success: false,
        message: 'Username is required'
      })
      return
    }
    
    // Get data from platform service with caching
    const data = await PlatformService.getGitHubStats(username)
    
    res.json({
      success: true,
      data,
      cached: false,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    logger.error('GitHub widget error:', error)
    
    // Return mock data as fallback
    res.json({
      success: true,
      data: {
        handle: req.params['username'],
        publicRepos: 0,
        followers: 0,
        following: 0,
        contributions: 0,
        streak: 0,
        languages: {},
        recentActivity: [],
        error: 'Failed to fetch real data, showing placeholder'
      },
      cached: false,
      fallback: true
    })
  }
})

// User streak widget (uses authenticated user data)
router.get('/streak', authenticate, async (req, res) => {
  try {
    const userId = req.user!._id
    
    // Get user progress data
    let userProgress = await UserProgress.findOne({ userId })
    if (!userProgress) {
      userProgress = new UserProgress({ userId })
      await userProgress.save()
    }
    
    // Calculate streak calendar for the last 30 days
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    const streakCalendar: Record<string, boolean> = {}
    const activeDates = new Set<string>()
    
    // Mark days with problem solving activity
    userProgress.activityLog.forEach(activity => {
      if (activity.type === 'problem_solved' && activity.date >= thirtyDaysAgo) {
        const dateKey = activity.date.toISOString().split('T')[0]
        if (dateKey) {
          activeDates.add(dateKey)
        }
      }
    })
    
    // Build calendar for last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      if (dateKey) {
        streakCalendar[dateKey] = activeDates.has(dateKey)
      }
    }
    
    // Calculate weekly stats (last 7 days)
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 7)
    
    const recentActivity = userProgress.activityLog.filter(activity => 
      activity.type === 'problem_solved' && activity.date >= weekAgo
    )
    
    const platformsUsed = new Set<string>()
    recentActivity.forEach(activity => {
      if (activity.patternName) {
        platformsUsed.add('QuestCoder')
      }
    })
    
    const weeklyStats = {
      problemsSolved: recentActivity.length,
      platformsUsed: Array.from(platformsUsed),
      averageProblemsPerDay: recentActivity.length / 7
    }
    
    res.json({
      success: true,
      data: {
        userId: userId.toString(),
        currentStreak: userProgress.currentStreak,
        longestStreak: userProgress.longestStreak,
        totalActiveDays: activeDates.size,
        lastActivity: userProgress.lastSolvedAt,
        streakCalendar,
        weeklyStats
      }
    })
  } catch (error) {
    logger.error('Streak widget error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get streak data'
    })
  }
})

// Get all widgets data for authenticated user
router.get('/dashboard', authenticate, async (req, res): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id)
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      })
      return
    }
    
    const results: any = {
      streak: null,
      leetcode: null,
      codeforces: null,
      github: null
    }
    
    // Get streak data
    try {
      const userProgress = await UserProgress.findOne({ userId: user._id }) || new UserProgress({ userId: user._id })
      
      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      
      const recentActivity = userProgress.activityLog.filter(activity => 
        activity.type === 'problem_solved' && activity.date >= weekAgo
      )
      
      results.streak = {
        currentStreak: userProgress.currentStreak,
        longestStreak: userProgress.longestStreak,
        lastActivity: userProgress.lastSolvedAt,
        weeklyProblems: recentActivity.length
      }
    } catch (error) {
      logger.error('Dashboard streak error:', error)
    }
    
    // Get platform data if user has handles configured
    const promises = []
    
    if (user.leetcodeHandle) {
      promises.push(
        PlatformService.getLeetCodeStats(user.leetcodeHandle)
          .then(data => { results.leetcode = data })
          .catch(error => {
            logger.error('Dashboard LeetCode error:', error)
            results.leetcode = { error: 'Failed to fetch data' }
          })
      )
    }
    
    if (user.codeforcesHandle) {
      promises.push(
        PlatformService.getCodeforcesStats(user.codeforcesHandle)
          .then(data => { results.codeforces = data })
          .catch(error => {
            logger.error('Dashboard Codeforces error:', error)
            results.codeforces = { error: 'Failed to fetch data' }
          })
      )
    }
    
    if (user.githubHandle) {
      promises.push(
        PlatformService.getGitHubStats(user.githubHandle)
          .then(data => { results.github = data })
          .catch(error => {
            logger.error('Dashboard GitHub error:', error)
            results.github = { error: 'Failed to fetch data' }
          })
      )
    }
    
    // Wait for all platform data (with timeout)
    await Promise.allSettled(promises)
    
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Dashboard widgets error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    })
  }
})

export default router
