import { Request, Response, NextFunction } from 'express'
import { logger } from '@/utils/logger'
import { CustomError } from '@/utils/errors'

export const adminAuth = (req: Request, _res: Response, next: NextFunction): void => {
  // Assuming auth middleware has already run and populated req.user
  if (!req.user) {
    logger.warn('Admin middleware called without authenticated user. Ensure auth middleware runs first.')
    return next(new CustomError('Authentication required', 401, 'AUTH_REQUIRED'))
  }

  if (req.user.role !== 'admin') {
    logger.warn(`Unauthorized admin access attempt by user: ${req.user.email} (Role: ${req.user.role})`)
    return next(new CustomError('Forbidden: Admin access required', 403, 'ADMIN_ACCESS_REQUIRED'))
  }
  
  next()
}
