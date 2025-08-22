import { Server as SocketIOServer } from 'socket.io'
import GamificationService from '@/services/gamificationService'
import NotificationService from '@/services/notificationService'
import LeaderboardService from '@/services/leaderboardService'
import { logger } from '@/utils/logger'
import mongoose from 'mongoose'

export interface SocketEventData {
  userId: mongoose.Types.ObjectId
  type: string
  data: any
}

export class SocketEvents {
  private io: SocketIOServer

  constructor(io: SocketIOServer) {
    this.io = io
  }

  /**
   * Emit XP gain event to user
   */
  async emitXpGain(userId: mongoose.Types.ObjectId, xpData: {
    xpGained: number
    totalXp: number
    leveledUp: boolean
    newLevel?: number
  }): Promise<void> {
    try {
      this.io.to(`user_${userId}`).emit('xp_gained', {
        ...xpData,
        timestamp: new Date().toISOString()
      })

      // If user leveled up, send level up notification
      if (xpData.leveledUp && xpData.newLevel) {
        await NotificationService.sendLevelUpNotification(
          userId,
          xpData.newLevel,
          xpData.totalXp
        )

        // Emit level up event
        this.io.to(`user_${userId}`).emit('level_up', {
          newLevel: xpData.newLevel,
          totalXp: xpData.totalXp,
          timestamp: new Date().toISOString()
        })
      }

      logger.info(`XP gain event emitted for user ${userId}: +${xpData.xpGained} XP`)

    } catch (error) {
      logger.error('Error emitting XP gain event:', error)
    }
  }

  /**
   * Emit badge unlock event to user
   */
  async emitBadgeUnlock(userId: mongoose.Types.ObjectId, badges: any[]): Promise<void> {
    try {
      if (badges.length === 0) return

      for (const badgeData of badges) {
        // Send notification
        await NotificationService.sendBadgeUnlockNotification(userId, badgeData.badge)

        // Emit real-time event
        this.io.to(`user_${userId}`).emit('badge_unlocked', {
          badge: badgeData.badge,
          xpBonus: badgeData.xpBonus,
          timestamp: new Date().toISOString()
        })

        logger.info(`Badge unlock event emitted for user ${userId}: ${badgeData.badge.name}`)
      }

    } catch (error) {
      logger.error('Error emitting badge unlock event:', error)
    }
  }

  /**
   * Emit progress update to pattern room
   */
  async emitPatternProgress(
    patternId: string,
    userId: mongoose.Types.ObjectId,
    progressData: any
  ): Promise<void> {
    try {
      this.io.to(`pattern_${patternId}`).emit('pattern_progress', {
        userId: String(userId),
        patternId,
        progress: progressData,
        timestamp: new Date().toISOString()
      })

      logger.info(`Pattern progress event emitted for pattern ${patternId} by user ${userId}`)

    } catch (error) {
      logger.error('Error emitting pattern progress event:', error)
    }
  }

  /**
   * Emit leaderboard update
   */
  async emitLeaderboardUpdate(
    leaderboardType: 'xp' | 'problems' | 'streak',
    updatedEntry?: {
      userId: mongoose.Types.ObjectId
      newRank: number
      score: number
    }
  ): Promise<void> {
    try {
      const event = {
        type: leaderboardType,
        updatedEntry,
        timestamp: new Date().toISOString()
      }

      this.io.to(`leaderboard_${leaderboardType}`).emit('leaderboard_update', event)

      if (updatedEntry) {
        // Also emit to the specific user
        this.io.to(`user_${updatedEntry.userId}`).emit('rank_update', {
          leaderboardType,
          newRank: updatedEntry.newRank,
          score: updatedEntry.score,
          timestamp: new Date().toISOString()
        })
      }

      logger.info(`Leaderboard update emitted for ${leaderboardType}`)

    } catch (error) {
      logger.error('Error emitting leaderboard update:', error)
    }
  }

  /**
   * Emit study group activity
   */
  async emitGroupActivity(
    groupId: mongoose.Types.ObjectId,
    activity: {
      type: 'member_joined' | 'member_left' | 'progress_update' | 'challenge_created'
      userId: mongoose.Types.ObjectId
      username: string
      data?: any
    }
  ): Promise<void> {
    try {
      this.io.to(`group_${groupId}`).emit('group_activity', {
        groupId: String(groupId),
        activity: {
          ...activity,
          userId: String(activity.userId),
          timestamp: new Date().toISOString()
        }
      })

      logger.info(`Group activity emitted for group ${groupId}: ${activity.type}`)

    } catch (error) {
      logger.error('Error emitting group activity:', error)
    }
  }

  /**
   * Emit challenge update
   */
  async emitChallengeUpdate(
    challengeId: mongoose.Types.ObjectId,
    update: {
      type: 'participant_joined' | 'participant_left' | 'progress_update' | 'challenge_completed' | 'leaderboard_update'
      userId?: mongoose.Types.ObjectId
      username?: string
      data?: any
    }
  ): Promise<void> {
    try {
      this.io.to(`challenge_${challengeId}`).emit('challenge_update', {
        challengeId: String(challengeId),
        update: {
          ...update,
          userId: update.userId ? String(update.userId) : undefined,
          timestamp: new Date().toISOString()
        }
      })

      logger.info(`Challenge update emitted for challenge ${challengeId}: ${update.type}`)

    } catch (error) {
      logger.error('Error emitting challenge update:', error)
    }
  }

  /**
   * Emit streak update
   */
  async emitStreakUpdate(
    userId: mongoose.Types.ObjectId,
    streakData: {
      currentStreak: number
      longestStreak: number
      streakBroken?: boolean
      streakExtended?: boolean
    }
  ): Promise<void> {
    try {
      this.io.to(`user_${userId}`).emit('streak_update', {
        ...streakData,
        timestamp: new Date().toISOString()
      })

      // If streak was extended and is a milestone, emit celebration
      if (streakData.streakExtended && this.isStreakMilestone(streakData.currentStreak)) {
        this.io.to(`user_${userId}`).emit('streak_milestone', {
          streak: streakData.currentStreak,
          milestone: this.getStreakMilestoneMessage(streakData.currentStreak),
          timestamp: new Date().toISOString()
        })
      }

      logger.info(`Streak update emitted for user ${userId}: ${streakData.currentStreak} days`)

    } catch (error) {
      logger.error('Error emitting streak update:', error)
    }
  }

  /**
   * Emit pattern completion celebration
   */
  async emitPatternCompletion(
    userId: mongoose.Types.ObjectId,
    patternData: {
      patternName: string
      completionTime: number
      totalProblems: number
    }
  ): Promise<void> {
    try {
      this.io.to(`user_${userId}`).emit('pattern_completed', {
        ...patternData,
        timestamp: new Date().toISOString()
      })

      logger.info(`Pattern completion emitted for user ${userId}: ${patternData.patternName}`)

    } catch (error) {
      logger.error('Error emitting pattern completion:', error)
    }
  }

  /**
   * Emit real-time stats update
   */
  async emitStatsUpdate(
    userId: mongoose.Types.ObjectId,
    stats: {
      totalProblems: number
      weeklyProblems: number
      currentStreak: number
      totalXp: number
      currentLevel: number
    }
  ): Promise<void> {
    try {
      this.io.to(`user_${userId}`).emit('stats_update', {
        userId: String(userId),
        stats,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Error emitting stats update:', error)
    }
  }

  /**
   * Emit individual user progress updates to user's personal room
   */
  async emitUserProgressUpdate(
    userId: mongoose.Types.ObjectId,
    username: string,
    patternId: string,
    problemId: string,
    progressData: {
      solvedCount: number
      completionRate: number
      streakInfo: {
        currentStreak: number
        longestStreak: number
        streakExtended?: boolean
      }
      patternProgress: {
        totalProblems: number
        solvedProblems: number
        completionRate: number
      }
    }
  ): Promise<void> {
    try {
      this.io.to(`user_${userId}`).emit('user_progress_update', {
        userId: String(userId),
        username,
        patternId,
        problemId,
        progressData,
        timestamp: new Date().toISOString()
      })

      logger.info(`User progress update emitted for user ${userId}: pattern ${patternId}, problem ${problemId}`)

    } catch (error) {
      logger.error('Error emitting user progress update:', error)
    }
  }

  /**
   * Emit progress updates to all study group rooms the user belongs to
   */
  async emitGroupProgressUpdate(
    userId: mongoose.Types.ObjectId,
    username: string,
    patternId: string,
    problemId: string,
    progressData: {
      problemName: string
      patternName: string
      difficulty: string
      platform: string
      solvedCount: number
      completionRate: number
      achievements?: string[]
    },
    userGroups: Array<{
      groupId: mongoose.Types.ObjectId
      groupName: string
    }>
  ): Promise<void> {
    try {
      for (const group of userGroups) {
        this.io.to(`group_${group.groupId}`).emit('group_progress_update', {
          userId: String(userId),
          username,
          patternId,
          problemId,
          progressData,
          groupInfo: {
            groupId: String(group.groupId),
            groupName: group.groupName
          },
          timestamp: new Date().toISOString()
        })

        logger.info(`Group progress update emitted for group ${group.groupId}: user ${username} progress`)
      }

    } catch (error) {
      logger.error('Error emitting group progress update:', error)
    }
  }

  /**
   * Enhanced leaderboard update with comprehensive information
   */
  async emitEnhancedLeaderboardUpdate(
    leaderboardType: 'xp' | 'problems' | 'streak',
    updatedEntries?: Array<{
      userId: mongoose.Types.ObjectId
      username: string
      rank: number
      score: number
      previousRank?: number
    }>,
    affectedUserIds?: mongoose.Types.ObjectId[],
    leaderboardData?: {
      topEntries: any[]
      totalParticipants: number
      lastUpdated: string
    },
    groupId?: string
  ): Promise<void> {
    try {
      const event = {
        type: leaderboardType,
        updatedEntries: updatedEntries?.map(e => ({
          ...e,
          userId: String(e.userId)
        })),
        leaderboardData,
        groupId,
        timestamp: new Date().toISOString()
      }

      // Emit global leaderboard update
      this.io.to(`leaderboard_${leaderboardType}`).emit('leaderboard_update', event)

      // Emit individual rank change notifications
      if (updatedEntries) {
        for (const entry of updatedEntries) {
          this.io.to(`user_${entry.userId}`).emit('rank_update', {
            leaderboardType,
            newRank: entry.rank,
            previousRank: entry.previousRank,
            score: entry.score,
            username: entry.username,
            timestamp: new Date().toISOString()
          })
        }
      }

      // Notify affected users even if not in top entries
      if (affectedUserIds) {
        for (const userId of affectedUserIds) {
          if (!updatedEntries?.find(entry => entry.userId.equals(userId))) {
            // Get current rank for this user
            const currentRank = await LeaderboardService.getUserRank(userId, leaderboardType)
            this.io.to(`user_${userId}`).emit('rank_update', {
              leaderboardType,
              newRank: currentRank,
              timestamp: new Date().toISOString()
            })
          }
        }
      }

      logger.info(`Enhanced leaderboard update emitted for ${leaderboardType} with ${updatedEntries?.length || 0} entries`)

    } catch (error) {
      logger.error('Error emitting enhanced leaderboard update:', error)
    }
  }

  /**
   * Emit comprehensive user statistics updates including achievements
   */
  async emitRealTimeStats(
    userId: mongoose.Types.ObjectId,
    statsData: {
      totalProblems: number
      currentStreak: number
      totalXp: number
      currentLevel: number
      recentAchievements: Array<{
        type: 'badge' | 'level' | 'streak' | 'pattern_completion'
        name: string
        description?: string
        timestamp: string
      }>
      problemsSolvedToday: number
      weeklyStats: {
        problemsSolved: number
        xpGained: number
        patternsCompleted: number
      }
    }
  ): Promise<void> {
    try {
      this.io.to(`user_${userId}`).emit('stats_update', {
        userId: String(userId),
        stats: statsData,
        timestamp: new Date().toISOString()
      })

      // Also emit to any connected dashboard/analytics views
      this.io.to(`user_analytics_${userId}`).emit('analytics_update', {
        userId,
        statsData,
        timestamp: new Date().toISOString()
      })

      logger.info(`Real-time stats update emitted for user ${userId}: ${statsData.totalProblems} total problems, level ${statsData.currentLevel}`)

    } catch (error) {
      logger.error('Error emitting real-time stats:', error)
    }
  }

  /**
   * Emit typing indicator for group discussions
   */
  emitTypingIndicator(
    roomId: string,
    userId: mongoose.Types.ObjectId,
    username: string,
    isTyping: boolean
  ): void {
    try {
      const event = isTyping ? 'user_typing' : 'user_stopped_typing'
      
      this.io.to(roomId).emit(event, {
        userId,
        username,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Error emitting typing indicator:', error)
    }
  }

  // Helper methods

  private isStreakMilestone(streak: number): boolean {
    return [7, 14, 30, 50, 100].includes(streak)
  }

  private getStreakMilestoneMessage(streak: number): string {
    switch (streak) {
      case 7:
        return "🔥 One week streak! You're on fire!"
      case 14:
        return "⚡ Two weeks strong! Keep it up!"
      case 30:
        return "🎉 30-day streak! You're a coding machine!"
      case 50:
        return "💎 50 days! You're a true champion!"
      case 100:
        return "👑 100-day streak! You're legendary!"
      default:
        return `${streak}-day streak achieved!`
    }
  }
}

export default SocketEvents
