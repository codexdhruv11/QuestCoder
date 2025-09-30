import { Router } from 'express'
import { logger } from '@/utils/logger'
import { authenticate } from '@/middleware/auth'
import { PlatformService } from '@/services/platformService'
import User from '@/models/User'

const router = Router()

/**
 * Get available years with activity (from first submission to current year)
 */
router.get('/years', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user!._id)
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      })
      return
    }

    const years: number[] = []
    const currentYear = new Date().getFullYear()

    // Fetch submission histories to find first submission year
    const promises: Promise<any>[] = []

    if (user.leetcodeHandle) {
      promises.push(
        PlatformService.getLeetCodeSubmissionHistory(user.leetcodeHandle)
          .catch(() => [])
      )
    }

    if (user.codeforcesHandle) {
      promises.push(
        PlatformService.getCodeforcesSubmissionHistory(user.codeforcesHandle)
          .catch(() => [])
      )
    }

    const histories = await Promise.all(promises)
    const allSubmissions = histories.flat()

    if (allSubmissions.length > 0) {
      // Find earliest submission date
      const sortedDates = allSubmissions
        .map(sub => new Date(sub.date))
        .sort((a, b) => a.getTime() - b.getTime())

      const firstYear = sortedDates[0]?.getFullYear() || currentYear

      // Generate year range from first submission to current year
      for (let year = firstYear; year <= currentYear; year++) {
        years.push(year)
      }
    } else {
      // No submissions, return current year only
      years.push(currentYear)
    }

    res.json({
      success: true,
      data: years
    })
  } catch (error) {
    logger.error('Get years error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get years'
    })
  }
})

/**
 * Get contribution history (submission activity by date) for a specific year
 */
router.get('/contribution-history', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user!._id)
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      })
      return
    }

    const year = req.query['year'] ? parseInt(req.query['year'] as string) : new Date().getFullYear()

    // Fetch submission histories from both platforms (ALL submissions for contribution graph)
    const promises: Promise<any>[] = []

    if (user.leetcodeHandle) {
      promises.push(
        PlatformService.getLeetCodeSubmissionHistory(user.leetcodeHandle)
          .catch(() => [])
      )
    }

    if (user.codeforcesHandle) {
      promises.push(
        PlatformService.getCodeforcesAllSubmissions(user.codeforcesHandle)
          .catch(() => [])
      )
    }

    const [leetcodeHistory = [], codeforcesHistory = []] = await Promise.all(promises)

    // Filter by year and aggregate by date
    const contributionMap = new Map<string, { leetcode: number; codeforces: number }>()

    // Process LeetCode submissions
    leetcodeHistory.forEach((submission: any) => {
      const date = new Date(submission.date)
      if (date.getFullYear() === year) {
        const dateKey = submission.date
        const existing = contributionMap.get(dateKey) || { leetcode: 0, codeforces: 0 }
        existing.leetcode += submission.count
        contributionMap.set(dateKey, existing)
      }
    })

    // Process Codeforces submissions
    codeforcesHistory.forEach((submission: any) => {
      const date = new Date(submission.date)
      if (date.getFullYear() === year) {
        const dateKey = submission.date
        const existing = contributionMap.get(dateKey) || { leetcode: 0, codeforces: 0 }
        existing.codeforces += submission.count
        contributionMap.set(dateKey, existing)
      }
    })

    // Convert to array format
    const contributions = Array.from(contributionMap.entries()).map(([date, counts]) => ({
      date,
      leetcode: counts.leetcode,
      codeforces: counts.codeforces,
      total: counts.leetcode + counts.codeforces
    }))

    // Sort by date
    contributions.sort((a, b) => a.date.localeCompare(b.date))

    res.json({
      success: true,
      data: contributions,
      year,
      totalDays: contributions.length,
      totalSubmissions: contributions.reduce((sum, day) => sum + day.total, 0)
    })
  } catch (error) {
    logger.error('Get contribution history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get contribution history'
    })
  }
})

/**
 * Get complete analytics stats (submissions, problems solved, efficiency)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user!._id)
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      })
      return
    }

    const stats: any = {
      leetcode: {
        submissions: 0,
        problemsSolved: 0,
        efficiency: 0,
        difficulty: { easy: 0, medium: 0, hard: 0 }
      },
      codeforces: {
        submissions: 0,
        problemsSolved: 0,
        efficiency: 0
      },
      combined: {
        submissions: 0,
        problemsSolved: 0,
        efficiency: 0
      }
    }

    // Fetch LeetCode data
    if (user.leetcodeHandle) {
      try {
        const [lcStats, lcHistory] = await Promise.all([
          PlatformService.getLeetCodeStats(user.leetcodeHandle),
          PlatformService.getLeetCodeSubmissionHistory(user.leetcodeHandle)
        ])

        // Calculate total submissions from submission calendar
        const totalSubmissions = lcHistory.reduce((sum, day) => sum + day.count, 0)

        stats.leetcode.submissions = totalSubmissions
        stats.leetcode.problemsSolved = lcStats.totalSolved
        stats.leetcode.efficiency = stats.leetcode.problemsSolved > 0
          ? parseFloat((totalSubmissions / stats.leetcode.problemsSolved).toFixed(2))
          : 0
        stats.leetcode.difficulty = {
          easy: lcStats.easySolved,
          medium: lcStats.mediumSolved,
          hard: lcStats.hardSolved
        }
      } catch (error) {
        logger.error('LeetCode stats error:', error)
      }
    }

    // Fetch Codeforces data
    if (user.codeforcesHandle) {
      try {
        const [cfStats, cfAllSubmissions] = await Promise.all([
          PlatformService.getCodeforcesStats(user.codeforcesHandle),
          PlatformService.getCodeforcesAllSubmissions(user.codeforcesHandle)
        ])

        // Calculate total submissions from ALL submissions history
        const totalSubmissions = cfAllSubmissions.reduce((sum, day) => sum + day.count, 0)

        stats.codeforces.submissions = totalSubmissions
        stats.codeforces.problemsSolved = cfStats.problemsSolved
        stats.codeforces.efficiency = stats.codeforces.problemsSolved > 0
          ? parseFloat((totalSubmissions / stats.codeforces.problemsSolved).toFixed(2))
          : 0
      } catch (error) {
        logger.error('Codeforces stats error:', error)
      }
    }

    // Calculate combined stats
    stats.combined.submissions = stats.leetcode.submissions + stats.codeforces.submissions
    stats.combined.problemsSolved = stats.leetcode.problemsSolved + stats.codeforces.problemsSolved
    stats.combined.efficiency = stats.combined.problemsSolved > 0
      ? parseFloat((stats.combined.submissions / stats.combined.problemsSolved).toFixed(2))
      : 0

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Get analytics stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics stats'
    })
  }
})

/**
 * Get weekly activity (submissions by day of week) for a specific year
 */
router.get('/weekly', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user!._id)
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      })
      return
    }

    const year = req.query['year'] ? parseInt(req.query['year'] as string) : new Date().getFullYear()

    // Fetch submission histories (ALL submissions for activity chart)
    const promises: Promise<any>[] = []

    if (user.leetcodeHandle) {
      promises.push(
        PlatformService.getLeetCodeSubmissionHistory(user.leetcodeHandle)
          .catch(() => [])
      )
    }

    if (user.codeforcesHandle) {
      promises.push(
        PlatformService.getCodeforcesAllSubmissions(user.codeforcesHandle)
          .catch(() => [])
      )
    }

    const [leetcodeHistory = [], codeforcesHistory = []] = await Promise.all(promises)

    // Initialize weekly data
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const weeklyData = daysOfWeek.map(day => ({
      dayOfWeek: day,
      leetcode: 0,
      codeforces: 0,
      total: 0
    }))

    // Process LeetCode submissions
    leetcodeHistory.forEach((submission: any) => {
      const date = new Date(submission.date)
      if (date.getFullYear() === year) {
        const dayIndex = date.getDay()
        weeklyData[dayIndex]!.leetcode += submission.count
        weeklyData[dayIndex]!.total += submission.count
      }
    })

    // Process Codeforces submissions
    codeforcesHistory.forEach((submission: any) => {
      const date = new Date(submission.date)
      if (date.getFullYear() === year) {
        const dayIndex = date.getDay()
        weeklyData[dayIndex]!.codeforces += submission.count
        weeklyData[dayIndex]!.total += submission.count
      }
    })

    res.json({
      success: true,
      data: weeklyData,
      year
    })
  } catch (error) {
    logger.error('Get weekly activity error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get weekly activity'
    })
  }
})

/**
 * Get monthly trend (submissions and problems by month) for a specific year
 */
router.get('/monthly', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user!._id)
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      })
      return
    }

    const year = req.query['year'] ? parseInt(req.query['year'] as string) : new Date().getFullYear()

    // Fetch submission histories (ALL submissions for monthly trends)
    const promises: Promise<any>[] = []

    if (user.leetcodeHandle) {
      promises.push(
        PlatformService.getLeetCodeSubmissionHistory(user.leetcodeHandle)
          .catch(() => [])
      )
    }

    if (user.codeforcesHandle) {
      promises.push(
        PlatformService.getCodeforcesAllSubmissions(user.codeforcesHandle)
          .catch(() => [])
      )
    }

    const [leetcodeHistory = [], codeforcesHistory = []] = await Promise.all(promises)

    // Initialize monthly data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlyData = months.map((month, index) => ({
      month,
      monthNumber: index + 1,
      leetcode: 0,
      codeforces: 0,
      total: 0
    }))

    // Process LeetCode submissions
    leetcodeHistory.forEach((submission: any) => {
      const date = new Date(submission.date)
      if (date.getFullYear() === year) {
        const monthIndex = date.getMonth()
        monthlyData[monthIndex]!.leetcode += submission.count
        monthlyData[monthIndex]!.total += submission.count
      }
    })

    // Process Codeforces submissions
    codeforcesHistory.forEach((submission: any) => {
      const date = new Date(submission.date)
      if (date.getFullYear() === year) {
        const monthIndex = date.getMonth()
        monthlyData[monthIndex]!.codeforces += submission.count
        monthlyData[monthIndex]!.total += submission.count
      }
    })

    res.json({
      success: true,
      data: monthlyData,
      year
    })
  } catch (error) {
    logger.error('Get monthly trend error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get monthly trend'
    })
  }
})

export default router