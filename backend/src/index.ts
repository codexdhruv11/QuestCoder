import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { config } from 'dotenv'
import mongoose from 'mongoose'
import { connectDB } from '@/config/database'
import { logger } from '@/utils/logger'
import authRoutes from '@/routes/auth'
import userRoutes from '@/routes/users'
import patternRoutes from '@/routes/patterns'
import widgetRoutes from '@/routes/widgets'
import gamificationRoutes from '@/routes/gamification'
import communityRoutes from '@/routes/community'
import notificationRoutes from '@/routes/notifications'
import adminRoutes from '@/routes/admin'
import contestRoutes from '@/routes/contests'
import migrationRoutes from '@/routes/migration'
import analyticsRoutes from '@/routes/analytics'
import initializeSocket from '@/socket/index'
import SocketEvents from '@/socket/events'
import platformMonitoringJob from '@/jobs/platformMonitoring'

// Load environment variables
config()

// Environment variable validation
const validateEnvironment = () => {
  const requiredEnvVars = [
    { key: 'JWT_SECRET', required: true, message: 'JWT_SECRET is required for authentication' },
    { key: 'MONGODB_URI', required: true, message: 'MONGODB_URI is required for database connection' },
  ]

  const optionalEnvVars = [
    { key: 'PORT', default: '3000', message: 'PORT defaults to 3000' },
    { key: 'CORS_ORIGIN', default: 'http://localhost:5173', message: 'CORS_ORIGIN defaults to http://localhost:5173' },
    { key: 'SOCKET_IO_CORS_ORIGIN', default: 'http://localhost:5173', message: 'SOCKET_IO_CORS_ORIGIN defaults to http://localhost:5173' },
    { key: 'NODE_ENV', default: 'development', message: 'NODE_ENV defaults to development' },
    { key: 'LOG_LEVEL', default: 'info', message: 'LOG_LEVEL defaults to info' },
  ]

  logger.info('Starting environment validation...')

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar.key]) {
      logger.error(`Environment validation failed: ${envVar.message}`)
      throw new Error(`Missing required environment variable: ${envVar.key}`)
    }
    logger.info(`✓ ${envVar.key} is configured`)
  }

  // Set defaults for optional variables
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar.key]) {
      process.env[envVar.key] = envVar.default
      logger.info(`→ ${envVar.message}`)
    } else {
      logger.info(`✓ ${envVar.key}: ${process.env[envVar.key]}`)
    }
  }

  logger.info('Environment validation completed successfully')
}

// Validate environment on startup
validateEnvironment()

const app = express()
const PORT = parseInt(process.env['PORT'] || '5000', 10)

logger.info('Initializing QuestCoder backend server...')

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
}))

// Enhanced CORS configuration for multiple environments
const corsOrigins = process.env['CORS_ORIGIN']?.split(',').map(origin => origin.trim()) || ['http://localhost:5173']
logger.info(`CORS origins configured: ${corsOrigins.join(', ')}`)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
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
    
    logger.warn(`CORS blocked origin: ${origin}`)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env['RATE_LIMIT_WINDOW_MS']) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env['RATE_LIMIT_MAX_REQUESTS']) || 1000, // Increased to 1000 requests per windowMs for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development
  skip: (req) => process.env['NODE_ENV'] === 'development',
})

app.use('/api', limiter)

// Compression middleware
app.use(compression())

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Cookie parsing middleware
app.use(cookieParser())

// Request logging middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  })
  next()
})

// Health check endpoints with detailed service status
let databaseStatus = 'unknown'
let socketStatus = 'unknown'

const checkDatabaseConnection = async () => {
  try {
    const mongoose = require('mongoose')
    if (mongoose.connection.readyState === 1) {
      databaseStatus = 'connected'
      return true
    } else {
      databaseStatus = 'disconnected'
      return false
    }
  } catch (error) {
    databaseStatus = 'error'
    return false
  }
}

// Simple health check for wait-on and load balancers
app.head('/health', async (_req, res) => {
  const isDbConnected = await checkDatabaseConnection()
  res.status(isDbConnected ? 200 : 503).end()
})

app.get('/health', async (_req, res) => {
  const isDbConnected = await checkDatabaseConnection()
  
  const healthStatus = {
    status: isDbConnected ? 'OK' : 'ERROR',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development',
    version: process.env['npm_package_version'] || '1.0.0',
    services: {
      database: databaseStatus,
      socket: socketStatus,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      }
    }
  }
  
  res.status(isDbConnected ? 200 : 503).json(healthStatus)
})

app.get('/api/health', async (_req, res) => {
  const isDbConnected = await checkDatabaseConnection()
  
  const healthStatus = {
    status: isDbConnected ? 'OK' : 'ERROR',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development',
    version: process.env['npm_package_version'] || '1.0.0',
    services: {
      database: databaseStatus,
      socket: socketStatus,
      monitoring: 'active'
    },
    system: {
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    }
  }
  
  res.status(isDbConnected ? 200 : 503).json(healthStatus)
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/patterns', patternRoutes)
app.use('/api/widgets', widgetRoutes)
app.use('/api/gamification', gamificationRoutes)
app.use('/api/community', communityRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/contests', contestRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/migration', migrationRoutes)
app.use('/api/analytics', analyticsRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  })
})

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  })

  // Don't leak error details in production
  const isDev = process.env['NODE_ENV'] === 'development'
  
  res.status(err.status || 500).json({
    success: false,
    message: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  })
})

// Graceful shutdown handler
let httpServer: any = null
let io: any = null

const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} signal received: starting graceful shutdown`)
  
  if (httpServer) {
    httpServer.close(async (err: any) => {
      if (err) {
        logger.error('Error during HTTP server shutdown:', err)
      } else {
        logger.info('HTTP server closed successfully')
      }
      
      // Close Socket.IO server
      if (io) {
        io.close(() => {
          logger.info('Socket.IO server closed successfully')
        })
      }
      
      // Close database connection
      try {
        await mongoose.connection.close()
        logger.info('Database connection closed successfully')
      } catch (error) {
        logger.error('Error closing database connection:', error)
      }
      
      logger.info('Graceful shutdown completed')
      process.exit(err ? 1 : 0)
    })
    
    // Force close after timeout
    setTimeout(() => {
      logger.error('Graceful shutdown timeout - forcing exit')
      process.exit(1)
    }, 30000)
  } else {
    process.exit(0)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', { reason, promise })
  gracefulShutdown('UNHANDLED_REJECTION')
})

// Enhanced server startup with detailed dependency checking
async function startServer() {
  try {
    logger.info('🚀 Starting QuestCoder backend server...')
    
    // Step 1: Database connection with retry logic
    logger.info('📊 Connecting to database...')
    let dbConnected = false
    let attempts = 0
    const maxAttempts = 5
    
    while (!dbConnected && attempts < maxAttempts) {
      try {
        await connectDB()
        await checkDatabaseConnection()
        dbConnected = true
        logger.info('✅ Database connected successfully')
      } catch (error) {
        attempts++
        logger.error(`❌ Database connection attempt ${attempts}/${maxAttempts} failed:`, error)
        
        if (attempts < maxAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 10000)
          logger.info(`⏳ Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          throw new Error(`Failed to connect to database after ${maxAttempts} attempts`)
        }
      }
    }
    
    // Step 2: Create HTTP server
    logger.info('🌐 Creating HTTP server...')
    httpServer = createServer(app)
    
    // Step 3: Initialize Socket.IO with error handling
    logger.info('🔌 Initializing Socket.IO server...')
    try {
      io = initializeSocket(httpServer)
      socketStatus = 'initialized'
      
      const socketEvents = new SocketEvents(io)
      app.locals['socketEvents'] = socketEvents
      
      logger.info('✅ Socket.IO server initialized successfully')
    } catch (error) {
      logger.error('❌ Socket.IO initialization failed:', error)
      socketStatus = 'error'
      throw error
    }
    
    // Step 4: Initialize platform monitoring
    logger.info('📈 Initializing platform monitoring...')
    try {
      platformMonitoringJob.setSocketServer(io)
      await platformMonitoringJob.initializePlatforms()
      logger.info('✅ Platform monitoring initialized successfully')
    } catch (error) {
      logger.warn('⚠️ Platform monitoring initialization failed (non-critical):', error)
    }
    
    // Step 5: Start HTTP server
    logger.info(`🎯 Starting HTTP server on port ${PORT}...`)
    await new Promise<void>((resolve, reject) => {
      httpServer.listen(PORT, '0.0.0.0', (err: any) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
    
    socketStatus = 'ready'
    
    // Success messages
    logger.info('🎉 QuestCoder backend server started successfully!')
    logger.info(`📍 Server running at: http://localhost:${PORT}`)
    logger.info(`🏥 Health check: http://localhost:${PORT}/health`)
    logger.info(`🔗 API endpoint: http://localhost:${PORT}/api`)
    logger.info(`🔌 Socket.IO ready for connections`)
    logger.info(`🌍 Environment: ${process.env['NODE_ENV']}`)
    
  } catch (error) {
    logger.error('💥 Failed to start server:', error)
    
    // Attempt cleanup
    if (httpServer) {
      httpServer.close()
    }
    if (io) {
      io.close()
    }
    
    process.exit(1)
  }
}

// Start the server
startServer().catch((error) => {
  logger.error('Fatal error during server startup:', error)
  process.exit(1)
})
