import { Router } from 'express'
import { logger } from '@/utils/logger'
import UserProgress from '@/models/UserProgress'
import { authenticate, optionalAuthenticate } from '@/middleware/auth'
import { PatternService } from '@/services/patternService'
import GamificationService from '@/services/gamificationService'
import SocketEvents from '@/socket/events'
import mongoose from 'mongoose'

const router = Router()

// Get all patterns with optional filtering
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    const patterns = await PatternService.loadPatterns()
    const { difficulty, category, search, limit = '50', offset = '0' } = req.query
    
    let filteredPatterns = [...patterns]
    
    // Apply filters
    if (category) {
      filteredPatterns = filteredPatterns.filter(p => p.category?.toLowerCase() === (category as string).toLowerCase())
    }
    
    // Note: Difficulty filtering should be applied at problem level, not pattern level
    // Patterns contain problems of multiple difficulties
    
    if (search) {
      const searchTerm = (search as string).toLowerCase()
      filteredPatterns = filteredPatterns.filter(p => 
        p.name?.toLowerCase().includes(searchTerm) ||
        p.description?.toLowerCase().includes(searchTerm) ||
        p.keyPoints?.some((point: string) => point.toLowerCase().includes(searchTerm))
      )
    }
    
    // Apply pagination
    const limitNum = Math.min(parseInt(limit as string) || 50, 100)
    const offsetNum = Math.max(parseInt(offset as string) || 0, 0)
    const paginatedPatterns = filteredPatterns.slice(offsetNum, offsetNum + limitNum)
    
    // Deep clone patterns to avoid mutating cached data
    const responsePatterns = JSON.parse(JSON.stringify(paginatedPatterns))
    
    // If user is authenticated, add their progress data
    if (req.user) {
      const userProgress = await UserProgress.findOne({ userId: req.user._id })
      if (userProgress) {
        responsePatterns.forEach(pattern => {
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
        total: filteredPatterns.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < filteredPatterns.length
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
router.get('/:id', optionalAuthenticate, async (req, res) => {
  try {
    const patterns = await PatternService.loadPatterns()
    const pattern = patterns.find(p => p._id === req.params.id || p.slug === req.params.id || p.id === req.params.id)
    
    if (!pattern) {
      return res.status(404).json({
        success: false,
        message: 'Pattern not found'
      })
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
router.post('/:patternId/problems/:problemId/toggle', authenticate, async (req, res) => {
  try {
    const { patternId, problemId } = req.params
    const userId = req.user!._id
    
    // Get pattern data to validate
    const patterns = await PatternService.loadPatterns()
    const pattern = patterns.find(p => p._id === patternId || p.slug === patternId || p.id === patternId)
    
    if (!pattern) {
      return res.status(404).json({
        success: false,
        message: 'Pattern not found'
      })
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
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      })
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
      
      if (lastSolved) {
        const daysSinceLastSolved = Math.floor((now.getTime() - lastSolved.getTime()) / (1000 * 60 * 60 * 24))
        if (daysSinceLastSolved === 1) {
          userProgress.currentStreak += 1
        } else if (daysSinceLastSolved > 1) {
          userProgress.currentStreak = 1
        }
      } else {
        userProgress.currentStreak = 1
      }
      
      userProgress.longestStreak = Math.max(userProgress.longestStreak, userProgress.currentStreak)
      userProgress.lastSolvedAt = now
      
      // Log activity with metadata
      userProgress.activityLog.push({
        type: 'problem_solved',
        problemId: problemIdStr,
        patternName: pattern.name,
        date: now,
        metadata: {
          difficulty: problem.difficulty || 'Medium'
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
      
      // Emit real-time events if Socket.IO is available
      if (req.app.locals.socketEvents) {
        const socketEvents = req.app.locals.socketEvents as SocketEvents
        
        // Emit XP gain event
        await socketEvents.emitXpGain(userObjectId, {
          xpGained: xpResult.xpGained,
          totalXp: xpResult.totalXp,
          leveledUp: xpResult.leveledUp,
          newLevel: xpResult.newLevel
        })
        
        // Emit badge unlock events
        if (xpResult.badgesUnlocked.length > 0) {
          await socketEvents.emitBadgeUnlock(userObjectId, xpResult.badgesUnlocked)
        }
        
        // Emit streak update
        await socketEvents.emitStreakUpdate(userObjectId, {
          currentStreak: userProgress.currentStreak,
          longestStreak: userProgress.longestStreak,
          streakExtended: true
        })
        
        // Check if pattern is completed
        if (patternProgress.solvedProblems === patternProgress.totalProblems) {
          await socketEvents.emitPatternCompletion(userObjectId, {
            patternName: pattern.name,
            completionTime: Date.now(),
            totalProblems: patternProgress.totalProblems
          })
        }

        // Emit leaderboard update for XP changes
        await socketEvents.emitLeaderboardUpdate('xp')
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
