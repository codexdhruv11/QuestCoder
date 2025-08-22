export class CustomError extends Error {
  public statusCode: number
  public code: string

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message)
    this.name = 'CustomError'
    this.statusCode = statusCode
    this.code = code
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, 400, code)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication failed', code: string = 'AUTH_ERROR') {
    super(message, 401, code)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Access denied', code: string = 'FORBIDDEN') {
    super(message, 403, code)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(message, 404, code)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT') {
    super(message, 409, code)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Too many requests', code: string = 'RATE_LIMIT') {
    super(message, 429, code)
    this.name = 'RateLimitError'
  }
}
