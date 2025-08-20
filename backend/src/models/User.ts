import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import { logger } from '@/utils/logger'

const BCRYPT_SALT_ROUNDS = Number(process.env['BCRYPT_SALT_ROUNDS']) || 12

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  username: string
  email: string
  password: string
  role: 'user' | 'admin'
  leetcodeHandle?: string
  codeforcesHandle?: string
  githubHandle?: string
  hackerrankHandle?: string
  hackerearthHandle?: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    notifications: boolean
    autoRefreshWidgets: boolean
  }
  lastLoginAt?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>
  toSafeObject(): Omit<IUser, 'password'>
  isAdmin(): boolean
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    leetcodeHandle: {
      type: String,
      trim: true,
      maxlength: [50, 'LeetCode handle cannot exceed 50 characters']
    },
    codeforcesHandle: {
      type: String,
      trim: true,
      maxlength: [50, 'Codeforces handle cannot exceed 50 characters']
    },
    githubHandle: {
      type: String,
      trim: true,
      maxlength: [50, 'GitHub handle cannot exceed 50 characters']
    },
    hackerrankHandle: {
      type: String,
      trim: true,
      maxlength: [50, 'HackerRank handle cannot exceed 50 characters']
    },
    hackerearthHandle: {
      type: String,
      trim: true,
      maxlength: [50, 'HackerEarth handle cannot exceed 50 characters']
    },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
      },
      notifications: {
        type: Boolean,
        default: true
      },
      autoRefreshWidgets: {
        type: Boolean,
        default: true
      }
    },
    lastLoginAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(_doc: any, ret: any) {
        delete ret.password
        delete ret.__v
        return ret
      }
    },
    toObject: {
      transform: function(_doc: any, ret: any) {
        delete ret.password
        delete ret.__v
        return ret
      }
    }
  }
)

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next()

  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS)
    this.password = hashedPassword
    next()
  } catch (error) {
    logger.error('Password hashing failed:', error)
    next(error as Error)
  }
})

// Instance method to check password
userSchema.methods['comparePassword'] = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this['password'])
  } catch (error) {
    logger.error('Password comparison failed:', error)
    return false
  }
}

// Instance method to get safe user object (without password)
userSchema.methods['toSafeObject'] = function() {
  const userObject = this['toObject']()
  delete userObject.password
  return userObject
}

// Instance method to check if user is admin
userSchema.methods['isAdmin'] = function(): boolean {
  return this['role'] === 'admin'
}

// Indexes for better query performance
userSchema.index({ email: 1 })
userSchema.index({ username: 1 })
userSchema.index({ createdAt: -1 })
userSchema.index({ isActive: 1 })
userSchema.index({ role: 1 })

// Compound index for platform handles
userSchema.index({ 
  leetcodeHandle: 1, 
  codeforcesHandle: 1, 
  githubHandle: 1, 
  hackerrankHandle: 1,
  hackerearthHandle: 1 
}, { sparse: true })

const User = mongoose.model<IUser>('User', userSchema)

export default User
