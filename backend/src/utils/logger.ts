import winston from 'winston'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOG_LEVEL = process.env['LOG_LEVEL'] || 'info'
const LOG_FILE = process.env['LOG_FILE'] || path.join(__dirname, '../../logs/app.log')

// Create logs directory if it doesn't exist
import { existsSync, mkdirSync } from 'fs'
const logsDir = path.dirname(LOG_FILE)
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true })
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    return `${timestamp} [${level}]: ${message} ${metaStr}`
  })
)

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Create logger instance
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env['NODE_ENV'] === 'test',
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: LOG_FILE,
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    
    // Separate file for error logs
    new winston.transports.File({
      filename: LOG_FILE.replace('.log', '.error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
})

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: LOG_FILE.replace('.log', '.exceptions.log'),
    format: fileFormat,
  })
)

logger.rejections.handle(
  new winston.transports.File({
    filename: LOG_FILE.replace('.log', '.rejections.log'),
    format: fileFormat,
  })
)

// Export logger for use in other modules
export default logger
