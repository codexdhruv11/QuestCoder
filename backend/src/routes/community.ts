import { Router, Request, Response } from 'express'
import { authenticate } from '@/middleware/auth'
import Challenge from '@/models/Challenge'
import SocketEvents from '@/socket/events'
import { logger } from '@/utils/logger'
import mongoose from 'mongoose'
import Joi from 'joi'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Validation schemas
const createChallengeSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(1000).required(),
  targetPatterns: Joi.array().items(Joi.string()).min(1).required(),
  difficultyFilter: Joi.string().valid('Easy', 'Medium', 'Hard').optional(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  maxParticipants: Joi.number().min(1).optional(),
  isPublic: Joi.boolean().default(true)
})

/**
 * GET /community/challenges
 * Get available challenges
 */
router.get('/challenges', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', status, search } = req.query

    const pageNumber = Math.max(1, parseInt(page as string))
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit as string)))
    const skip = (pageNumber - 1) * limitNumber

    // Build query
    const query: any = { isPublic: true }

    if (status && ['upcoming', 'active', 'completed'].includes(status as string)) {
      query.status = status
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' }
    }

    const [challenges, totalCount] = await Promise.all([
      Challenge.find(query)
        .populate('creatorId', 'username')
        .populate('participants.userId', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Challenge.countDocuments(query)
    ])

    res.json({
      success: true,
      data: {
        challenges,
        pagination: {
          currentPage: pageNumber,
          totalPages: Math.ceil(totalCount / limitNumber),
          totalItems: totalCount,
          itemsPerPage: limitNumber
        }
      }
    })
  } catch (error) {
    logger.error('Error getting challenges:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get challenges'
    })
  }
})

/**
 * POST /community/challenges
 * Create a new challenge
 */
router.post('/challenges', async (req: Request, res: Response) => {
  try {
    const { error, value } = createChallengeSchema.validate(req.body)
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details?.[0]?.message || 'Validation error'
      })
      return
    }

    const userId = new mongoose.Types.ObjectId(req.user!._id)
    
    const challenge = new Challenge({
      ...value,
      creatorId: userId
    })

    await challenge.save()
    await challenge.populate('creatorId', 'username')

    res.status(201).json({
      success: true,
      data: challenge,
      message: 'Challenge created successfully'
    })
  } catch (error) {
    logger.error('Error creating challenge:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create challenge'
    })
  }
})

/**
 * POST /community/challenges/:id/join
 * Join a challenge
 */
router.post('/challenges/:id/join', async (req: Request, res: Response): Promise<void> => {
  try {
    const challengeId = req.params['id']
    const userId = new mongoose.Types.ObjectId(req.user!._id)

    const challenge = await Challenge.findById(challengeId)
    if (!challenge) {
      res.status(404).json({
        success: false,
        message: 'Challenge not found'
      })
      return
    }

    await challenge.addParticipant(userId)

    // Emit real-time challenge update
    if (req.app.locals['socketEvents']) {
      const socketEvents = req.app.locals['socketEvents'] as SocketEvents
      await socketEvents.emitChallengeUpdate(new mongoose.Types.ObjectId(challengeId), {
        type: 'participant_joined',
        userId,
        username: req.user!.username
      })
    }

    res.json({
      success: true,
      message: 'Successfully joined the challenge'
    })
  } catch (error) {
    logger.error('Error joining challenge:', error)
    res.status(500).json({
      success: false,
      message: (error as Error).message || 'Failed to join challenge'
    })
  }
})

/**
 * POST /community/challenges/:id/leave
 * Leave a challenge
 */
router.post('/challenges/:id/leave', async (req: Request, res: Response): Promise<void> => {
  try {
    const challengeId = req.params['id']
    const userId = new mongoose.Types.ObjectId(req.user!._id)

    const challenge = await Challenge.findById(challengeId)
    if (!challenge) {
      res.status(404).json({
        success: false,
        message: 'Challenge not found'
      })
      return
    }

    // Check if user is a participant
    if (!challenge.participants.some((p: any) => p.userId.equals(userId))) {
      res.status(400).json({
        success: false,
        message: 'You are not a participant in this challenge'
      })
      return
    }

    // Use the removeParticipant method (already exists on model)
    await challenge.removeParticipant(userId)

    // Emit real-time challenge update
    if (req.app.locals['socketEvents']) {
      const socketEvents = req.app.locals['socketEvents'] as SocketEvents
      await socketEvents.emitChallengeUpdate(new mongoose.Types.ObjectId(challengeId), {
        type: 'participant_left',
        userId,
        username: req.user!.username
      })
    }

    res.json({
      success: true,
      message: 'Successfully left the challenge'
    })
  } catch (error) {
    logger.error('Error leaving challenge:', error)
    res.status(500).json({
      success: false,
      message: (error as Error).message || 'Failed to leave challenge'
    })
  }
})

export default router
