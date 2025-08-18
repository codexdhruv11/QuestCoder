import mongoose, { Document, Schema } from 'mongoose'

export interface IPatternProgress {
  patternName: string
  totalProblems: number
  solvedProblems: number
  solvedProblemIds?: string[]
}

export interface IActivityLog {
  type: 'problem_solved' | 'problem_unsolved' | 'pattern_completed'
  problemId?: string
  patternName?: string
  date: Date
  metadata?: any
}

export interface IUserProgress extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  patternProgress: IPatternProgress[]
  currentStreak: number
  longestStreak: number
  lastSolvedAt?: Date
  activityLog: IActivityLog[]
  createdAt: Date
  updatedAt: Date
}

const patternProgressSchema = new Schema<IPatternProgress>({
  patternName: {
    type: String,
    required: true
  },
  totalProblems: {
    type: Number,
    default: 0
  },
  solvedProblems: {
    type: Number,
    default: 0
  },
  solvedProblemIds: {
    type: [String],
    default: []
  }
}, { _id: false })

const activityLogSchema = new Schema<IActivityLog>({
  type: {
    type: String,
    enum: ['problem_solved', 'problem_unsolved', 'pattern_completed'],
    required: true
  },
  problemId: String,
  patternName: String,
  date: {
    type: Date,
    default: Date.now
  },
  metadata: Schema.Types.Mixed
}, { _id: false })

const userProgressSchema = new Schema<IUserProgress>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true
    },
    patternProgress: {
      type: [patternProgressSchema],
      default: []
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastSolvedAt: {
      type: Date
    },
    activityLog: {
      type: [activityLogSchema],
      default: []
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

// Indexes for efficient querying
userProgressSchema.index({ userId: 1 })
userProgressSchema.index({ lastSolvedAt: -1 })
userProgressSchema.index({ currentStreak: -1 })
userProgressSchema.index({ 'patternProgress.patternName': 1 })

const UserProgress = mongoose.model<IUserProgress>('UserProgress', userProgressSchema)

export default UserProgress
