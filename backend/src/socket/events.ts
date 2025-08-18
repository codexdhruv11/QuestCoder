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
        userId,
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
        groupId,
        activity: {
          ...activity,
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
        challengeId,
        update: {
          ...update,
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
        ...stats,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Error emitting stats update:', error)
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
