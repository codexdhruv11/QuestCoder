import { Request, Response, NextFunction } from 'express'
import JWTService, { JWTPayload } from '@/config/jwt'
import User, { IUser } from '@/models/User'
import { logger } from '@/utils/logger'

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser
      userId?: string
    }
  }
}

export interface AuthRequest extends Request {
  user: IUser
  userId: string
}

/**
 * Extract token from request headers or cookies
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization

  // Check Authorization header: "Bearer <token>"
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7) // Remove "Bearer " prefix
  }

  // Check cookies for token
  if (req.cookies && req.cookies.token) {
    return req.cookies.token
  }

  // Check query parameter (less secure, for specific use cases)
  if (req.query['token'] && typeof req.query['token'] === 'string') {
    return req.query['token'] as string
  }

  return null
}

/**
 * Middleware to authenticate and authorize requests using JWT
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req)

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      })
      return
    }

    // Verify the token
    let decoded: JWTPayload
    try {
      decoded = JWTService.verifyAccessToken(token)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid token'
      
      // Handle specific token errors
      if (errorMessage === 'Token expired') {
        res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        })
        return
      }
      
      res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'INVALID_TOKEN'
      })
      return
    }

    // Fetch user from database
    const user = await User.findById(decoded.userId).select('+isActive')

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Token is valid but user not found.',
        code: 'USER_NOT_FOUND'
      })
      return
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User account is disabled.',
        code: 'ACCOUNT_DISABLED'
      })
      return
    }

    // Update last login time (optional - might be expensive for every request)
    // Consider doing this only on login, not every authenticated request
    // await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() })

    // Attach user to request
    req.user = user
    req.userId = user._id.toString()

    next()
  } catch (error) {
    logger.error('Authentication middleware error:', error)
    res.status(500).json({
      success: false,
      message: 'Authentication failed due to server error.',
    })
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req)

    if (!token) {
      // No token provided, continue without authentication
      next()
      return
    }

    try {
      const decoded = JWTService.verifyAccessToken(token)
      const user = await User.findById(decoded.userId).select('+isActive')

      if (user && user.isActive) {
        req.user = user
        req.userId = user._id.toString()
      }
    } catch (error) {
      // Token is invalid, but don't fail the request
      logger.warn('Optional auth - invalid token provided:', error)
    }

    next()
  } catch (error) {
    logger.error('Optional authentication middleware error:', error)
    next() // Continue even if there's an error
  }
}

/**
 * Middleware to check if user has specific roles/permissions
 * For future use when role-based access control is implemented
 */
export function authorize(..._roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required.',
        })
        return
      }

      // For now, all authenticated users have access
      // In the future, implement role checking here
      // const userRoles = req.user.roles || []
      // const hasRole = roles.some(role => userRoles.includes(role))
      
      // if (!hasRole) {
      //   res.status(403).json({
      //     success: false,
      //     message: 'Insufficient permissions.',
      //   })
      //   return
      // }

      next()
    } catch (error) {
      logger.error('Authorization middleware error:', error)
      res.status(500).json({
        success: false,
        message: 'Authorization failed due to server error.',
      })
    }
  }
}

/**
 * Middleware to ensure user owns the resource
 * Checks if the userId parameter matches the authenticated user
 */
export function requireOwnership(userIdParam = 'userId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required.',
        })
        return
      }

      const resourceUserId = req.params[userIdParam]
      
      if (!resourceUserId) {
        res.status(400).json({
          success: false,
          message: `Missing ${userIdParam} parameter.`,
        })
        return
      }

      if (req.userId !== resourceUserId) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.',
        })
        return
      }

      next()
    } catch (error) {
      logger.error('Ownership middleware error:', error)
      res.status(500).json({
        success: false,
        message: 'Ownership check failed due to server error.',
      })
    }
  }
}

// Alias for consistency with other parts of the codebase
export const optionalAuthenticate = optionalAuth

export default authenticate
