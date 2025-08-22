import mongoose, { Document, Schema } from 'mongoose'

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  type: 'badge_unlocked' | 'level_up' | 'challenge_invite' | 'group_invite' | 'challenge_completed' | 'group_joined' | 'achievement' | 'system'
  title: string
  message: string
  data?: any
  isRead: boolean
  createdAt: Date
  expiresAt?: Date

  // Instance methods
  markAsRead(): Promise<void>
  isExpired(): boolean
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'badge_unlocked',
        'level_up', 
        'challenge_invite', 
        'group_invite', 
        'challenge_completed', 
        'group_joined', 
        'achievement',
        'system'
      ]
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    data: {
      type: Schema.Types.Mixed,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(_doc: any, ret: any) {
        delete ret.__v
        return ret
      }
    }
  }
)

// Instance method to mark notification as read
notificationSchema.methods['markAsRead'] = async function(): Promise<void> {
  if (!this['isRead']) {
    this['isRead'] = true
    await this['save']()
  }
}

// Instance method to check if notification is expired
notificationSchema.methods['isExpired'] = function(): boolean {
  if (!this['expiresAt']) return false
  return new Date() > this['expiresAt']
}

// Pre-save middleware to set expiration date if not provided
notificationSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Default expiration: 30 days from creation
    const expirationDays = Number(process.env['NOTIFICATION_CLEANUP_DAYS']) || 30
    this.expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
  }
  next()
})

// Compound indexes for efficient querying
notificationSchema.index({ userId: 1, isRead: 1 })
notificationSchema.index({ userId: 1, type: 1 })
notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL index for auto-cleanup

const Notification = mongoose.model<INotification>('Notification', notificationSchema)

export default Notification
