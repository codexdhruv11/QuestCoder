import mongoose from 'mongoose'
import UserGamification from '@/models/UserGamification'
import Badge from '@/models/Badge'
import UserProgress from '@/models/UserProgress'
import LeaderboardService from '@/services/leaderboardService'
import { logger } from '@/utils/logger'

export interface XpGainResult {
  xpGained: number
  totalXp: number
  leveledUp: boolean
  newLevel?: number
  badgesUnlocked: any[]
}

export interface DifficultyXpConfig {
  Easy: number
  Medium: number
  Hard: number
}

export class GamificationService {
  private static xpConfig: DifficultyXpConfig = {
    Easy: Number(process.env['XP_EASY']) || 10,
    Medium: Number(process.env['XP_MEDIUM']) || 25,
    Hard: Number(process.env['XP_HARD']) || 50
  }

  /**
   * Calculate XP reward based on problem difficulty
   */
  static calculateXpReward(difficulty: 'Easy' | 'Medium' | 'Hard', streakBonus: number = 0): number {
    const baseXp = this.xpConfig[difficulty]
    const streakMultiplier = Math.min(1 + (streakBonus * 0.1), 2) // Max 100% bonus
    return Math.floor(baseXp * streakMultiplier)
  }

  /**
   * Calculate streak bonus based on current streak
   */
  static calculateStreakBonus(currentStreak: number): number {
    if (currentStreak >= 30) return 10 // 100% bonus for 30+ days
    if (currentStreak >= 14) return 5   // 50% bonus for 14+ days
    if (currentStreak >= 7) return 3    // 30% bonus for 7+ days
    if (currentStreak >= 3) return 1    // 10% bonus for 3+ days
    return 0
  }

  /**
   * Process XP gain for a user after solving a problem
   */
  static async processXpGain(
    userId: mongoose.Types.ObjectId,
    difficulty: 'Easy' | 'Medium' | 'Hard',
    currentStreak: number = 0
  ): Promise<XpGainResult> {
    try {
      // Calculate XP with streak bonus
      const streakBonus = this.calculateStreakBonus(currentStreak)
      const problemXp = this.calculateXpReward(difficulty, streakBonus)

      // Get or create user gamification record
      let userGamification = await UserGamification.findOne({ userId })
      if (!userGamification) {
        userGamification = new UserGamification({ userId })
        await userGamification.save()
      }

      // Capture old level before awarding any XP
      const oldLevel = userGamification.currentLevel

      // Add problem XP
      await userGamification.addXp(problemXp)

      // Check for new badge unlocks (which may award additional XP)
      const badgesUnlocked = await this.checkAndUnlockBadges(userId)

      // Calculate badge bonus XP
      const badgeBonusXp = badgesUnlocked.reduce((sum, b) => sum + (b.xpBonus || 0), 0)

      // Refetch user gamification to get updated values after badge XP
      userGamification = await UserGamification.findOne({ userId })
      if (!userGamification) {
        throw new Error('User gamification record not found after update')
      }
      const finalLevel = userGamification.currentLevel

      const result: XpGainResult = {
        xpGained: problemXp + badgeBonusXp,
        totalXp: userGamification.totalXp,
        leveledUp: finalLevel > oldLevel,
        newLevel: finalLevel > oldLevel ? finalLevel : undefined,
        badgesUnlocked
      }

      // Clear leaderboard caches after XP changes
      LeaderboardService.clearCache('xp_leaderboard')
      // Optionally clear problem/streak caches if solving affects them
      LeaderboardService.clearCache('problems_leaderboard')

      logger.info(`XP processed for user ${userId}: +${problemXp} problem XP + ${badgeBonusXp} badge XP = +${result.xpGained} total XP (difficulty: ${difficulty}, streak bonus: ${streakBonus})`, result)
      return result

    } catch (error) {
      logger.error('Error processing XP gain:', error)
      throw error
    }
  }

  /**
   * Check and unlock eligible badges for a user
   */
  static async checkAndUnlockBadges(userId: mongoose.Types.ObjectId): Promise<any[]> {
    try {
      const userGamification = await UserGamification.findOne({ userId })
      if (!userGamification) return []

      // Get all active badges
      const allBadges = await Badge.find({ isActive: true })
      const unlockedBadges: any[] = []

      for (const badge of allBadges) {
        // Skip if user already has this badge - use equals() for ObjectId comparison
        if (userGamification.unlockedBadges.some((id: mongoose.Types.ObjectId) => id.equals(badge._id))) {
          continue
        }

        // Check if user meets criteria
        const isEligible = await (Badge as any).checkUserEligibility(badge._id, userId)
        if (isEligible) {
          // Unlock the badge - returns true if badge was newly added
          const wasNewlyUnlocked = await userGamification.unlockBadge(badge._id)
          
          // Only award XP and push notification if badge was newly unlocked
          if (wasNewlyUnlocked) {
            // Award XP bonus for the badge
            if (badge.xpReward > 0) {
              await userGamification.addXp(badge.xpReward)
            }

            unlockedBadges.push({
              badge: badge.toObject(),
              xpBonus: badge.xpReward
            })

            logger.info(`Badge unlocked for user ${userId}: ${badge.name} (+${badge.xpReward} XP)`)
          }
        }
      }

      return unlockedBadges

    } catch (error) {
      logger.error('Error checking badges:', error)
      return []
    }
  }

  /**
   * Get user's gamification stats
   */
  static async getUserGamificationStats(userId: mongoose.Types.ObjectId) {
    try {
      let userGamification = await UserGamification.findOne({ userId })
        .populate('unlockedBadges')
      
      if (!userGamification) {
        // Create new gamification record
        userGamification = new UserGamification({ userId })
        await userGamification.save()
        await userGamification.populate('unlockedBadges')
      }

      const xpProgress = userGamification.getXpProgress()
      
      return {
        totalXp: userGamification.totalXp,
        currentLevel: userGamification.currentLevel,
        xpProgress,
        unlockedBadges: userGamification.unlockedBadges,
        levelHistory: userGamification.levelHistory,
        lastXpGainedAt: userGamification.lastXpGainedAt
      }

    } catch (error) {
      logger.error('Error getting user gamification stats:', error)
      throw error
    }
  }

  /**
   * Initialize gamification for a new user
   */
  static async initializeUserGamification(userId: mongoose.Types.ObjectId): Promise<void> {
    try {
      const existingRecord = await UserGamification.findOne({ userId })
      if (existingRecord) {
        return // Already initialized
      }

      const userGamification = new UserGamification({ userId })
      await userGamification.save()

      logger.info(`Gamification initialized for user ${userId}`)

    } catch (error) {
      logger.error('Error initializing user gamification:', error)
      throw error
    }
  }

  /**
   * Calculate level from XP (static method for use elsewhere)
   */
  static calculateLevelFromXp(xp: number): number {
    if (xp <= 0) return 1
    
    const baseXp = Number(process.env['LEVEL_XP_BASE']) || 100
    return Math.floor(Math.sqrt(xp / baseXp)) + 1
  }

  /**
   * Calculate XP required for a specific level
   */
  static calculateXpForLevel(level: number): number {
    if (level <= 1) return 0
    
    const baseXp = Number(process.env['LEVEL_XP_BASE']) || 100
    return (level - 1) * (level - 1) * baseXp
  }

  /**
   * Get all available badges by category
   */
  static async getAvailableBadges(category?: string) {
    try {
      const query: any = { isActive: true }
      if (category) {
        query.category = category
      }

      return await Badge.find(query).sort({ rarity: 1, createdAt: 1 })

    } catch (error) {
      logger.error('Error getting available badges:', error)
      throw error
    }
  }

  /**
   * Get badge unlock progress for a user
   */
  static async getUserBadgeProgress(userId: mongoose.Types.ObjectId) {
    try {
      const userProgress = await UserProgress.findOne({ userId })
      const userGamification = await UserGamification.findOne({ userId })
      const allBadges = await Badge.find({ isActive: true })

      const badgeProgress = await Promise.all(
        allBadges.map(async (badge) => {
          const isUnlocked = !!userGamification?.unlockedBadges?.some((id: mongoose.Types.ObjectId) => id.equals(badge._id))
          const isEligible = !isUnlocked && await (Badge as any).checkUserEligibility(badge._id, userId)

          // Calculate progress percentage for some badge types
          let progressPercentage = 0
          if (!isUnlocked && userProgress) {
            switch (badge.criteria.type) {
              case 'problems_solved':
                progressPercentage = Math.min(100, ((userProgress.activityLog||[]).filter(l => l.type === 'problem_solved').length) / badge.criteria.value * 100)
                break
              case 'streak_days':
                progressPercentage = Math.min(100, (userProgress.currentStreak || 0) / badge.criteria.value * 100)
                break
              case 'xp_earned':
                progressPercentage = Math.min(100, (userGamification?.totalXp || 0) / badge.criteria.value * 100)
                break
            }
          }

          return {
            badge: badge.toObject(),
            isUnlocked,
            isEligible,
            progressPercentage: Math.round(progressPercentage)
          }
        })
      )

      return badgeProgress

    } catch (error) {
      logger.error('Error getting user badge progress:', error)
      throw error
    }
  }
}

export default GamificationService
