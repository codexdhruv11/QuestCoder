import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { logger } from '@/utils/logger'

/**
 * Validation middleware factory
 */
export function validate(schema: {
  body?: Joi.ObjectSchema
  query?: Joi.ObjectSchema
  params?: Joi.ObjectSchema
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: string[] = []

      // Validate request body
      if (schema.body) {
        const { error } = schema.body.validate(req.body)
        if (error) {
          errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`)
        }
      }

      // Validate query parameters
      if (schema.query) {
        const { error } = schema.query.validate(req.query)
        if (error) {
          errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`)
        }
      }

      // Validate route parameters
      if (schema.params) {
        const { error } = schema.params.validate(req.params)
        if (error) {
          errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`)
        }
      }

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        })
        return
      }

      next()
    } catch (error) {
      logger.error('Validation middleware error:', error)
      res.status(500).json({
        success: false,
        message: 'Validation failed due to server error'
      })
    }
  }
}

// Common validation schemas
export const ValidationSchemas = {
  // User authentication schemas
  signup: {
    body: Joi.object({
      username: Joi.string()
        .pattern(/^[a-zA-Z0-9_-]+$/)
        .min(3)
        .max(20)
        .required()
        .messages({
          'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens',
          'string.min': 'Username must be at least 3 characters',
          'string.max': 'Username cannot exceed 20 characters',
          'any.required': 'Username is required'
        }),
      email: Joi.string()
        .email()
        .lowercase()
        .required()
        .messages({
          'string.email': 'Please enter a valid email address',
          'any.required': 'Email is required'
        }),
      password: Joi.string()
        .min(6)
        .max(128)
        .required()
        .messages({
          'string.min': 'Password must be at least 6 characters',
          'string.max': 'Password cannot exceed 128 characters',
          'any.required': 'Password is required'
        }),
      leetcodeHandle: Joi.string().max(50).optional().allow(''),
      codeforcesHandle: Joi.string().max(50).optional().allow(''),
      githubHandle: Joi.string().max(50).optional().allow(''),
      hackerrankHandle: Joi.string().max(50).optional().allow(''),
      hackerearthHandle: Joi.string().max(50).optional().allow('')
    })
  },

  login: {
    body: Joi.object({
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Please enter a valid email address',
          'any.required': 'Email is required'
        }),
      password: Joi.string()
        .required()
        .messages({
          'any.required': 'Password is required'
        })
    })
  },

  // Profile update schema
  updateProfile: {
    body: Joi.object({
      username: Joi.string()
        .pattern(/^[a-zA-Z0-9_-]+$/)
        .min(3)
        .max(20)
        .optional()
        .messages({
          'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens',
          'string.min': 'Username must be at least 3 characters',
          'string.max': 'Username cannot exceed 20 characters'
        }),
      email: Joi.string()
        .email()
        .lowercase()
        .optional()
        .messages({
          'string.email': 'Please enter a valid email address'
        }),
      leetcodeHandle: Joi.string().max(50).optional().allow(''),
      codeforcesHandle: Joi.string().max(50).optional().allow(''),
      githubHandle: Joi.string().max(50).optional().allow(''),
      hackerrankHandle: Joi.string().max(50).optional().allow(''),
      hackerearthHandle: Joi.string().max(50).optional().allow('')
    })
  },

  // Password change schema
  changePassword: {
    body: Joi.object({
      currentPassword: Joi.string()
        .required()
        .messages({
          'any.required': 'Current password is required'
        }),
      newPassword: Joi.string()
        .min(6)
        .max(128)
        .required()
        .messages({
          'string.min': 'New password must be at least 6 characters',
          'string.max': 'New password cannot exceed 128 characters',
          'any.required': 'New password is required'
        }),
      confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
          'any.only': 'Passwords do not match',
          'any.required': 'Password confirmation is required'
        })
    })
  },

  // User progress schemas
  markProblemSolved: {
    body: Joi.object({
      problemName: Joi.string()
        .max(200)
        .required()
        .messages({
          'string.max': 'Problem name cannot exceed 200 characters',
          'any.required': 'Problem name is required'
        }),
      pattern: Joi.string()
        .required()
        .messages({
          'any.required': 'Pattern is required'
        }),
      subPattern: Joi.string().optional().allow(''),
      platform: Joi.string()
        .valid('LeetCode', 'Codeforces', 'HackerRank', 'GeeksforGeeks', 'Other')
        .required()
        .messages({
          'any.only': 'Platform must be one of: LeetCode, Codeforces, HackerRank, GeeksforGeeks, Other',
          'any.required': 'Platform is required'
        }),
      difficulty: Joi.string()
        .valid('Easy', 'Medium', 'Hard')
        .required()
        .messages({
          'any.only': 'Difficulty must be one of: Easy, Medium, Hard',
          'any.required': 'Difficulty is required'
        }),
      timeSpent: Joi.number()
        .min(0)
        .max(1440)
        .optional()
        .messages({
          'number.min': 'Time spent cannot be negative',
          'number.max': 'Time spent cannot exceed 24 hours'
        }),
      attempts: Joi.number()
        .integer()
        .min(1)
        .optional()
        .messages({
          'number.integer': 'Attempts must be a whole number',
          'number.min': 'Attempts must be at least 1'
        }),
      notes: Joi.string().max(1000).optional().allow(''),
      problemUrl: Joi.string().uri().optional().allow(''),
      solutionUrl: Joi.string().uri().optional().allow(''),
      tags: Joi.array().items(Joi.string()).max(20).optional()
    }),
    params: Joi.object({
      id: Joi.string().required()
    })
  },

  // Common parameter schemas
  mongoId: {
    params: Joi.object({
      id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
          'string.pattern.base': 'Invalid ID format',
          'any.required': 'ID is required'
        })
    })
  },

  pagination: {
    query: Joi.object({
      page: Joi.number()
        .integer()
        .min(1)
        .optional()
        .default(1),
      limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .optional()
        .default(10),
      sort: Joi.string().optional(),
      order: Joi.string().valid('asc', 'desc').optional().default('desc')
    })
  },

  // Widget parameter schemas
  widgetHandle: {
    params: Joi.object({
      handle: Joi.string()
        .min(1)
        .max(50)
        .required()
        .messages({
          'string.min': 'Handle cannot be empty',
          'string.max': 'Handle cannot exceed 50 characters',
          'any.required': 'Handle is required'
        })
    })
  },

  // Search and filter schemas
  searchPatterns: {
    query: Joi.object({
      search: Joi.string().max(100).optional(),
      category: Joi.string().max(50).optional(),
      difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').optional(),
      platform: Joi.string().valid('LeetCode', 'Codeforces', 'HackerRank', 'GeeksforGeeks', 'Other').optional(),
      solved: Joi.boolean().optional(),
      page: Joi.number().integer().min(1).optional().default(1),
      limit: Joi.number().integer().min(1).max(100).optional().default(10),
      sort: Joi.string().optional(),
      order: Joi.string().valid('asc', 'desc').optional().default('desc')
    })
  }
}

// Specific validation middleware functions
export const validateSignup = validate(ValidationSchemas.signup)
export const validateLogin = validate(ValidationSchemas.login)
export const validateUpdateProfile = validate(ValidationSchemas.updateProfile)
export const validateChangePassword = validate(ValidationSchemas.changePassword)
export const validateMarkProblemSolved = validate(ValidationSchemas.markProblemSolved)
export const validateMongoId = validate(ValidationSchemas.mongoId)
export const validatePagination = validate(ValidationSchemas.pagination)
export const validateWidgetHandle = validate(ValidationSchemas.widgetHandle)
export const validateSearchPatterns = validate(ValidationSchemas.searchPatterns)

export default validate
