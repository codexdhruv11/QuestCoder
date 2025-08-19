import mongoose, { Document, Schema } from 'mongoose'

export interface IBadgeCriteria {
  type: 'problems_solved' | 'streak_days' | 'patterns_completed' | 'difficulty_solved' | 'daily_problems' | 'level_reached' | 'xp_earned'
  value: number
  additionalData?: any
}

export interface IBadge extends Document {
  _id: mongoose.Types.ObjectId
  identifier: string
  name: string
  description: string
  iconUrl?: string
  imageUrl?: string
  category: 'achievement' | 'progress' | 'milestone' | 'special' | 'seasonal'
  criteria: IBadgeCriteria
  xpReward: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  isActive: boolean
  createdAt: Date
  updatedAt: Date

  // Static methods
  checkUserEligibility(userId: mongoose.Types.ObjectId): Promise<boolean>
  getAvailableByCategory(category: string): Promise<IBadge[]>
}

const badgeCriteriaSchema = new Schema<IBadgeCriteria>({
  type: {
    type: String,
    required: true,
    enum: ['problems_solved', 'streak_days', 'patterns_completed', 'difficulty_solved', 'daily_problems', 'level_reached', 'xp_earned']
  },
  value: {
    type: Number,
    required: true,
    min: [0, 'Criteria value cannot be negative']
  },
  additionalData: {
    type: Schema.Types.Mixed
  }
})

const badgeSchema = new Schema<IBadge>(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[a-z_]+$/, 'Identifier can only contain lowercase letters and underscores']
    },
    name: {
      type: String,
      required: [true, 'Badge name is required'],
      trim: true,
      maxlength: [100, 'Badge name cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Badge description is required'],
      trim: true,
      maxlength: [500, 'Badge description cannot exceed 500 characters']
    },
    iconUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Icon URL cannot exceed 500 characters']
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Image URL cannot exceed 500 characters']
    },
    category: {
      type: String,
      required: true,
      enum: ['achievement', 'progress', 'milestone', 'special', 'seasonal'],
      default: 'achievement'
    },
    criteria: {
      type: badgeCriteriaSchema,
      required: true
    },
    xpReward: {
      type: Number,
      default: 0,
      min: [0, 'XP reward cannot be negative']
    },
    rarity: {
      type: String,
      required: true,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common'
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
        delete ret.__v
        return ret
      }
    }
  }
)

// Static method to check if user meets badge criteria
badgeSchema.statics.checkUserEligibility = async function(badgeId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<boolean> {
  const UserProgress = mongoose.model('UserProgress')
  const UserGamification = mongoose.model('UserGamification')
  
  const badge = await this.findById(badgeId)
  if (!badge || !badge.isActive) return false
  
  const userProgress = await UserProgress.findOne({ userId })
  const userGamification = await UserGamification.findOne({ userId })
  
  if (!userProgress) return false
  
  const { criteria } = badge
  
  switch (criteria.type) {
    case 'problems_solved': {
      if (criteria.additionalData?.requireAllDifficulties) {
        const diffs = new Set((userProgress.activityLog||[]).filter((l: any) => l.type === 'problem_solved').map((l: any) => l.metadata?.difficulty))
        return ['Easy','Medium','Hard'].every(d => diffs.has(d))
      }
      const total = (userProgress.activityLog||[]).filter((l: any) => l.type === 'problem_solved').length
      return total >= criteria.value
    }
    
    case 'streak_days': {
      return (userProgress.currentStreak || 0) >= criteria.value
    }
    
    case 'patterns_completed': {
      const completedPatterns = userProgress.patternProgress?.filter((p: any) => 
        p.problems?.every((prob: any) => prob.completed)
      )?.length || 0
      return completedPatterns >= criteria.value
    }
    
    case 'difficulty_solved': {
      const target = criteria.additionalData?.difficulty
      if (!target) return false
      const solved = (userProgress.activityLog||[]).filter((l: any) => l.type === 'problem_solved' && l.metadata?.difficulty === target).length
      return solved >= criteria.value
    }
    
    case 'daily_problems': {
      const start = new Date(); start.setHours(0,0,0,0)
      const end = new Date(start); end.setDate(end.getDate()+1)
      const count = (userProgress.activityLog||[]).filter((l: any) => l.type === 'problem_solved' && l.date && new Date(l.date) >= start && new Date(l.date) < end).length
      return count >= criteria.value
    }
    
    case 'level_reached': {
      return (userGamification?.currentLevel || 1) >= criteria.value
    }
    
    case 'xp_earned': {
      return (userGamification?.totalXp || 0) >= criteria.value
    }
    
    default:
      return false
  }
}

// Static method to get available badges by category
badgeSchema.statics.getAvailableByCategory = function(category: string) {
  return this.find({ category, isActive: true }).sort({ rarity: 1, createdAt: 1 })
}

// Indexes for better query performance
badgeSchema.index({ identifier: 1 }, { unique: true })
badgeSchema.index({ category: 1 })
badgeSchema.index({ rarity: 1 })
badgeSchema.index({ isActive: 1 })
badgeSchema.index({ 'criteria.type': 1 })

const Badge = mongoose.model<IBadge>('Badge', badgeSchema)

export default Badge
