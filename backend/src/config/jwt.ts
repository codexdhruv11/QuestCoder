import jwt, { SignOptions } from 'jsonwebtoken'
import { logger } from '@/utils/logger'

const JWT_SECRET = process.env['JWT_SECRET'] || 'fallback-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '7d'
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] || 'fallback-refresh-secret-key'
const JWT_REFRESH_EXPIRES_IN = process.env['JWT_REFRESH_EXPIRES_IN'] || '30d'

export interface JWTPayload {
  userId: string
  email: string
  username: string
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload {
  userId: string
  tokenId: string
  iat?: number
  exp?: number
}

export class JWTService {
  /**
   * Generate an access token
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      const options: SignOptions = {
        expiresIn: JWT_EXPIRES_IN as any,
        issuer: 'questcoder-api',
        audience: 'questcoder-frontend'
      }
      return jwt.sign(payload, JWT_SECRET, options)
    } catch (error) {
      logger.error('Failed to generate access token:', error)
      throw new Error('Token generation failed')
    }
  }

  /**
   * Generate a refresh token
   */
  static generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
    try {
      const options: SignOptions = {
        expiresIn: JWT_REFRESH_EXPIRES_IN as any,
        issuer: 'questcoder-api',
        audience: 'questcoder-frontend'
      }
      return jwt.sign(payload, JWT_REFRESH_SECRET, options)
    } catch (error) {
      logger.error('Failed to generate refresh token:', error)
      throw new Error('Refresh token generation failed')
    }
  }

  /**
   * Verify an access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'questcoder-api',
        audience: 'questcoder-frontend'
      }) as JWTPayload

      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      logger.error('Token verification failed:', error)
      throw new Error('Token verification failed')
    }
  }

  /**
   * Verify a refresh token
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'questcoder-api',
        audience: 'questcoder-frontend'
      }) as RefreshTokenPayload

      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token')
      }
      logger.error('Refresh token verification failed:', error)
      throw new Error('Refresh token verification failed')
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token)
    } catch (error) {
      logger.error('Token decode failed:', error)
      return null
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token)
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000)
      }
      return null
    } catch (error) {
      logger.error('Failed to get token expiration:', error)
      return null
    }
  }
}

export default JWTService
