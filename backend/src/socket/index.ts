import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { logger } from '@/utils/logger'
import NotificationService from '@/services/notificationService'
import StudyGroup from '@/models/StudyGroup'
import Challenge from '@/models/Challenge'
import mongoose from 'mongoose'

interface AuthenticatedSocket extends Socket {
  userId?: string
  username?: string
}

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  // Enhanced CORS configuration with multiple origins support
  const corsOrigins = (process.env['SOCKET_IO_CORS_ORIGIN'] || process.env['CORS_ORIGIN'] || 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim())

  logger.info(`Socket.IO CORS origins configured: ${corsOrigins.join(', ')}`)

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, server-to-server)
        if (!origin) return callback(null, true)
        
        // Check if origin is in allowed list
        if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
          return callback(null, true)
        }
        
        // For development, allow localhost with any port
        if (process.env['NODE_ENV'] === 'development') {
          const localhostRegex = /^http:\/\/localhost:\d+$/
          if (localhostRegex.test(origin)) {
            return callback(null, true)
          }
        }
        
        logger.warn(`Socket.IO CORS blocked origin: ${origin}`)
        callback(new Error('Not allowed by CORS'))
      },
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ['websocket', 'polling'],
    // Enhanced connection configuration
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    allowEIO3: true,
    // Connection rate limiting
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    }
  })

  // Set Socket.IO instance in NotificationService
  NotificationService.setSocketInstance(io)

  // Enhanced JWT Authentication middleware with comprehensive error handling
  io.use(async (socket: AuthenticatedSocket, next) => {
    const startTime = Date.now()
    const clientIP = socket.handshake.address
    const userAgent = socket.handshake.headers['user-agent']
    
    try {
      // Extract token from multiple possible locations
      let token = socket.handshake.auth?.['token']
      
      if (!token && socket.handshake.headers?.authorization) {
        const authHeader = socket.handshake.headers.authorization
        if (typeof authHeader === 'string') {
          token = authHeader.replace(/^Bearer\s+/i, '')
        }
      }
      
      if (!token && socket.handshake.query?.['token']) {
        token = socket.handshake.query['token'] as string
      }

      // Validate token presence
      if (!token || token.trim() === '') {
        logger.warn(`Socket authentication failed - no token provided`, {
          clientIP,
          userAgent,
          headers: socket.handshake.headers
        })
        return next(new Error('Authentication token required'))
      }

      // Validate JWT secret configuration
      const jwtSecret = process.env['JWT_SECRET']
      if (!jwtSecret) {
        logger.error('Socket authentication failed - JWT secret not configured')
        return next(new Error('Server configuration error'))
      }

      // Verify and decode token
      let decoded: any
      try {
        decoded = jwt.verify(token.trim(), jwtSecret) as any
      } catch (jwtError: any) {
        let errorMessage = 'Invalid authentication token'
        
        if (jwtError.name === 'TokenExpiredError') {
          errorMessage = 'Authentication token expired'
          logger.warn(`Socket authentication failed - token expired`, {
            clientIP,
            userAgent,
            expiredAt: jwtError.expiredAt
          })
        } else if (jwtError.name === 'JsonWebTokenError') {
          errorMessage = 'Malformed authentication token'
          logger.warn(`Socket authentication failed - malformed token`, {
            clientIP,
            userAgent,
            error: jwtError.message
          })
        } else if (jwtError.name === 'NotBeforeError') {
          errorMessage = 'Authentication token not active yet'
          logger.warn(`Socket authentication failed - token not yet active`, {
            clientIP,
            userAgent,
            notBefore: jwtError.notBefore
          })
        } else {
          logger.error(`Socket authentication failed - JWT verification error`, {
            clientIP,
            userAgent,
            error: jwtError.message,
            stack: jwtError.stack
          })
        }
        
        return next(new Error(errorMessage))
      }

      // Validate token payload
      if (!decoded || typeof decoded !== 'object') {
        logger.error(`Socket authentication failed - invalid token payload`, {
          clientIP,
          userAgent,
          payload: decoded
        })
        return next(new Error('Invalid token payload'))
      }

      // Extract user information with fallbacks
      const userId = decoded.userId || decoded._id || decoded.id
      const username = decoded.username || decoded.user?.username || decoded.name

      if (!userId) {
        logger.error(`Socket authentication failed - no user ID in token`, {
          clientIP,
          userAgent,
          payload: decoded
        })
        return next(new Error('Invalid token - missing user ID'))
      }

      // Set socket user information
      socket.userId = String(userId)
      socket.username = username || 'Unknown'

      const authTime = Date.now() - startTime
      logger.info(`Socket authenticated successfully`, {
        userId: socket.userId,
        username: socket.username,
        clientIP,
        userAgent,
        authTime: `${authTime}ms`,
        tokenExp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'no expiration'
      })

      next()

    } catch (error: any) {
      const authTime = Date.now() - startTime
      logger.error(`Socket authentication failed - unexpected error`, {
        clientIP,
        userAgent,
        authTime: `${authTime}ms`,
        error: error.message,
        stack: error.stack
      })
      next(new Error('Authentication failed'))
    }
  })

  // Connection tracking and rate limiting
  const connectionCounts = new Map<string, number>()
  const connectionTimes = new Map<string, number[]>()
  const MAX_CONNECTIONS_PER_USER = 5
  const RATE_LIMIT_WINDOW = 60000 // 1 minute
  const MAX_CONNECTIONS_PER_IP = 10

  // Enhanced connection handling with monitoring and rate limiting
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!
    const username = socket.username!
    const clientIP = socket.handshake.address
    const userAgent = socket.handshake.headers['user-agent']
    const connectionTime = Date.now()

    // Rate limiting checks
    const userConnectionCount = connectionCounts.get(userId) || 0
    if (userConnectionCount >= MAX_CONNECTIONS_PER_USER) {
      logger.warn(`Connection rejected - too many connections for user`, {
        userId,
        username,
        currentConnections: userConnectionCount,
        maxAllowed: MAX_CONNECTIONS_PER_USER,
        clientIP
      })
      socket.emit('connection_error', { 
        message: 'Too many active connections. Please close other tabs or sessions.' 
      })
      socket.disconnect(true)
      return
    }

    // IP-based rate limiting
    const recentConnections = connectionTimes.get(clientIP) || []
    const recentConnectionsInWindow = recentConnections.filter(
      time => connectionTime - time < RATE_LIMIT_WINDOW
    )
    
    if (recentConnectionsInWindow.length >= MAX_CONNECTIONS_PER_IP) {
      logger.warn(`Connection rejected - too many connections from IP`, {
        clientIP,
        userId,
        username,
        connectionsInWindow: recentConnectionsInWindow.length,
        maxAllowed: MAX_CONNECTIONS_PER_IP
      })
      socket.emit('connection_error', { 
        message: 'Rate limit exceeded. Please wait before reconnecting.' 
      })
      socket.disconnect(true)
      return
    }

    // Update connection tracking
    connectionCounts.set(userId, userConnectionCount + 1)
    recentConnectionsInWindow.push(connectionTime)
    connectionTimes.set(clientIP, recentConnectionsInWindow)

    logger.info(`Socket.IO connection established`, {
      socketId: socket.id,
      userId,
      username,
      clientIP,
      userAgent,
      transport: socket.conn.transport.name,
      userConnections: userConnectionCount + 1,
      totalConnections: io.engine.clientsCount
    })

    // Join user-specific room with error handling
    try {
      socket.join(`user_${userId}`)
      logger.debug(`User joined personal room: user_${userId}`)
    } catch (error) {
      logger.error(`Failed to join user room for ${userId}:`, error)
    }

    // Handle joining pattern rooms
    socket.on('join_pattern', (patternId: string) => {
      socket.join(`pattern_${patternId}`)
      logger.info(`User ${username} joined pattern room: ${patternId}`)
    })

    // Handle leaving pattern rooms
    socket.on('leave_pattern', (patternId: string) => {
      socket.leave(`pattern_${patternId}`)
      logger.info(`User ${username} left pattern room: ${patternId}`)
    })

    // Handle joining study group rooms with authorization
    socket.on('join_group', async (groupId: string) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(groupId)) {
          socket.emit('join_group_error', { message: 'Invalid group ID' })
          return
        }

        const group = await StudyGroup.findById(groupId).lean()
        if (!group) {
          socket.emit('join_group_error', { message: 'Group not found' })
          return
        }

        const userObjectId = new mongoose.Types.ObjectId(userId)
        const isMember = group.ownerId.equals(userObjectId) || 
                        group.members.some(m => m.userId.equals(userObjectId))

        if (group.isPrivate && !isMember) {
          socket.emit('join_group_error', { message: 'Access denied to private group' })
          logger.warn(`User ${username} denied access to private group: ${groupId}`)
          return
        }

        socket.join(`group_${groupId}`)
        socket.emit('join_group_success', { groupId, groupName: group.name })
        logger.info(`User ${username} joined group room: ${groupId}`)

      } catch (error) {
        logger.error(`Error joining group ${groupId} for user ${username}:`, error)
        socket.emit('join_group_error', { message: 'Failed to join group' })
      }
    })

    // Handle leaving study group rooms
    socket.on('leave_group', (groupId: string) => {
      socket.leave(`group_${groupId}`)
      logger.info(`User ${username} left group room: ${groupId}`)
    })

    // Handle joining challenge rooms with authorization
    socket.on('join_challenge', async (challengeId: string) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(challengeId)) {
          socket.emit('join_challenge_error', { message: 'Invalid challenge ID' })
          return
        }

        const challenge = await Challenge.findById(challengeId).lean()
        if (!challenge) {
          socket.emit('join_challenge_error', { message: 'Challenge not found' })
          return
        }

        const userObjectId = new mongoose.Types.ObjectId(userId)
        const isParticipant = challenge.participants.some(p => p.userId.equals(userObjectId))
        const now = new Date()

        if (!isParticipant && now >= challenge.startDate) {
          socket.emit('join_challenge_error', { message: 'Cannot join challenge after it has started' })
          logger.warn(`User ${username} denied access to started challenge: ${challengeId}`)
          return
        }

        if (!isParticipant && !challenge.isPublic) {
          socket.emit('join_challenge_error', { message: 'Access denied to private challenge' })
          logger.warn(`User ${username} denied access to private challenge: ${challengeId}`)
          return
        }

        socket.join(`challenge_${challengeId}`)
        socket.emit('join_challenge_success', { challengeId, challengeTitle: challenge.title })
        logger.info(`User ${username} joined challenge room: ${challengeId}`)

      } catch (error) {
        logger.error(`Error joining challenge ${challengeId} for user ${username}:`, error)
        socket.emit('join_challenge_error', { message: 'Failed to join challenge' })
      }
    })

    // Handle leaving challenge rooms
    socket.on('leave_challenge', (challengeId: string) => {
      socket.leave(`challenge_${challengeId}`)
      logger.info(`User ${username} left challenge room: ${challengeId}`)
    })

    // Handle leaderboard subscriptions
    socket.on('subscribe_leaderboard', (leaderboardType: string) => {
      socket.join(`leaderboard_${leaderboardType}`)
      logger.info(`User ${username} subscribed to leaderboard: ${leaderboardType}`)
    })

    // Handle leaderboard unsubscriptions
    socket.on('unsubscribe_leaderboard', (leaderboardType: string) => {
      socket.leave(`leaderboard_${leaderboardType}`)
      logger.info(`User ${username} unsubscribed from leaderboard: ${leaderboardType}`)
    })

    // Handle typing indicators for group chat (if implemented later)
    socket.on('typing_start', (roomId: string) => {
      socket.to(roomId).emit('user_typing', { userId, username })
    })

    socket.on('typing_stop', (roomId: string) => {
      socket.to(roomId).emit('user_stopped_typing', { userId, username })
    })

    // Enhanced disconnect handling with connection cleanup
    socket.on('disconnect', (reason: string) => {
      const disconnectTime = Date.now()
      const sessionDuration = disconnectTime - connectionTime

      // Update connection tracking
      const currentCount = connectionCounts.get(userId) || 1
      if (currentCount <= 1) {
        connectionCounts.delete(userId)
      } else {
        connectionCounts.set(userId, currentCount - 1)
      }

      logger.info(`Socket.IO disconnection`, {
        socketId: socket.id,
        userId,
        username,
        reason,
        sessionDuration: `${sessionDuration}ms`,
        remainingConnections: connectionCounts.get(userId) || 0,
        totalConnections: io.engine.clientsCount - 1
      })

      // Log detailed disconnect reason for debugging
      switch (reason) {
        case 'server disconnect':
          logger.debug(`Server initiated disconnect for ${username}`)
          break
        case 'client disconnect':
          logger.debug(`Client initiated disconnect for ${username}`)
          break
        case 'ping timeout':
          logger.warn(`Connection timeout for ${username} - poor network quality`)
          break
        case 'transport close':
          logger.debug(`Transport closed for ${username}`)
          break
        case 'transport error':
          logger.warn(`Transport error for ${username}`)
          break
        default:
          logger.debug(`Unknown disconnect reason for ${username}: ${reason}`)
      }
    })

    // Enhanced error handling with detailed logging
    socket.on('error', (error: Error) => {
      logger.error(`Socket.IO error for user ${username}`, {
        socketId: socket.id,
        userId,
        username,
        error: error.message,
        stack: error.stack,
        clientIP,
        userAgent
      })
      
      // Handle specific error types
      if (error.message.includes('authentication')) {
        socket.emit('auth_error', { message: 'Authentication error occurred' })
      } else if (error.message.includes('rate limit')) {
        socket.emit('rate_limit_error', { message: 'Rate limit exceeded' })
      }
    })

    // Add heartbeat mechanism for connection health monitoring
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat', { timestamp: Date.now() })
      } else {
        clearInterval(heartbeatInterval)
      }
    }, 30000) // Every 30 seconds

    // Handle heartbeat response
    socket.on('heartbeat_response', (data: { timestamp: number }) => {
      const latency = Date.now() - data.timestamp
      if (latency > 5000) { // More than 5 seconds latency
        logger.warn(`High latency detected for user ${username}: ${latency}ms`)
      }
    })

    // Cleanup heartbeat on disconnect
    socket.on('disconnect', () => {
      clearInterval(heartbeatInterval)
    })

    // Send welcome message
    socket.emit('connected', {
      message: 'Successfully connected to QuestCoder real-time service',
      userId,
      timestamp: new Date().toISOString()
    })
  })

  // Enhanced global error handling and monitoring
  io.engine.on('connection_error', (err: any) => {
    logger.error('Socket.IO engine connection error:', {
      message: err.message,
      description: err.description,
      context: err.context,
      type: err.type,
      code: err.code,
      req: {
        url: err.req?.url,
        method: err.req?.method,
        headers: err.req?.headers
      }
    })
  })

  // Monitor server-level events
  io.on('connection', () => {
    logger.debug(`Total Socket.IO connections: ${io.engine.clientsCount}`)
  })

  // Periodic cleanup for stale connection tracking data
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    
    // Clean up old connection times (older than rate limit window)
    for (const [ip, times] of connectionTimes.entries()) {
      const recentTimes = times.filter(time => now - time < RATE_LIMIT_WINDOW)
      if (recentTimes.length === 0) {
        connectionTimes.delete(ip)
      } else {
        connectionTimes.set(ip, recentTimes)
      }
    }
    
    // Log cleanup if debug enabled
    if (process.env['LOG_LEVEL'] === 'debug') {
      logger.debug('Socket.IO connection tracking cleanup completed', {
        activeIPs: connectionTimes.size,
        activeUsers: connectionCounts.size
      })
    }
  }, RATE_LIMIT_WINDOW) // Run cleanup every minute

  // Graceful shutdown handler
  const shutdown = () => {
    logger.info('Shutting down Socket.IO server...')
    clearInterval(cleanupInterval)
    
    // Disconnect all clients gracefully
    io.emit('server_shutdown', { 
      message: 'Server is shutting down. You will be reconnected automatically.',
      timestamp: new Date().toISOString()
    })
    
    setTimeout(() => {
      io.close(() => {
        logger.info('Socket.IO server shutdown completed')
      })
    }, 5000) // Give clients 5 seconds to receive the message
  }

  // Handle process termination
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  logger.info('Socket.IO server initialized successfully', {
    corsOrigins: corsOrigins.length,
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    connectionRecovery: true
  })
  
  return io
}

export default initializeSocket
