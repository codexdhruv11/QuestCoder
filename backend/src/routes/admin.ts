import { Router, Request, Response } from 'express'
import auth from '@/middleware/auth'
import { adminAuth } from '@/middleware/admin'
import { validate } from '@/middleware/express-validation'
import adminService from '@/services/adminService'
import { logger } from '@/utils/logger'
import { body, query, param } from 'express-validator'

const router = Router()

// Apply auth and admin middleware to all routes
router.use(auth)
router.use(adminAuth)

// Validation schemas
const userUpdateValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('username').optional().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_-]+$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['user', 'admin']),
  body('isActive').optional().isBoolean(),
  body('leetcodeHandle').optional().isLength({ max: 50 }),
  body('codeforcesHandle').optional().isLength({ max: 50 }),
  body('githubHandle').optional().isLength({ max: 50 }),
  body('hackerrankHandle').optional().isLength({ max: 50 }),
  body('hackerearthHandle').optional().isLength({ max: 50 })
]

const userSearchValidation = [
  query('search').optional().isString().isLength({ max: 100 }),
  query('role').optional().isIn(['user', 'admin']),
  query('isActive').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['username', 'email', 'createdAt', 'lastLoginAt', 'role']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
]

const bulkUpdateValidation = [
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
  body('userIds.*').isMongoId().withMessage('Invalid user ID in array'),
  body('updateData').isObject().withMessage('Update data is required'),
  body('updateData.role').optional().isIn(['user', 'admin']),
  body('updateData.isActive').optional().isBoolean()
]

// GET /admin/dashboard - Get admin dashboard overview
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    logger.info('Admin dashboard accessed', { 
      adminId: req.user?._id,
      adminUsername: req.user?.username 
    })

    const dashboardData = await adminService.getDashboardData()

    res.json({
      success: true,
      data: dashboardData
    })
  } catch (error) {
    logger.error('Error getting admin dashboard data:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    })
  }
})

// GET /admin/users - Get users with search and pagination
router.get('/users', userSearchValidation, validate, async (req: Request, res: Response): Promise<void> => {
  try {
    const searchOptions = {
      search: req.query['search'] as string | undefined,
      role: req.query['role'] as 'user' | 'admin' | undefined,
      isActive: req.query['isActive'] !== undefined ? req.query['isActive'] === 'true' : undefined,
      page: parseInt(req.query['page'] as string) || 1,
      limit: parseInt(req.query['limit'] as string) || 10,
      sortBy: req.query['sortBy'] as string || 'createdAt',
      sortOrder: req.query['sortOrder'] as 'asc' | 'desc' || 'desc'
    }

    logger.info('Admin users search', { 
      adminId: req.user?._id,
      searchOptions 
    })

    const result = await adminService.searchUsers(searchOptions)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('Error searching users:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to search users'
    })
  }
})

// GET /admin/users/:id - Get specific user
router.get('/users/:id', 
  param('id').isMongoId().withMessage('Invalid user ID'),
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params['id']
      
      logger.info('Admin user details accessed', { 
        adminId: req.user?._id,
        targetUserId: userId 
      })

      const user = await adminService.getUserById(userId!)

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        })
        return
      }

      res.json({
        success: true,
        data: user
      })
    } catch (error) {
      logger.error('Error getting user details:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get user details'
      })
    }
  }
)

// PUT /admin/users/:id - Update user
router.put('/users/:id', userUpdateValidation, validate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params['id']
    const updateData = req.body

    logger.info('Admin user update', { 
      adminId: req.user?._id,
      targetUserId: userId,
      updateFields: Object.keys(updateData)
    })

    const updatedUser = await adminService.updateUser(userId!, updateData)

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    })
  } catch (error) {
    logger.error('Error updating user:', error)
    
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({
        success: false,
        message: 'User not found'
      })
      return
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    })
  }
})

// PUT /admin/users/:id/status - Toggle user active status
router.put('/users/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean')
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params['id']
      const { isActive } = req.body

      logger.info('Admin user status toggle', { 
        adminId: req.user?._id,
        targetUserId: userId,
        newStatus: isActive
      })

      const updatedUser = await adminService.toggleUserStatus(userId!, isActive)

      res.json({
        success: true,
        data: updatedUser,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
      })
    } catch (error) {
      logger.error('Error toggling user status:', error)
      
      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          success: false,
          message: 'User not found'
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update user status'
      })
    }
  }
)

// DELETE /admin/users/:id - Soft delete user
router.delete('/users/:id',
  param('id').isMongoId().withMessage('Invalid user ID'),
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params['id']

      logger.info('Admin user deletion', { 
        adminId: req.user?._id,
        targetUserId: userId
      })

      await adminService.deleteUser(userId!)

      res.json({
        success: true,
        message: 'User deleted successfully'
      })
    } catch (error) {
      logger.error('Error deleting user:', error)
      
      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          success: false,
          message: 'User not found'
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      })
    }
  }
)

// POST /admin/users/bulk-update - Bulk update users
router.post('/users/bulk-update', bulkUpdateValidation, validate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIds, updateData } = req.body

    logger.info('Admin bulk user update', { 
      adminId: req.user?._id,
      userCount: userIds.length,
      updateFields: Object.keys(updateData)
    })

    const result = await adminService.bulkUpdateUsers(userIds, updateData)

    res.json({
      success: true,
      data: result,
      message: `Bulk update completed. ${result.modifiedCount} users updated.`
    })
  } catch (error) {
    logger.error('Error in bulk user update:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk update'
    })
  }
})

// GET /admin/users/statistics - Get user statistics
router.get('/users/statistics', async (req: Request, res: Response) => {
  try {
    logger.info('Admin user statistics accessed', { 
      adminId: req.user?._id 
    })

    const statistics = await adminService.getUserStatistics()

    res.json({
      success: true,
      data: statistics
    })
  } catch (error) {
    logger.error('Error getting user statistics:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics'
    })
  }
})

// GET /admin/platform-status - Get platform status overview
router.get('/platform-status', async (req: Request, res: Response) => {
  try {
    logger.info('Admin platform status accessed', { 
      adminId: req.user?._id 
    })

    const platformStatus = await adminService.getPlatformStatus()

    res.json({
      success: true,
      data: platformStatus
    })
  } catch (error) {
    logger.error('Error getting platform status:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get platform status'
    })
  }
})

export default router
