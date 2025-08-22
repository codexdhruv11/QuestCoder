import User, { IUser } from '@/models/User'
import PlatformStatus, { IPlatformStatus } from '@/models/PlatformStatus'
import { logger } from '@/utils/logger'
import mongoose from 'mongoose'

export interface UserStatistics {
  totalUsers: number
  activeUsers: number
  adminUsers: number
  newUsersThisMonth: number
  usersWithPlatformHandles: {
    leetcode: number
    codeforces: number
    github: number
    hackerrank: number
    hackerearth: number
  }
}

export interface UserSearchOptions {
  search?: string | undefined
  role?: 'user' | 'admin' | undefined
  isActive?: boolean | undefined
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface UserUpdateData {
  username?: string
  email?: string
  role?: 'user' | 'admin'
  isActive?: boolean
  leetcodeHandle?: string
  codeforcesHandle?: string
  githubHandle?: string
  hackerrankHandle?: string
  hackerearthHandle?: string
}

export interface AdminDashboardData {
  userStats: UserStatistics
  platformStatus: IPlatformStatus[]
  recentActivity: {
    newUsers: IUser[]
    recentLogins: IUser[]
  }
}

class AdminService {
  // Get comprehensive user statistics
  async getUserStatistics(): Promise<UserStatistics> {
    try {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [
        totalUsers,
        activeUsers,
        adminUsers,
        newUsersThisMonth,
        usersWithLeetCode,
        usersWithCodeforces,
        usersWithGithub,
        usersWithHackerrank,
        usersWithHackerearth
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ createdAt: { $gte: startOfMonth } }),
        User.countDocuments({ leetcodeHandle: { $exists: true, $ne: '' } }),
        User.countDocuments({ codeforcesHandle: { $exists: true, $ne: '' } }),
        User.countDocuments({ githubHandle: { $exists: true, $ne: '' } }),
        User.countDocuments({ hackerrankHandle: { $exists: true, $ne: '' } }),
        User.countDocuments({ hackerearthHandle: { $exists: true, $ne: '' } })
      ])

      return {
        totalUsers,
        activeUsers,
        adminUsers,
        newUsersThisMonth,
        usersWithPlatformHandles: {
          leetcode: usersWithLeetCode,
          codeforces: usersWithCodeforces,
          github: usersWithGithub,
          hackerrank: usersWithHackerrank,
          hackerearth: usersWithHackerearth
        }
      }
    } catch (error) {
      logger.error('Error getting user statistics:', error)
      throw error
    }
  }

  // Search and filter users with pagination
  async searchUsers(options: UserSearchOptions = {}): Promise<{
    users: IUser[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    try {
      const {
        search = '',
        role,
        isActive,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options

      // Build query
      const query: any = {}

      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }

      if (role) {
        query.role = role
      }

      if (isActive !== undefined) {
        query.isActive = isActive
      }

      // Build sort object
      const sort: any = {}
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1

      // Execute query with pagination
      const skip = (page - 1) * limit
      const [users, total] = await Promise.all([
        User.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select('-password'),
        User.countDocuments(query)
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        users,
        total,
        page,
        limit,
        totalPages
      }
    } catch (error) {
      logger.error('Error searching users:', error)
      throw error
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<IUser | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID')
      }

      const user = await User.findById(userId).select('-password')
      return user
    } catch (error) {
      logger.error('Error getting user by ID:', error)
      throw error
    }
  }

  // Update user information
  async updateUser(userId: string, updateData: UserUpdateData): Promise<IUser> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID')
      }

      // Remove undefined values
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      )

      const user = await User.findByIdAndUpdate(
        userId,
        cleanUpdateData,
        { new: true, runValidators: true }
      ).select('-password')

      if (!user) {
        throw new Error('User not found')
      }

      logger.info('User updated by admin', {
        userId,
        updatedFields: Object.keys(cleanUpdateData)
      })

      return user
    } catch (error) {
      logger.error('Error updating user:', error)
      throw error
    }
  }

  // Activate/Deactivate user
  async toggleUserStatus(userId: string, isActive: boolean): Promise<IUser> {
    try {
      return await this.updateUser(userId, { isActive })
    } catch (error) {
      logger.error('Error toggling user status:', error)
      throw error
    }
  }

  // Bulk operations
  async bulkUpdateUsers(userIds: string[], updateData: Partial<UserUpdateData>): Promise<{
    modifiedCount: number
    errors: string[]
  }> {
    try {
      const validIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id))
      const errors: string[] = userIds
        .filter(id => !mongoose.Types.ObjectId.isValid(id))
        .map(id => `Invalid ID: ${id}`)

      if (validIds.length === 0) {
        return { modifiedCount: 0, errors }
      }

      const result = await User.updateMany(
        { _id: { $in: validIds } },
        updateData,
        { runValidators: true }
      )

      logger.info('Bulk user update performed', {
        affectedUsers: result.modifiedCount,
        updateData
      })

      return {
        modifiedCount: result.modifiedCount,
        errors
      }
    } catch (error) {
      logger.error('Error in bulk user update:', error)
      throw error
    }
  }

  // Get platform status overview
  async getPlatformStatus(): Promise<IPlatformStatus[]> {
    try {
      const platformStatus = await PlatformStatus.find().sort({ platform: 1 })
      return platformStatus
    } catch (error) {
      logger.error('Error getting platform status:', error)
      throw error
    }
  }

  // Get admin dashboard data
  async getDashboardData(): Promise<AdminDashboardData> {
    try {
      const [userStats, platformStatus, newUsers, recentLogins] = await Promise.all([
        this.getUserStatistics(),
        this.getPlatformStatus(),
        User.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('-password'),
        User.find({ lastLoginAt: { $exists: true } })
          .sort({ lastLoginAt: -1 })
          .limit(5)
          .select('-password')
      ])

      return {
        userStats,
        platformStatus,
        recentActivity: {
          newUsers,
          recentLogins
        }
      }
    } catch (error) {
      logger.error('Error getting admin dashboard data:', error)
      throw error
    }
  }

  // Delete user (soft delete by deactivating)
  async deleteUser(userId: string): Promise<void> {
    try {
      await this.toggleUserStatus(userId, false)
      logger.info('User soft deleted (deactivated)', { userId })
    } catch (error) {
      logger.error('Error deleting user:', error)
      throw error
    }
  }
}

export default new AdminService()





