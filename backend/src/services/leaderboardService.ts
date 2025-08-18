import mongoose from 'mongoose'
import UserGamification from '@/models/UserGamification'
import UserProgress from '@/models/UserProgress'
import StudyGroup from '@/models/StudyGroup'
import User from '@/models/User'
import { logger } from '@/utils/logger'

export interface LeaderboardEntry {
  user: {
    _id: string
    username: string
    avatar?: string
  }
  rank: number
  score: number
  metadata?: any
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[]
  totalEntries: number
  currentUserRank?: number
  lastUpdated: Date
}

export interface LeaderboardFilters {
  timeframe?: 'all' | 'monthly' | 'weekly' | 'daily'
  category?: string
  groupId?: string
  limit?: number
  offset?: number
}

export class LeaderboardService {
  private static cache: Map<string, { data: LeaderboardResult; expiry: number }> = new Map()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get global XP leaderboard
   */
  static async getXpLeaderboard(
    filters: LeaderboardFilters = {},
    currentUserId?: mongoose.Types.ObjectId
  ): Promise<LeaderboardResult> {
    const cacheKey = `xp_leaderboard_${JSON.stringify(filters)}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) return cached

    try {
      const { limit = 50, offset = 0, timeframe = 'all' } = filters
      
      let matchStage: any = {}
      
      // Apply timeframe filter
      if (timeframe !== 'all') {
        const timeFilter = this.getTimeframeFilter(timeframe)
        matchStage.lastXpGainedAt = { $gte: timeFilter }
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $match: { 'user.isActive': true } },
        { $sort: { totalXp: -1, lastXpGainedAt: -1 } },
        {
          $project: {
            userId: 1,
            totalXp: 1,
            currentLevel: 1,
            lastXpGainedAt: 1,
            'user.username': 1,
            'user._id': 1
          }
        }
      ]

      const totalEntries = await UserGamification.aggregate([
        ...pipeline.slice(0, -1),
        { $count: 'total' }
      ])

      const entries = await UserGamification.aggregate([
        ...pipeline,
        { $skip: offset },
        { $limit: limit }
      ])

      const leaderboardEntries: LeaderboardEntry[] = entries.map((entry, index) => ({
        user: {
          _id: entry.user._id.toString(),
          username: entry.user.username
        },
        rank: offset + index + 1,
        score: entry.totalXp,
        metadata: {
          level: entry.currentLevel,
          lastActive: entry.lastXpGainedAt
        }
      }))

      // Find current user's rank if provided
      let currentUserRank: number | undefined
      if (currentUserId) {
        currentUserRank = await this.findUserRank(currentUserId, 'xp', timeframe)
      }

      const result: LeaderboardResult = {
        entries: leaderboardEntries,
        totalEntries: totalEntries[0]?.total || 0,
        currentUserRank,
        lastUpdated: new Date()
      }

      this.setCachedResult(cacheKey, result)
      return result

    } catch (error) {
      logger.error('Error getting XP leaderboard:', error)
      return this.getEmptyLeaderboard()
    }
  }

  /**
   * Get problems solved leaderboard
   */
  static async getProblemsLeaderboard(
    filters: LeaderboardFilters = {},
    currentUserId?: mongoose.Types.ObjectId
  ): Promise<LeaderboardResult> {
    const cacheKey = `problems_leaderboard_${JSON.stringify(filters)}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) return cached

    try {
      const { limit = 50, offset = 0, timeframe = 'all' } = filters

      let matchStage: any = {}
      
      // Apply timeframe filter for activity log
      if (timeframe !== 'all') {
        const timeFilter = this.getTimeframeFilter(timeframe)
        matchStage['activityLog.date'] = { $gte: timeFilter }
      }

      const pipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $match: { 'user.isActive': true } },
        {
          $addFields: {
            problemsSolved: {
              $size: {
                $filter: {
                  input: '$activityLog',
                  as: 'log',
                  cond: {
                    $and: [
                      { $eq: ['$$log.type', 'problem_solved'] },
                      timeframe !== 'all' ? { $gte: ['$$log.date', this.getTimeframeFilter(timeframe)] } : true
                    ]
                  }
                }
              }
            }
          }
        },
        { $sort: { problemsSolved: -1, lastSolvedAt: -1 } },
        {
          $project: {
            userId: 1,
            problemsSolved: 1,
            currentStreak: 1,
            lastSolvedAt: 1,
            'user.username': 1,
            'user._id': 1
          }
        }
      ]

      const totalEntries = await UserProgress.aggregate([
        ...pipeline.slice(0, -1),
        { $count: 'total' }
      ])

      const entries = await UserProgress.aggregate([
        ...pipeline,
        { $skip: offset },
        { $limit: limit }
      ])

      const leaderboardEntries: LeaderboardEntry[] = entries.map((entry, index) => ({
        user: {
          _id: entry.user._id.toString(),
          username: entry.user.username
        },
        rank: offset + index + 1,
        score: entry.problemsSolved,
        metadata: {
          streak: entry.currentStreak,
          lastActive: entry.lastSolvedAt
        }
      }))

      // Find current user's rank if provided
      let currentUserRank: number | undefined
      if (currentUserId) {
        currentUserRank = await this.findUserRank(currentUserId, 'problems', timeframe)
      }

      const result: LeaderboardResult = {
        entries: leaderboardEntries,
        totalEntries: totalEntries[0]?.total || 0,
        currentUserRank,
        lastUpdated: new Date()
      }

      this.setCachedResult(cacheKey, result)
      return result

    } catch (error) {
      logger.error('Error getting problems leaderboard:', error)
      return this.getEmptyLeaderboard()
    }
  }

  /**
   * Get streak leaderboard
   */
  static async getStreakLeaderboard(
    filters: LeaderboardFilters = {},
    currentUserId?: mongoose.Types.ObjectId
  ): Promise<LeaderboardResult> {
    const cacheKey = `streak_leaderboard_${JSON.stringify(filters)}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) return cached

    try {
      const { limit = 50, offset = 0 } = filters

      const pipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $match: { 'user.isActive': true, currentStreak: { $gt: 0 } } },
        { $sort: { currentStreak: -1, longestStreak: -1, lastSolvedAt: -1 } },
        {
          $project: {
            userId: 1,
            currentStreak: 1,
            longestStreak: 1,
            lastSolvedAt: 1,
            'user.username': 1,
            'user._id': 1
          }
        }
      ]

      const totalEntries = await UserProgress.aggregate([
        ...pipeline.slice(0, -1),
        { $count: 'total' }
      ])

      const entries = await UserProgress.aggregate([
        ...pipeline,
        { $skip: offset },
        { $limit: limit }
      ])

      const leaderboardEntries: LeaderboardEntry[] = entries.map((entry, index) => ({
        user: {
          _id: entry.user._id.toString(),
          username: entry.user.username
        },
        rank: offset + index + 1,
        score: entry.currentStreak,
        metadata: {
          longestStreak: entry.longestStreak,
          lastActive: entry.lastSolvedAt
        }
      }))

      // Find current user's rank if provided
      let currentUserRank: number | undefined
      if (currentUserId) {
        currentUserRank = await this.findUserRank(currentUserId, 'streak')
      }

      const result: LeaderboardResult = {
        entries: leaderboardEntries,
        totalEntries: totalEntries[0]?.total || 0,
        currentUserRank,
        lastUpdated: new Date()
      }

      this.setCachedResult(cacheKey, result)
      return result

    } catch (error) {
      logger.error('Error getting streak leaderboard:', error)
      return this.getEmptyLeaderboard()
    }
  }

  /**
   * Get study group leaderboard
   */
  static async getGroupLeaderboard(
    groupId: mongoose.Types.ObjectId,
    filters: LeaderboardFilters = {},
    currentUserId?: mongoose.Types.ObjectId
  ): Promise<LeaderboardResult> {
    const cacheKey = `group_leaderboard_${groupId}_${JSON.stringify(filters)}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) return cached

    try {
      const { limit = 50, offset = 0, timeframe = 'all' } = filters

      // Get group members
      const group = await StudyGroup.findById(groupId)
      if (!group) {
        return this.getEmptyLeaderboard()
      }

      const memberIds = group.members.map(member => member.userId)

      let matchStage: any = { userId: { $in: memberIds } }
      
      if (timeframe !== 'all') {
        const timeFilter = this.getTimeframeFilter(timeframe)
        matchStage.lastXpGainedAt = { $gte: timeFilter }
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $sort: { totalXp: -1, lastXpGainedAt: -1 } },
        {
          $project: {
            userId: 1,
            totalXp: 1,
            currentLevel: 1,
            lastXpGainedAt: 1,
            'user.username': 1,
            'user._id': 1
          }
        }
      ]

      const entries = await UserGamification.aggregate([
        ...pipeline,
        { $skip: offset },
        { $limit: limit }
      ])

      const leaderboardEntries: LeaderboardEntry[] = entries.map((entry, index) => ({
        user: {
          _id: entry.user._id.toString(),
          username: entry.user.username
        },
        rank: offset + index + 1,
        score: entry.totalXp,
        metadata: {
          level: entry.currentLevel,
          lastActive: entry.lastXpGainedAt
        }
      }))

      const result: LeaderboardResult = {
        entries: leaderboardEntries,
        totalEntries: memberIds.length,
        lastUpdated: new Date()
      }

      this.setCachedResult(cacheKey, result)
      return result

    } catch (error) {
      logger.error('Error getting group leaderboard:', error)
      return this.getEmptyLeaderboard()
    }
  }

  /**
   * Find user's rank in a specific leaderboard
   */
  private static async findUserRank(
    userId: mongoose.Types.ObjectId,
    type: 'xp' | 'problems' | 'streak',
    timeframe: string = 'all'
  ): Promise<number | undefined> {
    try {
      let pipeline: any[] = []

      switch (type) {
        case 'xp': {
          let matchStage: any = {}
          if (timeframe !== 'all') {
            const timeFilter = this.getTimeframeFilter(timeframe)
            matchStage.lastXpGainedAt = { $gte: timeFilter }
          }

          pipeline = [
            { $match: matchStage },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $match: { 'user.isActive': true } },
            { $sort: { totalXp: -1, lastXpGainedAt: -1 } },
            { $group: { _id: null, users: { $push: '$userId' } } }
          ]

          const result = await UserGamification.aggregate(pipeline)
          const userIds = result[0]?.users || []
          return userIds.findIndex((id: any) => id.equals(userId)) + 1

        }
        case 'problems': {
          pipeline = [
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $match: { 'user.isActive': true } },
            {
              $addFields: {
                problemsSolved: {
                  $size: {
                    $filter: {
                      input: '$activityLog',
                      as: 'log',
                      cond: {
                        $and: [
                          { $eq: ['$$log.type', 'problem_solved'] },
                          timeframe !== 'all' ? { $gte: ['$$log.date', this.getTimeframeFilter(timeframe)] } : true
                        ]
                      }
                    }
                  }
                }
              }
            },
            { $sort: { problemsSolved: -1, lastSolvedAt: -1 } },
            { $group: { _id: null, users: { $push: '$userId' } } }
          ]

          const result = await UserProgress.aggregate(pipeline)
          const userIds = result[0]?.users || []
          return userIds.findIndex((id: any) => id.equals(userId)) + 1

        }
        case 'streak': {
          pipeline = [
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $match: { 'user.isActive': true, currentStreak: { $gt: 0 } } },
            { $sort: { currentStreak: -1, longestStreak: -1, lastSolvedAt: -1 } },
            { $group: { _id: null, users: { $push: '$userId' } } }
          ]

          const result = await UserProgress.aggregate(pipeline)
          const userIds = result[0]?.users || []
          return userIds.findIndex((id: any) => id.equals(userId)) + 1
        }
      }

    } catch (error) {
      logger.error('Error finding user rank:', error)
      return undefined
    }
  }

  /**
   * Clear cached leaderboards
   */
  static clearCache(pattern?: string): void {
    if (pattern) {
      Array.from(this.cache.keys())
        .filter(key => key.includes(pattern))
        .forEach(key => this.cache.delete(key))
    } else {
      this.cache.clear()
    }
  }

  // Helper methods

  private static getCachedResult(key: string): LeaderboardResult | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() < cached.expiry) {
      return cached.data
    }
    return null
  }

  private static setCachedResult(key: string, data: LeaderboardResult): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL
    })
  }

  private static getTimeframeFilter(timeframe: string): Date {
    const now = new Date()
    switch (timeframe) {
      case 'daily':
        return new Date(now.setHours(0, 0, 0, 0))
      case 'weekly':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - 7)
        return weekStart
      case 'monthly':
        const monthStart = new Date(now)
        monthStart.setDate(now.getDate() - 30)
        return monthStart
      default:
        return new Date(0) // Beginning of time
    }
  }

  private static getEmptyLeaderboard(): LeaderboardResult {
    return {
      entries: [],
      totalEntries: 0,
      lastUpdated: new Date()
    }
  }
}

export default LeaderboardService
