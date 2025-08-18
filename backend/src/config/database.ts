import mongoose from 'mongoose'
import { logger } from '@/utils/logger'

const MONGODB_URI = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/questcoder'

export async function connectDB(): Promise<void> {
  try {
    const options: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    }

    await mongoose.connect(MONGODB_URI, options)
    
    logger.info('MongoDB connected successfully', {
      uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@'),
      readyState: mongoose.connection.readyState,
    })

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
    })

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected')
    })

  } catch (error) {
    logger.error('MongoDB connection failed:', error)
    throw error
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect()
    logger.info('MongoDB disconnected successfully')
  } catch (error) {
    logger.error('MongoDB disconnection failed:', error)
    throw error
  }
}
