import mongoose, { Document, Schema } from 'mongoose'

export interface ILevelHistory {
  level: number
  achievedAt: Date
  xpAtAchievement: number
}

export interface IUserGamification extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  totalXp: number
  currentLevel: number
  unlockedBadges: mongoose.Types.ObjectId[]
  lastXpGainedAt?: Date
  levelHistory: ILevelHistory[]
  createdAt: Date
  updatedAt: Date

  // Instance methods
  calculateLevelFromXp(): number
  getXpForNextLevel(): number
  getXpProgress(): { current: number; required: number; percentage: number }
  addXp(amount: number): Promise<{ leveledUp: boolean; newLevel?: number }>
  unlockBadge(badgeId: mongoose.Types.ObjectId): Promise<boolean>
}

const levelHistorySchema = new Schema<ILevelHistory>({
  level: {
    type: Number,
    required: true
  },
  achievedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  xpAtAchievement: {
    type: Number,
    required: true
  }
})

const userGamificationSchema = new Schema<IUserGamification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    totalXp: {
      type: Number,
      default: 0,
      min: [0, 'XP cannot be negative']
    },
    currentLevel: {
      type: Number,
      default: 1,
      min: [1, 'Level cannot be less than 1']
    },
    unlockedBadges: [{
      type: Schema.Types.ObjectId,
      ref: 'Badge'
    }],
    lastXpGainedAt: {
      type: Date
    },
    levelHistory: [levelHistorySchema]
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

// Static method to calculate level from XP using exponential progression
userGamificationSchema.statics.calculateLevelFromXp = function(xp: number): number {
  if (xp <= 0) return 1
  
  // Exponential progression: Level = floor(sqrt(XP / 100)) + 1
  // This means: Level 1: 0-99 XP, Level 2: 100-399 XP, Level 3: 400-899 XP, etc.
  const baseXp = Number(process.env.LEVEL_XP_BASE) || 100
  return Math.floor(Math.sqrt(xp / baseXp)) + 1
}

// Instance method to calculate level from current XP
userGamificationSchema.methods.calculateLevelFromXp = function(): number {
  return (this.constructor as any).calculateLevelFromXp(this.totalXp)
}

// Instance method to get XP required for next level
userGamificationSchema.methods.getXpForNextLevel = function(): number {
  const baseXp = Number(process.env.LEVEL_XP_BASE) || 100
  const nextLevel = this.currentLevel + 1
  return (nextLevel - 1) * (nextLevel - 1) * baseXp
}

// Instance method to get XP progress to next level
userGamificationSchema.methods.getXpProgress = function(): { current: number; required: number; percentage: number } {
  const baseXp = Number(process.env.LEVEL_XP_BASE) || 100
  const currentLevelXp = (this.currentLevel - 1) * (this.currentLevel - 1) * baseXp
  const nextLevelXp = this.currentLevel * this.currentLevel * baseXp
  const currentProgress = this.totalXp - currentLevelXp
  const requiredProgress = nextLevelXp - currentLevelXp
  
  return {
    current: Math.max(0, currentProgress),
    required: requiredProgress,
    percentage: Math.min(100, Math.max(0, (currentProgress / requiredProgress) * 100))
  }
}

// Instance method to add XP and handle level-ups
userGamificationSchema.methods.addXp = async function(amount: number): Promise<{ leveledUp: boolean; newLevel?: number }> {
  if (amount <= 0) return { leveledUp: false }
  
  const oldLevel = this.currentLevel
  this.totalXp += amount
  this.lastXpGainedAt = new Date()
  
  const newLevel = this.calculateLevelFromXp()
  
  if (newLevel > oldLevel) {
    this.currentLevel = newLevel
    this.levelHistory.push({
      level: newLevel,
      achievedAt: new Date(),
      xpAtAchievement: this.totalXp
    })
    
    await this.save()
    return { leveledUp: true, newLevel }
  }
  
  await this.save()
  return { leveledUp: false }
}

// Instance method to unlock a badge
userGamificationSchema.methods.unlockBadge = async function(badgeId: mongoose.Types.ObjectId): Promise<boolean> {
  if (!this.unlockedBadges.some((id: mongoose.Types.ObjectId) => id.equals(badgeId))) {
    this.unlockedBadges.push(badgeId)
    await this.save()
    return true
  }
  return false
}

// Indexes for better query performance
userGamificationSchema.index({ userId: 1 }, { unique: true })
userGamificationSchema.index({ totalXp: -1 })
userGamificationSchema.index({ currentLevel: -1 })
userGamificationSchema.index({ lastXpGainedAt: -1 })

const UserGamification = mongoose.model<IUserGamification>('UserGamification', userGamificationSchema)

export default UserGamification
