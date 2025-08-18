import { Router } from 'express'
import { logger } from '@/utils/logger'
import User from '@/models/User'
import UserProgress from '@/models/UserProgress'
import { authenticate } from '@/middleware/auth'
import { validateUpdateProfile, validateChangePassword } from '@/middleware/validation'
import bcrypt from 'bcryptjs'

const router = Router()

// Get user profile (requires authentication)
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user!._id)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      user: user.toJSON()
    })
  } catch (error) {
    logger.error('Get profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    })
  }
})

// Update user profile
router.put('/profile', authenticate, validateUpdateProfile, async (req, res) => {
  try {
    const { username, email, leetcodeHandle, codeforcesHandle, githubHandle, hackerrankHandle, hackerearthHandle } = req.body
    const userId = req.user!._id

    // Check if username or email is already taken by another user
    if (username || email) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: [
          ...(username ? [{ username }] : []),
          ...(email ? [{ email }] : [])
        ]
      })

      if (existingUser) {
        const field = existingUser.username === username ? 'username' : 'email'
        return res.status(409).json({
          success: false,
          message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken`
        })
      }
    }

    // Update user profile
    const updateData: any = {}
    if (username) updateData.username = username
    if (email) updateData.email = email
    if (leetcodeHandle !== undefined) updateData.leetcodeHandle = leetcodeHandle || undefined
    if (codeforcesHandle !== undefined) updateData.codeforcesHandle = codeforcesHandle || undefined
    if (githubHandle !== undefined) updateData.githubHandle = githubHandle || undefined
    if (hackerrankHandle !== undefined) updateData.hackerrankHandle = hackerrankHandle || undefined
    if (hackerearthHandle !== undefined) updateData.hackerearthHandle = hackerearthHandle || undefined

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    logger.info(`Profile updated for user: ${updatedUser.username} (${updatedUser.email})`)

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.toJSON()
    })
  } catch (error: any) {
    logger.error('Update profile error:', error)
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map((e: any) => e.message)
      })
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    })
  }
})

// Change user password
router.put('/password', authenticate, validateChangePassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user!._id

    // Get user with password field
    const user = await User.findById(userId).select('+password')
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Update password
    user.password = hashedPassword
    await user.save()

    logger.info(`Password changed for user: ${user.username} (${user.email})`)

    res.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    logger.error('Change password error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    })
  }
})

// Get user progress/stats
router.get('/progress', authenticate, async (req, res) => {
  try {
    const userId = req.user!._id
    
    // Get or create user progress
    let progress = await UserProgress.findOne({ userId })
    if (!progress) {
      progress = new UserProgress({ userId })
      await progress.save()
    }

    // Calculate additional stats
    const totalProblems = progress.patternProgress.reduce((sum, pattern) => sum + pattern.totalProblems, 0)
    const solvedProblems = progress.patternProgress.reduce((sum, pattern) => sum + pattern.solvedProblems, 0)
    const completedPatterns = progress.patternProgress.filter(pattern => 
      pattern.solvedProblems === pattern.totalProblems && pattern.totalProblems > 0
    ).length

    // Get weekly progress (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const weeklyProgress = []
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dayName = days[date.getDay()]
      
      // Count problems solved on this day
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
      const solvedToday = progress.activityLog.filter(activity => 
        activity.date >= startOfDay && activity.date <= endOfDay && activity.type === 'problem_solved'
      ).length
      
      weeklyProgress.push({ day: dayName, solved: solvedToday })
    }

    // Create category breakdown
    const categoryBreakdown: Record<string, { total: number, solved: number }> = {}
    progress.patternProgress.forEach(pattern => {
      categoryBreakdown[pattern.patternName] = {
        total: pattern.totalProblems,
        solved: pattern.solvedProblems
      }
    })

    res.json({
      success: true,
      progress: {
        totalPatterns: progress.patternProgress.length,
        completedPatterns,
        totalProblems,
        solvedProblems,
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
        lastSolvedAt: progress.lastSolvedAt,
        weeklyProgress,
        categoryBreakdown
      }
    })
  } catch (error) {
    logger.error('Get progress error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get user progress'
    })
  }
})

export default router
