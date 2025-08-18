import mongoose, { Document, Schema } from 'mongoose'

export interface IChallengeParticipant {
  userId: mongoose.Types.ObjectId
  progress: {
    problemsSolved: number
    patternsCompleted: string[]
    lastActivity?: Date
  }
  joinedAt: Date
  completedAt?: Date
}

export interface IChallengeReward {
  type: 'xp' | 'badge' | 'title'
  value: string | number
  position?: 'first' | 'top_3' | 'top_10' | 'all'
}

export interface IChallenge extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  description: string
  creatorId: mongoose.Types.ObjectId
  targetPatterns: string[]
  difficultyFilter?: 'Easy' | 'Medium' | 'Hard'
  startDate: Date
  endDate: Date
  participants: IChallengeParticipant[]
  rewards: IChallengeReward[]
  isPublic: boolean
  status: 'upcoming' | 'active' | 'completed'
  maxParticipants?: number
  createdAt: Date
  updatedAt: Date

  // Instance methods
  addParticipant(userId: mongoose.Types.ObjectId): Promise<void>
  removeParticipant(userId: mongoose.Types.ObjectId): Promise<void>
  updateParticipantProgress(userId: mongoose.Types.ObjectId, problemsSolved: number, patternsCompleted: string[]): Promise<void>
  getLeaderboard(): IChallengeParticipant[]
  isParticipant(userId: mongoose.Types.ObjectId): boolean
  canJoin(userId: mongoose.Types.ObjectId): boolean
  getStatus(): 'upcoming' | 'active' | 'completed'
}

const challengeParticipantSchema = new Schema<IChallengeParticipant>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  progress: {
    problemsSolved: {
      type: Number,
      default: 0,
      min: [0, 'Problems solved cannot be negative']
    },
    patternsCompleted: [{
      type: String,
      trim: true
    }],
    lastActivity: {
      type: Date
    }
  },
  joinedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  completedAt: {
    type: Date
  }
})

const challengeRewardSchema = new Schema<IChallengeReward>({
  type: {
    type: String,
    required: true,
    enum: ['xp', 'badge', 'title']
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  position: {
    type: String,
    enum: ['first', 'top_3', 'top_10', 'all'],
    default: 'all'
  }
})

const challengeSchema = new Schema<IChallenge>(
  {
    title: {
      type: String,
      required: [true, 'Challenge title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Challenge description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    targetPatterns: [{
      type: String,
      required: true,
      trim: true
    }],
    difficultyFilter: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard']
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(this: IChallenge, endDate: Date) {
          return endDate > this.startDate
        },
        message: 'End date must be after start date'
      }
    },
    participants: [challengeParticipantSchema],
    rewards: [challengeRewardSchema],
    isPublic: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed'],
      default: 'upcoming'
    },
    maxParticipants: {
      type: Number,
      min: [1, 'Maximum participants must be at least 1']
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

// Add a participant to the challenge
challengeSchema.methods.addParticipant = async function(userId: mongoose.Types.ObjectId): Promise<void> {
  if (!this.canJoin(userId)) {
    throw new Error('Cannot join this challenge')
  }
  
  if (this.isParticipant(userId)) {
    throw new Error('User is already a participant')
  }
  
  this.participants.push({
    userId,
    progress: {
      problemsSolved: 0,
      patternsCompleted: [],
      lastActivity: undefined
    },
    joinedAt: new Date()
  })
  
  await this.save()
}

// Remove a participant from the challenge
challengeSchema.methods.removeParticipant = async function(userId: mongoose.Types.ObjectId): Promise<void> {
  const participantIndex = this.participants.findIndex((p: IChallengeParticipant) => 
    p.userId.equals(userId)
  )
  
  if (participantIndex === -1) {
    throw new Error('User is not a participant in this challenge')
  }
  
  this.participants.splice(participantIndex, 1)
  await this.save()
}

// Update participant progress
challengeSchema.methods.updateParticipantProgress = async function(
  userId: mongoose.Types.ObjectId, 
  problemsSolved: number, 
  patternsCompleted: string[]
): Promise<void> {
  const participant = this.participants.find((p: IChallengeParticipant) => 
    p.userId.equals(userId)
  )
  
  if (!participant) {
    throw new Error('User is not a participant in this challenge')
  }
  
  participant.progress.problemsSolved = problemsSolved
  participant.progress.patternsCompleted = patternsCompleted
  participant.progress.lastActivity = new Date()
  
  // Check if challenge is completed
  if (patternsCompleted.length >= this.targetPatterns.length) {
    participant.completedAt = new Date()
  }
  
  await this.save()
}

// Get leaderboard sorted by progress
challengeSchema.methods.getLeaderboard = function(): IChallengeParticipant[] {
  return this.participants
    .slice()
    .sort((a: IChallengeParticipant, b: IChallengeParticipant) => {
      // First sort by patterns completed
      const aPatternsCount = a.progress.patternsCompleted.length
      const bPatternsCount = b.progress.patternsCompleted.length
      
      if (aPatternsCount !== bPatternsCount) {
        return bPatternsCount - aPatternsCount
      }
      
      // Then by problems solved
      if (a.progress.problemsSolved !== b.progress.problemsSolved) {
        return b.progress.problemsSolved - a.progress.problemsSolved
      }
      
      // Finally by completion time (if both completed)
      if (a.completedAt && b.completedAt) {
        return a.completedAt.getTime() - b.completedAt.getTime()
      }
      
      // If only one completed, they rank higher
      if (a.completedAt) return -1
      if (b.completedAt) return 1
      
      // Otherwise by join time
      return a.joinedAt.getTime() - b.joinedAt.getTime()
    })
}

// Check if user is a participant
challengeSchema.methods.isParticipant = function(userId: mongoose.Types.ObjectId): boolean {
  return this.participants.some((p: IChallengeParticipant) => p.userId.equals(userId))
}

// Check if user can join the challenge
challengeSchema.methods.canJoin = function(userId: mongoose.Types.ObjectId): boolean {
  const now = new Date()
  
  // Cannot join if already a participant
  if (this.isParticipant(userId)) {
    return false
  }
  
  // Cannot join if challenge has started or ended
  if (now >= this.startDate) {
    return false
  }
  
  // Cannot join if max participants reached
  if (this.maxParticipants && this.participants.length >= this.maxParticipants) {
    return false
  }
  
  return true
}

// Get current status based on dates
challengeSchema.methods.getStatus = function(): 'upcoming' | 'active' | 'completed' {
  const now = new Date()
  
  if (now < this.startDate) {
    return 'upcoming'
  } else if (now >= this.startDate && now < this.endDate) {
    return 'active'
  } else {
    return 'completed'
  }
}

// Pre-save middleware to update status based on current date
challengeSchema.pre('save', function(next) {
  this.status = this.getStatus()
  next()
})

// Indexes for better query performance
challengeSchema.index({ creatorId: 1 })
challengeSchema.index({ status: 1 })
challengeSchema.index({ isPublic: 1 })
challengeSchema.index({ startDate: 1 })
challengeSchema.index({ endDate: 1 })
challengeSchema.index({ 'participants.userId': 1 })
challengeSchema.index({ createdAt: -1 })

const Challenge = mongoose.model<IChallenge>('Challenge', challengeSchema)

export default Challenge
