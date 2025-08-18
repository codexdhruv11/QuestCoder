import { Server as SocketIOServer } from 'socket.io'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { logger } from '@/utils/logger'
import NotificationService from '@/services/notificationService'

interface AuthenticatedSocket extends SocketIOServer {
  userId?: string
  username?: string
}

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.SOCKET_IO_CORS_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  })

  // Set Socket.IO instance in NotificationService
  NotificationService.setSocketInstance(io)

  // JWT Authentication middleware
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return next(new Error('Authentication token required'))
      }

      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        return next(new Error('JWT secret not configured'))
      }

      const decoded = jwt.verify(token, jwtSecret) as any
      socket.userId = decoded.userId
      socket.username = decoded.username

      logger.info(`Socket authenticated for user: ${socket.username} (${socket.userId})`)
      next()

    } catch (error) {
      logger.error('Socket authentication failed:', error)
      next(new Error('Invalid authentication token'))
    }
  })

  // Connection handling
  io.on('connection', (socket: any) => {
    const userId = socket.userId
    const username = socket.username

    logger.info(`User connected via Socket.IO: ${username} (${userId})`)

    // Join user-specific room
    socket.join(`user_${userId}`)

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

    // Handle joining study group rooms
    socket.on('join_group', (groupId: string) => {
      socket.join(`group_${groupId}`)
      logger.info(`User ${username} joined group room: ${groupId}`)
    })

    // Handle leaving study group rooms
    socket.on('leave_group', (groupId: string) => {
      socket.leave(`group_${groupId}`)
      logger.info(`User ${username} left group room: ${groupId}`)
    })

    // Handle joining challenge rooms
    socket.on('join_challenge', (challengeId: string) => {
      socket.join(`challenge_${challengeId}`)
      logger.info(`User ${username} joined challenge room: ${challengeId}`)
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

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      logger.info(`User disconnected: ${username} (${userId}) - Reason: ${reason}`)
    })

    // Handle connection errors
    socket.on('error', (error: Error) => {
      logger.error(`Socket error for user ${username}:`, error)
    })

    // Send welcome message
    socket.emit('connected', {
      message: 'Successfully connected to QuestCoder real-time service',
      userId,
      timestamp: new Date().toISOString()
    })
  })

  // Global error handling
  io.engine.on('connection_error', (err: any) => {
    logger.error('Socket.IO connection error:', {
      message: err.message,
      description: err.description,
      context: err.context,
      type: err.type
    })
  })

  logger.info('Socket.IO server initialized successfully')
  return io
}

export default initializeSocket
