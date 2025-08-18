import { Router } from 'express'
import { logger } from '@/utils/logger'
import User from '@/models/User'
import JWTService from '@/config/jwt'
import { authenticate } from '@/middleware/auth'
import { validateLogin, validateSignup } from '@/middleware/validation'

const router = Router()

// User registration
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const { username, email, password, leetcodeHandle, codeforcesHandle, githubHandle, hackerrankHandle, hackerearthHandle } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username'
      return res.status(409).json({
        success: false,
        message: `User with this ${field} already exists`
      })
    }

    // Create new user
    const user = new User({
      username,
      email,
      password, // Will be hashed by pre-save middleware
      leetcodeHandle: leetcodeHandle || undefined,
      codeforcesHandle: codeforcesHandle || undefined,
      githubHandle: githubHandle || undefined,
      hackerrankHandle: hackerrankHandle || undefined,
      hackerearthHandle: hackerearthHandle || undefined
    })

    await user.save()
    logger.info(`New user registered: ${username} (${email})`)

    // Generate JWT token
    const token = JWTService.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      username: user.username
    })

    // Return user data (password excluded by model transform)
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: user.toJSON(),
      token
    })
  } catch (error: any) {
    logger.error('Signup error:', error)
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map((e: any) => e.message)
      })
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    })
  }
})

// User login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password')

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Update last login time
    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() })

    // Generate JWT token
    const token = JWTService.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      username: user.username
    })

    logger.info(`User logged in: ${user.username} (${user.email})`)

    // Return user data (password excluded by model transform)
    res.json({
      success: true,
      message: 'Login successful',
      user: user.toSafeObject(),
      token
    })
  } catch (error) {
    logger.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    })
  }
})

// Get current user
router.get('/me', authenticate, (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user!.toJSON()
    })
  } catch (error) {
    logger.error('Get current user error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    })
  }
})

// Logout (client-side token removal, server-side is stateless)
router.post('/logout', authenticate, (req, res) => {
  try {
    logger.info(`User logged out: ${req.user!.username}`)
    res.json({
      success: true,
      message: 'Logout successful'
    })
  } catch (error) {
    logger.error('Logout error:', error)
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    })
  }
})

export default router
