import { Router } from 'express'
import { logger } from '@/utils/logger'
import UserProgress from '@/models/UserProgress'
import { authenticate, optionalAuthenticate } from '@/middleware/auth'
import { PatternService } from '@/services/patternService'
import GamificationService from '@/services/gamificationService'
import LeaderboardService from '@/services/leaderboardService'
import SocketEvents from '@/socket/events'
import mongoose from 'mongoose'

const router = Router()

// Get all patterns with optional filtering
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    const { category, platform, difficulty, search, limit = '20', offset = '0' } = req.query
    
    // Input validation for platform and difficulty
    const sanitizedPlatform = platform ? (platform as string).toLowerCase().trim() : undefined
    const sanitizedDifficulty = difficulty ? (difficulty as string).toLowerCase().trim() : undefined
    
    // Apply pagination limits
    const limitNum = Math.min(parseInt(limit as string) || 20, 100)
    const offsetNum = Math.max(parseInt(offset as string) || 0, 0)
    
    // Use enhanced PatternService filtering
    const { patterns: filteredPatterns, total } = await PatternService.getFilteredPatterns({
      category: category as string,
      platform: sanitizedPlatform,
      difficulty: sanitizedDifficulty,
      search: search as string,
      limit: limitNum,
      offset: offsetNum
    })
    
    // Deep clone patterns to avoid mutating cached data
    const responsePatterns = JSON.parse(JSON.stringify(filteredPatterns))
    
    // If user is authenticated, add their progress data
    if (req.user) {
      const userProgress = await UserProgress.findOne({ userId: req.user._id })
      if (userProgress) {
        responsePatterns.forEach((pattern: any) => {
          const progress = userProgress.patternProgress.find(p => p.patternName === pattern.name)
          if (progress) {
            pattern.userProgress = {
              solvedProblems: progress.solvedProblems,
              totalProblems: progress.totalProblems,
              completionRate: progress.totalProblems > 0 ? Math.round((progress.solvedProblems / progress.totalProblems) * 100) : 0,
              solvedProblemIds: progress.solvedProblemIds || []
            }
            
            // Mark individual problems as solved in nested subPatterns
            if (pattern.subPatterns && progress.solvedProblemIds) {
              pattern.subPatterns.forEach((subPattern: any) => {
                if (subPattern.problems) {
                  subPattern.problems.forEach((problem: any) => {
                    problem.solved = progress.solvedProblemIds!.includes(problem.id || problem._id)
                  })
                }
              })
            }
          }
        })
      }
    }
    
    res.json({
      success: true,
      patterns: responsePatterns,
      pagination: {
        total: total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      }
    })
  } catch (error) {
    logger.error('Get patterns error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to load patterns'
    })
  }
})

// Get pattern by ID with user progress
router.get('/:id', optionalAuthenticate, async (req, res): Promise<void> => {
  try {
    const patterns = await PatternService.loadPatterns()
    const pattern = patterns.find(p => p._id === req.params['id'] || p.slug === req.params['id'] || p.id === req.params['id'])
    
    if (!pattern) {
      res.status(404).json({
        success: false,
        message: 'Pattern not found'
      })
      return
    }
    
    // Deep clone pattern to avoid mutating cache
    const responsePattern = JSON.parse(JSON.stringify(pattern))
    
    // Add user progress if authenticated
    if (req.user) {
      const userProgress = await UserProgress.findOne({ userId: req.user._id })
      if (userProgress) {
        const progress = userProgress.patternProgress.find(p => p.patternName === responsePattern.name)
        if (progress) {
          responsePattern.userProgress = {
            solvedProblems: progress.solvedProblems,
            totalProblems: progress.totalProblems,
            completionRate: progress.totalProblems > 0 ? Math.round((progress.solvedProblems / progress.totalProblems) * 100) : 0,
            solvedProblemIds: progress.solvedProblemIds || []
          }
          
          // Mark individual problems as solved in nested subPatterns
          if (responsePattern.subPatterns && progress.solvedProblemIds) {
            responsePattern.subPatterns.forEach((subPattern: any) => {
              if (subPattern.problems) {
                subPattern.problems.forEach((problem: any) => {
                  problem.solved = progress.solvedProblemIds!.includes(problem.id || problem._id)
                })
              }
            })
          }
        }
      }
    }
    
    res.json({
      success: true,
      pattern: responsePattern
    })
  } catch (error) {
    logger.error('Get pattern error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to load pattern'
    })
  }
})

// Mark problem as completed/incomplete
router.post('/:patternId/problems/:problemId/toggle', authenticate, async (req, res): Promise<void> => {
  try {
    const { patternId, problemId } = req.params
    const userId = req.user!._id
    
    // Get pattern data to validate
    const patterns = await PatternService.loadPatterns()
    const pattern = patterns.find(p => p._id === patternId || p.slug === patternId || p.id === patternId || p.name === patternId)
    
    if (!pattern) {
      res.status(404).json({
        success: false,
        message: 'Pattern not found'
      })
      return
    }
    
    // Find problem in nested subPatterns
    let problem: any = null
    let totalProblems = 0
    
    if (pattern.subPatterns) {
      for (const subPattern of pattern.subPatterns) {
        if (subPattern.problems) {
          totalProblems += subPattern.problems.length
          const foundProblem = subPattern.problems.find((p: any) => p.id === problemId || p._id === problemId)
          if (foundProblem) {
            problem = foundProblem
            break
          }
        }
      }
    }
    
    if (!problem) {
      res.status(404).json({
        success: false,
        message: 'Problem not found'
      })
      return
    }
    
    // Get or create user progress
    let userProgress = await UserProgress.findOne({ userId })
    if (!userProgress) {
      userProgress = new UserProgress({ userId })
    }
    
    // Find or create pattern progress
    let patternProgress = userProgress.patternProgress.find(p => p.patternName === pattern.name)
    if (!patternProgress) {
      patternProgress = {
        patternName: pattern.name,
        totalProblems: totalProblems,
        solvedProblems: 0,
        solvedProblemIds: []
      }
      userProgress.patternProgress.push(patternProgress)
    }
    
    // Toggle problem completion
    const problemIdStr = (problemId as string)
    const isCurrentlySolved = patternProgress.solvedProblemIds?.includes(problemIdStr) || false
    
    if (isCurrentlySolved) {
      // Remove from solved problems
      patternProgress.solvedProblemIds = patternProgress.solvedProblemIds?.filter(id => id !== problemIdStr) || []
      patternProgress.solvedProblems = Math.max(0, patternProgress.solvedProblems - 1)
      
      // Log activity
      userProgress.activityLog.push({
        type: 'problem_unsolved',
        problemId: problemIdStr,
        patternName: pattern.name,
        date: new Date()
      })
      
      // Save progress after unsolving
      await userProgress.save()
    } else {
      // Add to solved problems
      if (!patternProgress.solvedProblemIds) {
        patternProgress.solvedProblemIds = []
      }
      patternProgress.solvedProblemIds.push(problemIdStr)
      patternProgress.solvedProblems += 1
      
      // Update last solved time and check streak
      const now = new Date()
      const lastSolved = userProgress.lastSolvedAt
      let streakExtended = false
      
      if (lastSolved) {
        const daysSinceLastSolved = Math.floor((now.getTime() - lastSolved.getTime()) / (1000 * 60 * 60 * 24))
        if (daysSinceLastSolved === 1) {
          userProgress.currentStreak += 1
          streakExtended = true
        } else if (daysSinceLastSolved > 1) {
          userProgress.currentStreak = 1
          streakExtended = false
        } else {
          // Same day - no streak change
          streakExtended = false
        }
      } else {
        userProgress.currentStreak = 1
        streakExtended = true
      }
      
      userProgress.longestStreak = Math.max(userProgress.longestStreak, userProgress.currentStreak)
      userProgress.lastSolvedAt = now
      
      // Log activity with metadata including platform information
      userProgress.activityLog.push({
        type: 'problem_solved',
        problemId: problemIdStr,
        patternName: pattern.name,
        date: now,
        metadata: {
          difficulty: problem.difficulty || 'Medium',
          platform: problem.platform || 'Unknown'
        }
      })
      
      // Save progress before processing gamification to ensure badge eligibility checks use latest data
      await userProgress.save()

      // Process gamification rewards for problem completion
      const userObjectId = new mongoose.Types.ObjectId(userId)
      const xpResult = await GamificationService.processXpGain(
        userObjectId,
        problem.difficulty || 'Medium',
        userProgress.currentStreak
      )
      
      // Emit comprehensive real-time events if Socket.IO is available
      if (req.app.locals['socketEvents']) {
        const socketEvents = req.app.locals['socketEvents'] as SocketEvents

        try {
          // Emit individual user progress update
          const canonicalPatternId = String(pattern._id || pattern.id || pattern.slug || pattern.name)
          await socketEvents.emitUserProgressUpdate(
            userObjectId,
            req.user!.username,
            canonicalPatternId,
            problemIdStr,
            {
              solvedCount: patternProgress.solvedProblems,
              completionRate: patternProgress.totalProblems > 0 ?
                Math.round((patternProgress.solvedProblems / patternProgress.totalProblems) * 100) : 0,
              streakInfo: {
                currentStreak: userProgress.currentStreak,
                longestStreak: userProgress.longestStreak,
                streakExtended: streakExtended
              },
              patternProgress: {
                totalProblems: patternProgress.totalProblems,
                solvedProblems: patternProgress.solvedProblems,
                completionRate: patternProgress.totalProblems > 0 ?
                  Math.round((patternProgress.solvedProblems / patternProgress.totalProblems) * 100) : 0
              }
            }
          )

          // Emit existing events (XP, badges, streak)
          await socketEvents.emitXpGain(userObjectId, {
            xpGained: xpResult.xpGained,
            totalXp: xpResult.totalXp,
            leveledUp: xpResult.leveledUp,
            ...(xpResult.newLevel !== undefined && { newLevel: xpResult.newLevel })
          })
          
          if (xpResult.badgesUnlocked.length > 0) {
            await socketEvents.emitBadgeUnlock(userObjectId, xpResult.badgesUnlocked)
          }
          
          await socketEvents.emitStreakUpdate(userObjectId, {
            currentStreak: userProgress.currentStreak,
            longestStreak: userProgress.longestStreak,
            streakExtended: streakExtended
          })
          
          // Check if pattern is completed
          if (patternProgress.solvedProblems === patternProgress.totalProblems) {
            await socketEvents.emitPatternCompletion(userObjectId, {
              patternName: pattern.name,
              completionTime: Date.now(),
              totalProblems: patternProgress.totalProblems
            })
          }

          // 5. Enhanced leaderboard updates for all three types
          try {
            // Clear caches and get updated ranks
            await LeaderboardService.clearCache()
            
            // Get user's current ranks
            const xpRank = await LeaderboardService.getUserRank(userObjectId, 'xp')
            const problemsRank = await LeaderboardService.getUserRank(userObjectId, 'problems')
            const streakRank = await LeaderboardService.getUserRank(userObjectId, 'streak')

            // Emit enhanced leaderboard updates for each type
            await socketEvents.emitEnhancedLeaderboardUpdate('xp', [{
              userId: userObjectId,
              username: req.user!.username,
              rank: xpRank || 0,
              score: xpResult.totalXp
            }])

            await socketEvents.emitEnhancedLeaderboardUpdate('problems', [{
              userId: userObjectId,
              username: req.user!.username,
              rank: problemsRank || 0,
              score: patternProgress.solvedProblems
            }])

            await socketEvents.emitEnhancedLeaderboardUpdate('streak', [{
              userId: userObjectId,
              username: req.user!.username,
              rank: streakRank || 0,
              score: userProgress.currentStreak
            }])
          } catch (leaderboardError) {
            logger.error('Error updating leaderboards:', leaderboardError)
          }

          // 6. Emit comprehensive stats update
          const recentAchievements = []
          if (xpResult.leveledUp) {
            recentAchievements.push({
              type: 'level' as const,
              name: `Level ${xpResult.newLevel}`,
              description: `Reached level ${xpResult.newLevel}`,
              timestamp: new Date().toISOString()
            })
          }
          
          xpResult.badgesUnlocked.forEach(badgeData => {
            recentAchievements.push({
              type: 'badge' as const,
              name: badgeData.badge.name,
              description: badgeData.badge.description,
              timestamp: new Date().toISOString()
            })
          })

          if (patternProgress.solvedProblems === patternProgress.totalProblems) {
            recentAchievements.push({
              type: 'pattern_completion' as const,
              name: `${pattern.name} Completed`,
              description: `Completed all ${patternProgress.totalProblems} problems`,
              timestamp: new Date().toISOString()
            })
          }

          // Calculate today's problems and weekly stats
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const todayProblems = userProgress.activityLog.filter(activity => 
            activity.type === 'problem_solved' && activity.date >= today
          ).length

          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          const weeklyProblems = userProgress.activityLog.filter(activity => 
            activity.type === 'problem_solved' && activity.date >= weekAgo
          ).length

          // Calculate current level from XP if not provided in xpResult
          const currentLevel = xpResult.newLevel || GamificationService.calculateLevelFromXp(xpResult.totalXp)
          
          await socketEvents.emitRealTimeStats(userObjectId, {
            totalProblems: userProgress.patternProgress.reduce((sum, p) => sum + p.solvedProblems, 0),
            currentStreak: userProgress.currentStreak,
            totalXp: xpResult.totalXp,
            currentLevel: currentLevel,
            recentAchievements,
            problemsSolvedToday: todayProblems,
            weeklyStats: {
              problemsSolved: weeklyProblems,
              xpGained: xpResult.xpGained,
              patternsCompleted: userProgress.patternProgress.filter(p => 
                p.solvedProblems === p.totalProblems && p.totalProblems > 0
              ).length
            }
          })

        } catch (socketError) {
          logger.error('Error emitting socket events:', socketError)
          // Don't throw - socket errors shouldn't affect the main functionality
        }
      }
    }
    
    res.json({
      success: true,
      message: `Problem marked as ${!isCurrentlySolved ? 'completed' : 'incomplete'}`,
      completed: !isCurrentlySolved,
      progress: {
        patternName: pattern.name,
        solvedProblems: patternProgress.solvedProblems,
        totalProblems: patternProgress.totalProblems,
        completionRate: patternProgress.totalProblems > 0 ? Math.round((patternProgress.solvedProblems / patternProgress.totalProblems) * 100) : 0
      },
      currentStreak: userProgress.currentStreak
    })
  } catch (error) {
    logger.error('Toggle problem error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update problem status'
    })
  }
})

// Get user's pattern progress summary
router.get('/progress/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user!._id
    const patterns = await PatternService.loadPatterns()
    
    let userProgress = await UserProgress.findOne({ userId })
    if (!userProgress) {
      userProgress = new UserProgress({ userId })
      await userProgress.save()
    }
    
    const progressSummary = patterns.map(pattern => {
      const progress = userProgress!.patternProgress.find(p => p.patternName === pattern.name)
      
      // Count total problems from nested subPatterns
      let totalProblems = 0
      if (pattern.subPatterns) {
        pattern.subPatterns.forEach((subPattern: any) => {
          if (subPattern.problems) {
            totalProblems += subPattern.problems.length
          }
        })
      }
      
      const solvedProblems = progress?.solvedProblems || 0
      
      return {
        patternId: pattern._id,
        patternName: pattern.name,
        category: pattern.category,
        // Removed difficulty field as it doesn't exist at pattern level
        totalProblems,
        solvedProblems,
        completionRate: totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0,
        isCompleted: totalProblems > 0 && solvedProblems === totalProblems
      }
    })
    
    // Calculate overall stats
    const overallStats = {
      totalPatterns: patterns.length,
      completedPatterns: progressSummary.filter(p => p.isCompleted).length,
      totalProblems: progressSummary.reduce((sum, p) => sum + p.totalProblems, 0),
      solvedProblems: progressSummary.reduce((sum, p) => sum + p.solvedProblems, 0),
      overallCompletionRate: 0
    }
    
    if (overallStats.totalProblems > 0) {
      overallStats.overallCompletionRate = Math.round((overallStats.solvedProblems / overallStats.totalProblems) * 100)
    }
    
    res.json({
      success: true,
      progress: progressSummary,
      stats: overallStats,
      currentStreak: userProgress.currentStreak,
      longestStreak: userProgress.longestStreak
    })
  } catch (error) {
    logger.error('Get progress summary error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get progress summary'
    })
  }
})

export default router
