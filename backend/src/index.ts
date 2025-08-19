import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { config } from 'dotenv'
import { connectDB } from '@/config/database'
import { logger } from '@/utils/logger'
import authRoutes from '@/routes/auth'
import userRoutes from '@/routes/users'
import patternRoutes from '@/routes/patterns'
import widgetRoutes from '@/routes/widgets'
import analyticsRoutes from '@/routes/analytics'
import gamificationRoutes from '@/routes/gamification'
import communityRoutes from '@/routes/community'
import notificationRoutes from '@/routes/notifications'
import adminRoutes from '@/routes/admin'
import initializeSocket from '@/socket/index'
import SocketEvents from '@/socket/events'
import platformMonitoringJob from '@/jobs/platformMonitoring'

// Load environment variables
config()

const app = express()
const PORT = process.env['PORT'] || 3000

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
}))

// CORS configuration
app.use(cors({
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env['RATE_LIMIT_WINDOW_MS']) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env['RATE_LIMIT_MAX_REQUESTS']) || 1000, // Increased to 1000 requests per windowMs for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development
  skip: (req) => process.env.NODE_ENV === 'development',
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

// Health check endpoints
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development',
  })
})

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development',
    services: {
      database: 'connected',
      monitoring: 'active'
    }
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/patterns', patternRoutes)
app.use('/api/widgets', widgetRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/gamification', gamificationRoutes)
app.use('/api/community', communityRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin', adminRoutes)

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

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server')
  process.exit(0)
})

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDB()
    
    // Create HTTP server
    const httpServer = createServer(app)
    
    // Initialize Socket.IO
    const io = initializeSocket(httpServer)
    const socketEvents = new SocketEvents(io)
    
    // Store socket events instance in app locals for access in routes
    app.locals['socketEvents'] = socketEvents
    
    // Initialize platform monitoring
    platformMonitoringJob.setSocketServer(io)
    await platformMonitoringJob.initializePlatforms()
    
    logger.info('Platform monitoring initialized successfully')
    
    // Start listening
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT} in ${process.env['NODE_ENV'] || 'development'} mode`)
      logger.info(`Health check available at http://localhost:${PORT}/health`)
      logger.info(`Socket.IO server initialized and ready for connections`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
