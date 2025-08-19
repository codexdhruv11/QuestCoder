import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { LevelBadge } from '@/components/gamification/LevelIndicator'
import { communityAPI } from '@/lib/api'
import { useSocketRoom, useSocketSubscription } from '@/hooks/useSocket'
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  Crown,
  Settings,
  UserPlus,
  UserMinus,
  Copy,
  ExternalLink,
  MessageCircle,
  BarChart3,
  Trophy,
  Target,
  Clock,
  Star,
  Bookmark,
  Share2
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
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold line-clamp-1">
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
                      <Badge className={`text-xs ${roleColors[member.role]}`}>
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
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter group name"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your study group..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="privacy">Privacy</Label>
            <Select 
              value={formData.privacy} 
              onValueChange={(value) => setFormData({ ...formData, privacy: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="targetPatterns">Target Patterns (comma separated)</Label>
            <Input
              id="targetPatterns"
              value={formData.targetPatterns}
              onChange={(e) => setFormData({ ...formData, targetPatterns: e.target.value })}
              placeholder="Two Pointers, Sliding Window, Dynamic Programming"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Group</Button>
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
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('members')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchStudyGroups()
  }, [])

  // Note: Group-specific rooms should be joined when viewing individual groups
  // Global group discovery relies on REST polling for now

  // Listen for group activity updates with debounced refresh
  const debouncedRefresh = React.useRef<NodeJS.Timeout>()
  useSocketSubscription('group_activity', (activityData: { groupId: string; type: string; userId?: string }) => {
    // Clear existing timeout
    if (debouncedRefresh.current) {
      clearTimeout(debouncedRefresh.current)
    }
    
    // Debounce refresh to avoid API spam
    debouncedRefresh.current = setTimeout(() => {
      fetchStudyGroups()
    }, 1000) // 1 second debounce
  })

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

  const handleCopyInviteCode = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode)
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard"
    })
  }

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
          return new Date(b.updatedAt || 0).getTime() - 
                 new Date(a.updatedAt || 0).getTime()
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
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

  if (!data) return null

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Study Groups</h1>
          <p className="text-muted-foreground">
            Join or create study groups to learn together
          </p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
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
      <Tabs defaultValue="my-groups" className="space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups(data.myGroups).map((group) => (
                <StudyGroupCard
                  key={group._id}
                  group={group}
                  isJoined={true}
                  onLeave={handleLeaveGroup}
                  onManage={(id) => console.log('Manage group:', id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No study groups yet</h3>
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
              <h3 className="text-lg font-semibold mb-2">No groups found</h3>
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
                          <h3 className="font-semibold">{invitation.group.name}</h3>
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
              <h3 className="text-lg font-semibold mb-2">No invitations</h3>
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
