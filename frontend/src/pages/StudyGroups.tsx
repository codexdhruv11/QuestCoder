import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { Button } from '@/components/ui/8bit/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/8bit/dialog'
import { Input } from '@/components/ui/8bit/input'
import { Textarea } from '@/components/ui/8bit/textarea'
import { Label } from '@/components/ui/8bit/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/8bit/select'
import { Avatar, AvatarFallback } from '@/components/ui/8bit/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/8bit/tabs'
import { Skeleton } from '@/components/ui/8bit/skeleton'
import { ScrollArea } from '@/components/ui/8bit/scroll-area'
import { useToast } from '@/components/ui/8bit/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { LevelBadge } from '@/components/gamification/LevelIndicator'
import { communityAPI } from '@/lib/api'
import { useSocket } from '@/contexts/SocketContext'
import { useSocketSubscription } from '@/hooks/useSocket'
import { 
  Users, 
  Plus, 
  Search, 
  Calendar,
  Settings,
  UserPlus,
  UserMinus,
  MessageCircle,
  Activity,
  TrendingUp,
  Trophy,
  Wifi,
  WifiOff
} from 'lucide-react'

interface StudyGroup {
  _id: string
  id?: string  // For compatibility
  name: string
  description: string
  isPrivate: boolean
  privacy?: 'public' | 'private'  // For UI compatibility
  memberCount?: number
  maxMembers?: number
  inviteCode?: string
  createdAt: Date
  ownerId: string
  creator?: {
    id: string
    username: string
    avatar?: string
  }
  members: {
    userId: string
    id?: string  // For compatibility
    username?: string
    avatar?: string
    level?: number
    role: 'owner' | 'admin' | 'member'
    joinedAt: Date
    xp?: number
    problemsSolved?: number
  }[]
  stats?: {
    totalXP: number
    totalProblemsSloved: number
    averageLevel: number
    completionRate: number
  }
  recentActivity?: {
    type: 'join' | 'solve' | 'levelUp' | 'badge'
    user: string
    description: string
    timestamp: Date
  }[]
  targetPatterns?: string[]
  tags?: string[]  // For UI compatibility
}

interface StudyGroupsData {
  myGroups: StudyGroup[]
  availableGroups: StudyGroup[]
  invitations: {
    id: string
    group: StudyGroup
    invitedBy: string
    invitedAt: Date
  }[]
}

interface GroupActivity {
  id: string
  groupId: string
  groupName: string
  userId: string
  username: string
  type: 'member_joined' | 'member_left' | 'progress_update' | 'level_up' | 'badge_unlock' | 'pattern_complete'
  message: string
  timestamp: string
  metadata?: {
    patternName?: string
    problemName?: string
    level?: number
    badgeName?: string
    achievements?: string[]
  }
}

interface GroupStats {
  groupId: string
  totalProblems: number
  totalXP: number
  averageLevel: number
  mostActiveMembers: Array<{
    username: string
    problemsSolved: number
    xpGained: number
  }>
  recentMilestones: Array<{
    type: 'level_up' | 'badge_unlock' | 'pattern_complete'
    username: string
    achievement: string
    timestamp: string
  }>
}

interface MemberPresence {
  userId: string
  username: string
  isOnline: boolean
  lastSeen: string
  currentActivity?: 'solving_problems' | 'viewing_patterns' | 'idle'
}

const roleColors = {
  owner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  member: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
}

const StudyGroupCard: React.FC<{
  group: StudyGroup
  isJoined: boolean
  onJoin?: (groupId: string) => void
  onLeave?: (groupId: string) => void
  onManage?: (groupId: string) => void
}> = ({ group, isJoined, onJoin, onLeave, onManage }) => {
  const [showMembers, setShowMembers] = useState(false)
  const userRole = group.members.find(m => m.id === 'current-user')?.role // This should be from context

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card font="retro" className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle font="retro" className="text-lg font-semibold line-clamp-1">
                {group.name}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={group.isPrivate ? 'secondary' : 'default'}>
                  {group.isPrivate ? 'private' : 'public'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {group.members?.length || 0} members
                </span>
              </div>
            </div>
            
            {isJoined && (userRole === 'owner' || userRole === 'admin') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onManage?.(group._id)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {group.description}
          </p>

          {/* Target Patterns */}
          {group.targetPatterns && group.targetPatterns.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {group.targetPatterns.slice(0, 3).map((pattern) => (
                <Badge key={pattern} variant="outline" className="text-xs">
                  {pattern}
                </Badge>
              ))}
              {group.targetPatterns.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{group.targetPatterns.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Member Count */}
          <div className="py-3 border-t border-b">
            <div className="text-center">
              <p className="text-lg font-semibold">{group.members?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </div>

          {/* Owner */}
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                OW
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              Group Owner
            </span>
          </div>

          {/* Members Preview */}
          <div className="space-y-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>View Members ({group.members?.length || 0})</span>
            </button>

            <AnimatePresence>
              {showMembers && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {group.members?.slice(0, 5).map((member) => (
                    <div key={member.userId} className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {member.userId.toString().slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm flex-1">Member</span>
                      <Badge font="retro" className={`text-xs ${roleColors[member.role]}`}>
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                  {(group.members?.length || 0) > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{(group.members?.length || 0) - 5} more members
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            {isJoined ? (
              <>
                <Button variant="outline" size="sm" className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onLeave?.(group._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </>
            ) : (
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onJoin?.(group._id)}
                  disabled={false}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Join Group
                </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const CreateGroupDialog: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
}> = ({ open, onOpenChange, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'public',
    targetPatterns: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      targetPatterns: formData.targetPatterns.split(',').map(t => t.trim()).filter(Boolean)
    })
    setFormData({ name: '', description: '', privacy: 'public', targetPatterns: '' })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Study Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label font="retro" htmlFor="name">Group Name</Label>
            <Input font="retro"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter group name"
              required
            />
          </div>

          <div>
            <Label font="retro" htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your study group..."
              rows={3}
            />
          </div>

          <div>
            <Label font="retro" htmlFor="privacy">Privacy</Label>
            <Select 
              value={formData.privacy} 
              onValueChange={(value) => setFormData({ ...formData, privacy: value })}
            >
              <SelectTrigger font="retro">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label font="retro" htmlFor="targetPatterns">Target Patterns (comma separated)</Label>
            <Input font="retro"
              id="targetPatterns"
              value={formData.targetPatterns}
              onChange={(e) => setFormData({ ...formData, targetPatterns: e.target.value })}
              placeholder="Two Pointers, Sliding Window, Dynamic Programming"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button font="retro" type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button font="retro" type="submit">Create Group</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const StudyGroups: React.FC = () => {
  const [data, setData] = useState<StudyGroupsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('members')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { toast } = useToast()
  
  // Real-time state
  const [groupActivities, setGroupActivities] = useState<Map<string, GroupActivity[]>>(new Map())
  const [groupStats, setGroupStats] = useState<Map<string, GroupStats>>(new Map())
  const [memberPresence] = useState<Map<string, MemberPresence[]>>(new Map())
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set())
  
  // Socket context
  const { 
    groupActivityFeed, 
    recentProgressUpdates, 
    connectionStatus, 
    joinGroup, 
    leaveGroup
  } = useSocket()
  
  // Refs for optimization

  useEffect(() => {
    fetchStudyGroups()
  }, [])

  // Room management for user's groups
  useEffect(() => {
    if (data?.myGroups) {
      // Join rooms for user's groups
      data.myGroups.forEach(group => {
        if (!joinedRooms.has(group._id)) {
          joinGroup(group._id)
          setJoinedRooms(prev => new Set(prev).add(group._id))
        }
      })
      
      // Leave rooms for groups user is no longer part of
      joinedRooms.forEach(groupId => {
        if (!data.myGroups.find(g => g._id === groupId)) {
          leaveGroup(groupId)
          setJoinedRooms(prev => {
            const newSet = new Set(prev)
            newSet.delete(groupId)
            return newSet
          })
        }
      })
    }
    
    return () => {
      // Cleanup - leave all group rooms
      joinedRooms.forEach(groupId => {
        leaveGroup(groupId)
      })
    }
  }, [data?.myGroups, joinGroup, leaveGroup])

  // Process group activity feed for real-time updates
  useEffect(() => {
    if (groupActivityFeed.length > 0) {
      groupActivityFeed.forEach(update => {
        const activity: GroupActivity = {
          id: `${update.userId}_${update.timestamp}`,
          groupId: update.groupInfo.groupId,
          groupName: update.groupInfo.groupName,
          userId: update.userId,
          username: update.username,
          type: 'progress_update',
          message: `${update.username} solved "${update.progressData.problemName}" on ${update.progressData.platform}`,
          timestamp: update.timestamp,
          metadata: {
            patternName: update.progressData.patternName,
            problemName: update.progressData.problemName,
            achievements: update.progressData.achievements || []
          }
        }
        
        setGroupActivities(prev => {
          const newMap = new Map(prev)
          const groupActivities = newMap.get(update.groupInfo.groupId) || []
          newMap.set(update.groupInfo.groupId, [...groupActivities, activity].slice(-20))
          return newMap
        })
      })
    }
  }, [groupActivityFeed])

  // Process progress updates for live member progress tracking
  useEffect(() => {
    if (recentProgressUpdates.length > 0) {
      // Update group stats based on progress updates
      recentProgressUpdates.forEach(update => {
        // Find which groups this user belongs to
        data?.myGroups.forEach(group => {
          if (group.members.find(m => m.userId === update.userId)) {
            setGroupStats(prev => {
              const newMap = new Map(prev)
              const currentStats = newMap.get(group._id) || {
                groupId: group._id,
                totalProblems: 0,
                totalXP: 0,
                averageLevel: 0,
                mostActiveMembers: [],
                recentMilestones: []
              }
              
              // Update stats
              newMap.set(group._id, {
                ...currentStats,
                totalProblems: currentStats.totalProblems + 1
              })
              
              return newMap
            })
          }
        })
      })
    }
  }, [recentProgressUpdates, data?.myGroups])

  // Listen for group activity updates with debounced refresh
  const debouncedRefresh = React.useRef<NodeJS.Timeout>()
  useSocketSubscription('group_activity', (activityData: { 
    groupId: string; 
    activity: {
      type: string; 
      userId: string;
      username: string;
      data?: any;
      timestamp: string;
    }
  }) => {
    // Add real-time activity to feed
    const activity: GroupActivity = {
      id: `${activityData.activity.userId}_${activityData.activity.timestamp}`,
      groupId: activityData.groupId,
      groupName: data?.myGroups.find(g => g._id === activityData.groupId)?.name || 'Unknown Group',
      userId: activityData.activity.userId,
      username: activityData.activity.username,
      type: activityData.activity.type as any,
      message: getActivityMessage(activityData.activity),
      timestamp: activityData.activity.timestamp,
      metadata: activityData.activity.data
    }
    
    setGroupActivities(prev => {
      const newMap = new Map(prev)
      const groupActivities = newMap.get(activityData.groupId) || []
      newMap.set(activityData.groupId, [...groupActivities, activity].slice(-20))
      return newMap
    })
    
    // Clear existing timeout
    if (debouncedRefresh.current) {
      clearTimeout(debouncedRefresh.current)
    }
    
    // Debounce refresh to avoid API spam
    debouncedRefresh.current = setTimeout(() => {
      fetchStudyGroups()
    }, 1000) // 1 second debounce
  })

  // Helper function to generate activity messages
  const getActivityMessage = (activity: any): string => {
    switch (activity.type) {
      case 'member_joined':
        return `${activity.username} joined the group`
      case 'member_left':
        return `${activity.username} left the group`
      case 'progress_update':
        return `${activity.username} solved a problem`
      case 'level_up':
        return `${activity.username} reached level ${activity.data?.level}`
      case 'badge_unlock':
        return `${activity.username} unlocked the "${activity.data?.badgeName}" badge`
      default:
        return `${activity.username} had an activity`
    }
  }

  const fetchStudyGroups = async () => {
    setLoading(true)
    try {
      const response = await communityAPI.getGroups()
      
      // Transform the data structure as needed
      const studyGroupsData = {
        myGroups: [], // Backend doesn't separate user groups yet
        availableGroups: response.groups || [],
        invitations: [] // Backend doesn't have invitations endpoint yet
      }
      setData(studyGroupsData)
    } catch (error) {
      console.error('Error fetching study groups:', error)
      toast({
        title: "Error",
        description: "Failed to load study groups",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (groupData: any) => {
    try {
      await communityAPI.createGroup({
        name: groupData.name,
        description: groupData.description,
        isPrivate: groupData.privacy === 'private',
        targetPatterns: groupData.targetPatterns
      })

      toast({
        title: "Success",
        description: "Study group created successfully!"
      })

      fetchStudyGroups()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create study group",
        variant: "destructive"
      })
    }
  }

  const handleJoinGroup = async (groupId: string) => {
    try {
      await communityAPI.joinGroup(groupId)

      toast({
        title: "Success",
        description: "Joined study group successfully!"
      })

      fetchStudyGroups()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join study group",
        variant: "destructive"
      })
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    try {
      await communityAPI.leaveGroup(groupId)

      toast({
        title: "Success",
        description: "Left study group successfully!"
      })

      fetchStudyGroups()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave study group",
        variant: "destructive"
      })
    }
  }

  // const handleCopyInviteCode = (inviteCode: string) => {
  //   navigator.clipboard.writeText(inviteCode)
  //   toast({
  //     title: "Copied!",
  //     description: "Invite code copied to clipboard"
  //   })
  // }

  const filteredGroups = (groups: StudyGroup[]) => {
    return groups.filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           group.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPatterns = filterTags.length === 0 || 
                             filterTags.some(tag => group.targetPatterns?.includes(tag))
      return matchesSearch && matchesPatterns
    }).sort((a, b) => {
      switch (sortBy) {
        case 'members':
          return (b.members?.length || 0) - (a.members?.length || 0)
        case 'activity':
          return new Date((b as any).updatedAt || 0).getTime() - 
                 new Date((a as any).updatedAt || 0).getTime()
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    )
  }

  // Real-time Activity Feed Component
  const GroupActivityFeed = ({ groupId }: { groupId: string }) => {
    const activities = groupActivities.get(groupId) || []
    
    return (
      <Card font="retro">
        <CardHeader>
          <CardTitle font="retro" className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Live Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {activities.map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-2 bg-muted/50 rounded text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span>{activity.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {activity.metadata?.achievements && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {activity.metadata.achievements.map((achievement, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
              {activities.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }

  // Group Statistics Dashboard
  const GroupStatsDashboard = ({ groupId }: { groupId: string }) => {
    const stats = groupStats.get(groupId)
    const group = data?.myGroups.find(g => g._id === groupId)
    
    if (!stats || !group) return null
    
    return (
      <Card font="retro">
        <CardHeader>
          <CardTitle font="retro" className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Group Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalProblems}</p>
              <p className="text-xs text-muted-foreground">Problems Solved</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalXP}</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.averageLevel.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avg Level</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Top Contributors</h4>
            {stats.mostActiveMembers.slice(0, 3).map((member, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="flex items-center space-x-2">
                  <Trophy className={`h-3 w-3 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-amber-600'}`} />
                  <span>{member.username}</span>
                </span>
                <span className="text-muted-foreground">{member.problemsSolved} problems</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Member Presence Indicators
  const MemberPresenceList = ({ groupId }: { groupId: string }) => {
    const presence = memberPresence.get(groupId) || []
    const group = data?.myGroups.find(g => g._id === groupId)
    
    if (!group) return null
    
    return (
      <Card font="retro">
        <CardHeader>
          <CardTitle font="retro" className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Members ({group.members.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {group.members.map((member) => {
              const memberPresenceInfo = presence.find(p => p.userId === member.userId)
              return (
                <div key={member.userId} className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {member.username?.slice(0, 2).toUpperCase() || 'UN'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                      memberPresenceInfo?.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    {member.level && (
                      <LevelBadge 
                        level={member.level} 
                        size="sm" 
                        className="absolute -top-1 -right-1"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm truncate">
                        {member.username || 'Unknown User'}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${roleColors[member.role]}`}
                      >
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {memberPresenceInfo?.isOnline ? (
                        memberPresenceInfo.currentActivity ? 
                          `${memberPresenceInfo.currentActivity.replace('_', ' ')}` : 
                          'Online'
                      ) : (
                        `Last seen ${memberPresenceInfo?.lastSeen ? 
                          new Date(memberPresenceInfo.lastSeen).toLocaleTimeString() : 
                          'unknown'}`
                      )}
                    </p>
                  </div>
                  {member.problemsSolved && (
                    <div className="text-right">
                      <p className="text-sm font-medium">{member.problemsSolved}</p>
                      <p className="text-xs text-muted-foreground">problems</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Connection Status Component
  const ConnectionStatus = () => (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
      {connectionStatus.isConnected ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" />
      )}
      <span>
        {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
        {connectionStatus.lastEventReceived && (
          ` • Last update: ${new Date(connectionStatus.lastEventReceived).toLocaleTimeString()}`
        )}
      </span>
    </div>
  )

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="retro text-3xl font-bold">Study Groups</h1>
          <p className="text-muted-foreground">
            Join or create study groups to learn together
          </p>
          <ConnectionStatus />
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Filters */}
      <Card font="retro">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input font="retro"
                placeholder="Search study groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="members">By Members</SelectItem>
                <SelectItem value="activity">By Activity</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Study Groups Tabs */}
      <Tabs font="retro" defaultValue="my-groups" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="my-groups">
            My Groups ({data.myGroups.length})
          </TabsTrigger>
          <TabsTrigger value="discover">
            Discover ({data.availableGroups.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({data.invitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-groups" className="space-y-6">
          {data.myGroups.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Group Cards */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredGroups(data.myGroups).map((group) => (
                    <StudyGroupCard
                      key={group._id}
                      group={group}
                      isJoined={true}
                      onLeave={handleLeaveGroup}
                      onManage={(id) => {
                        setSelectedGroupId(selectedGroupId === id ? null : id)
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Real-time Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {selectedGroupId ? (
                  <>
                    <GroupActivityFeed groupId={selectedGroupId} />
                    <GroupStatsDashboard groupId={selectedGroupId} />
                    <MemberPresenceList groupId={selectedGroupId} />
                  </>
                ) : (
                  <Card font="retro">
                    <CardContent className="p-6 text-center">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click "Manage" on a group to see live activity
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="retro text-lg font-semibold mb-2">No study groups yet</h3>
              <p className="text-muted-foreground mb-4">
                Create or join a study group to start learning together
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Group
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="discover" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups(data.availableGroups).map((group) => (
              <StudyGroupCard
                key={group._id}
                group={group}
                isJoined={false}
                onJoin={handleJoinGroup}
              />
            ))}
          </div>

          {filteredGroups(data.availableGroups).length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="retro text-lg font-semibold mb-2">No groups found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or create a new group
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          {data.invitations.length > 0 ? (
            <div className="space-y-4">
              {data.invitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="retro font-semibold">{invitation.group.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Invited by {invitation.invitedBy} • {new Date(invitation.invitedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleJoinGroup(invitation.group._id)}
                        >
                          Accept
                        </Button>
                        <Button variant="outline" size="sm">
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="retro text-lg font-semibold mb-2">No invitations</h3>
              <p className="text-muted-foreground">
                You'll see group invitations here when you receive them
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateGroup}
      />
    </div>
  )
}

export default StudyGroups
