import mongoose, { Document, Schema } from 'mongoose'

export interface IPlatformStatus extends Document {
  _id: mongoose.Types.ObjectId
  platform: 'leetcode' | 'codeforces' | 'github' | 'hackerrank' | 'hackerearth'
  status: 'operational' | 'degraded' | 'down'
  lastChecked: Date
  responseTime: number // in milliseconds
  errorCount: number
  lastError?: string
  uptime: number // percentage
  createdAt: Date
  updatedAt: Date

  // Instance methods
  updateStatus(status: 'operational' | 'degraded' | 'down', responseTime?: number, error?: string): void
  calculateUptime(): number
}

const platformStatusSchema = new Schema<IPlatformStatus>(
  {
    platform: {
      type: String,
      required: [true, 'Platform name is required'],
      enum: ['leetcode', 'codeforces', 'github', 'hackerrank', 'hackerearth'],
      unique: true
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['operational', 'degraded', 'down'],
      default: 'operational'
    },
    lastChecked: {
      type: Date,
      default: Date.now
    },
    responseTime: {
      type: Number,
      default: 0,
      min: [0, 'Response time cannot be negative']
    },
    errorCount: {
      type: Number,
      default: 0,
      min: [0, 'Error count cannot be negative']
    },
    lastError: {
      type: String,
      maxlength: [500, 'Error message cannot exceed 500 characters']
    },
    uptime: {
      type: Number,
      default: 100,
      min: [0, 'Uptime cannot be negative'],
      max: [100, 'Uptime cannot exceed 100%']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(_doc: any, ret: any) {
        delete ret.__v
        return ret
      }
    },
    toObject: {
      transform: function(_doc: any, ret: any) {
        delete ret.__v
        return ret
      }
    }
  }
)

// Instance method to update platform status
platformStatusSchema.methods['updateStatus'] = function(
  status: 'operational' | 'degraded' | 'down', 
  responseTime?: number, 
  error?: string
): void {
  this['status'] = status
  this['lastChecked'] = new Date()
  
  if (responseTime !== undefined) {
    this['responseTime'] = responseTime
  }
  
  if (status !== 'operational') {
    this['errorCount'] += 1
    if (error) {
      this['lastError'] = error
    }
  }
  
  // Calculate new uptime based on status changes
  this['uptime'] = this['calculateUptime']()
}

// Instance method to calculate uptime percentage
platformStatusSchema.methods['calculateUptime'] = function(): number {
  // This is a simplified calculation
  // In a real implementation, you might track historical status changes
  const totalChecks = this['errorCount'] + Math.max(1, Math.floor(Date.now() / (5 * 60 * 1000))) // Assuming checks every 5 minutes
  const successfulChecks = totalChecks - this['errorCount']
  return Math.max(0, Math.min(100, (successfulChecks / totalChecks) * 100))
}

// Additional indexes for better query performance
// Note: platform already has an index from 'unique: true'
platformStatusSchema.index({ status: 1 })
platformStatusSchema.index({ lastChecked: -1 })
platformStatusSchema.index({ uptime: -1 })

// Compound index for platform and status queries
platformStatusSchema.index({ platform: 1, status: 1 })

const PlatformStatus = mongoose.model<IPlatformStatus>('PlatformStatus', platformStatusSchema)

export default PlatformStatus








