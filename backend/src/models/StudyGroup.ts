import mongoose, { Document, Schema } from 'mongoose'

export interface IStudyGroupMember {
  userId: mongoose.Types.ObjectId
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
}

export interface IStudyGroup extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  description: string
  ownerId: mongoose.Types.ObjectId
  members: IStudyGroupMember[]
  isPrivate: boolean
  inviteCode: string
  targetPatterns: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date

  // Instance methods
  addMember(userId: mongoose.Types.ObjectId, role?: 'admin' | 'member'): Promise<void>
  removeMember(userId: mongoose.Types.ObjectId): Promise<void>
  updateMemberRole(userId: mongoose.Types.ObjectId, newRole: 'admin' | 'member'): Promise<void>
  isMember(userId: mongoose.Types.ObjectId): boolean
  hasPermission(userId: mongoose.Types.ObjectId, action: 'manage_members' | 'delete_group' | 'edit_group'): boolean
  generateInviteCode(): string
}

const studyGroupMemberSchema = new Schema<IStudyGroupMember>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now,
    required: true
  }
})

const studyGroupSchema = new Schema<IStudyGroup>(
  {
    name: {
      type: String,
      required: [true, 'Study group name is required'],
      trim: true,
      minlength: [3, 'Group name must be at least 3 characters'],
      maxlength: [100, 'Group name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Group description cannot exceed 500 characters']
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [studyGroupMemberSchema],
    isPrivate: {
      type: Boolean,
      default: false
    },
    inviteCode: {
      type: String,
      unique: true,
      required: true
    },
    targetPatterns: [{
      type: String,
      trim: true
    }],
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

// Generate a random invite code
studyGroupSchema.methods['generateInviteCode'] = function(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Add a member to the group
studyGroupSchema.methods['addMember'] = async function(userId: mongoose.Types.ObjectId, role: 'admin' | 'member' = 'member'): Promise<void> {
  // Check if user is already a member
  if (this['isMember'](userId)) {
    throw new Error('User is already a member of this group')
  }
  
  this['members'].push({
    userId,
    role,
    joinedAt: new Date()
  })
  
  await this['save']()
}

// Remove a member from the group
studyGroupSchema.methods['removeMember'] = async function(userId: mongoose.Types.ObjectId): Promise<void> {
  // Cannot remove the owner
  if (this['ownerId'].equals(userId)) {
    throw new Error('Cannot remove the group owner')
  }
  
  const memberIndex = this['members'].findIndex((member: IStudyGroupMember) => 
    member.userId.equals(userId)
  )
  
  if (memberIndex === -1) {
    throw new Error('User is not a member of this group')
  }
  
  this['members'].splice(memberIndex, 1)
  await this['save']()
}

// Update member role
studyGroupSchema.methods['updateMemberRole'] = async function(userId: mongoose.Types.ObjectId, newRole: 'admin' | 'member'): Promise<void> {
  // Cannot change owner role
  if (this['ownerId'].equals(userId)) {
    throw new Error('Cannot change owner role')
  }
  
  const member = this['members'].find((member: IStudyGroupMember) => 
    member.userId.equals(userId)
  )
  
  if (!member) {
    throw new Error('User is not a member of this group')
  }
  
  member.role = newRole
  await this['save']()
}

// Check if user is a member
studyGroupSchema.methods['isMember'] = function(userId: mongoose.Types.ObjectId): boolean {
  return this['ownerId'].equals(userId) || 
    this['members'].some((member: IStudyGroupMember) => member.userId.equals(userId))
}

// Check if user has permission for specific action
studyGroupSchema.methods['hasPermission'] = function(userId: mongoose.Types.ObjectId, action: 'manage_members' | 'delete_group' | 'edit_group'): boolean {
  // Owner has all permissions
  if (this['ownerId'].equals(userId)) {
    return true
  }
  
  const member = this['members'].find((member: IStudyGroupMember) => 
    member.userId.equals(userId)
  )
  
  if (!member) {
    return false
  }
  
  switch (action) {
    case 'delete_group':
      return false // Only owner can delete
    case 'edit_group':
    case 'manage_members':
      return member.role === 'admin'
    default:
      return false
  }
}

// Pre-save middleware to generate invite code
studyGroupSchema.pre('save', function(next) {
  if (!this.inviteCode) {
    this.inviteCode = this.generateInviteCode()
  }
  next()
})

// Pre-save middleware to add owner as member
studyGroupSchema.pre('save', function(next) {
  if (this.isNew) {
    // Add owner as the first member with 'owner' role
    this.members.push({
      userId: this.ownerId,
      role: 'owner',
      joinedAt: new Date()
    })
  }
  next()
})

// Indexes for better query performance
studyGroupSchema.index({ ownerId: 1 })
studyGroupSchema.index({ inviteCode: 1 }, { unique: true })
studyGroupSchema.index({ isActive: 1 })
studyGroupSchema.index({ isPrivate: 1 })
studyGroupSchema.index({ 'members.userId': 1 })
studyGroupSchema.index({ createdAt: -1 })

const StudyGroup = mongoose.model<IStudyGroup>('StudyGroup', studyGroupSchema)

export default StudyGroup
