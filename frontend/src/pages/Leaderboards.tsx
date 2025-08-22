import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { LevelBadge } from '@/components/gamification/LevelIndicator'
import { CompactBadgeList } from '@/components/gamification/BadgeDisplay'
import { gamificationAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/contexts/SocketContext'
import { useSocketSubscription } from '@/hooks/useSocket'
import { 
  Trophy, 
  Medal, 
  Crown, 
  Zap, 
  Target, 
  Flame, 
  Users, 
  Search,
  Filter,
  Star,
  ChevronUp,
  ChevronDown,
  Minus,
  Activity,
  TrendingUp,
  Bell,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react'

interface LeaderboardEntry {
  userId: string
  username: string
  avatar?: string
  rank: number
  previousRank?: number
  level: number
  xp: number
  problemsSolved: number
  currentStreak: number
  badges: {
    id: string
    name: string
    iconUrl?: string
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  }[]
  studyGroups?: string[]
  lastActive: Date
}

interface LeaderboardData {
  global: {
    xp: LeaderboardEntry[]
    problemsSolved: LeaderboardEntry[]
    streak: LeaderboardEntry[]
  }
  groups: {
    [groupId: string]: {
      name: string
      xp: LeaderboardEntry[]
      problemsSolved: LeaderboardEntry[]
      streak: LeaderboardEntry[]
    }
  }
  userRank: {
    xp: number
    problemsSolved: number
    streak: number
  }
  timeFrame: string
}

interface ActivityFeedItem {
  id: string
  userId: string
  username: string
  type: 'level_up' | 'badge_unlock' | 'streak_milestone' | 'rank_change' | 'problem_solve'
  message: string
  timestamp: string
  metadata?: {
    level?: number
    badgeName?: string
    streak?: number
    rankChange?: number
    problemCount?: number
  }
}

interface LiveStats {
  totalProblemsToday: number
  activeUsersCount: number
  topPerformers: {
    username: string
    achievement: string
    time: string
  }[]
  recentActivity: ActivityFeedItem[]
}

const timeFrames = {
  'weekly': 'This Week',
  'monthly': 'This Month',
  'allTime': 'All Time'
}

// Map UI timeframe values to API values
const timeFrameMapping = {
  'weekly': 'weekly',
  'monthly': 'monthly', 
  'allTime': 'all'
}

const leaderboardTypes = {
  'xp': { label: 'Experience Points', icon: Zap, color: 'text-yellow-600' },
  'problemsSolved': { label: 'Problems Solved', icon: Target, color: 'text-blue-600' },
  'streak': { label: 'Current Streak', icon: Flame, color: 'text-orange-600' }
}

// Map backend leaderboard types to UI tab keys (unused but kept for reference)

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-6 w-6 text-yellow-500" />
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />
    case 3:
      return <Trophy className="h-6 w-6 text-amber-600" />
    default:
      return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
  }
}

const getRankChange = (current: number, previous?: number) => {
  if (!previous) return null
  
  const change = previous - current
  if (change > 0) {
    return <ChevronUp className="h-4 w-4 text-green-600" />
  } else if (change < 0) {
    return <ChevronDown className="h-4 w-4 text-red-600" />
  } else {
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }
}

const LeaderboardEntry: React.FC<{
  entry: LeaderboardEntry
  type: keyof typeof leaderboardTypes
  index: number
  currentUser?: string
}> = ({ entry, type, index, currentUser }) => {
  const isCurrentUser = entry.userId === currentUser
  const TypeIcon = leaderboardTypes[type].icon

  const getValue = () => {
    switch (type) {
      case 'xp':
        return entry.xp.toLocaleString()
      case 'problemsSolved':
        return entry.problemsSolved.toString()
      case 'streak':
        return `${entry.currentStreak} days`
      default:
        return '0'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
        isCurrentUser ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center space-x-4">
        {/* Rank */}
        <div className="flex items-center space-x-2 min-w-[60px]">
          {getRankIcon(entry.rank)}
          {getRankChange(entry.rank, entry.previousRank)}
        </div>

        {/* Avatar and User Info */}
        <div className="flex items-center space-x-3 flex-1">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={entry.avatar} alt={entry.username} />
              <AvatarFallback>
                {entry.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <LevelBadge 
              level={entry.level} 
              size="sm" 
              className="absolute -bottom-1 -right-1"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className={`font-medium truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                {entry.username}
                {isCurrentUser && <span className="text-xs text-primary ml-1">(You)</span>}
              </p>
              {entry.badges.length > 0 && (
                <CompactBadgeList badges={entry.badges.map((b: any) => ({ ...b, description: b.description || "", category: b.category || "general", isUnlocked: true }))} maxVisible={3} />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Level {entry.level} • Last active {new Date(entry.lastActive).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Score */}
        <div className="text-right">
          <div className="flex items-center space-x-2">
            <TypeIcon className={`h-4 w-4 ${leaderboardTypes[type].color}`} />
            <span className="font-bold">{getValue()}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {leaderboardTypes[type].label}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

const Leaderboards: React.FC = () => {
  const { user } = useAuth()
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeFrame, setTimeFrame] = useState('monthly')
  const [selectedGroup, setSelectedGroup] = useState('global')
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()
  
  // Real-time state
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([])
  const [liveStats, setLiveStats] = useState<LiveStats>({
    totalProblemsToday: 0,
    activeUsersCount: 0,
    topPerformers: [],
    recentActivity: []
  })
  const [, setRankChanges] = useState<Map<string, { oldRank: number; newRank: number; type: string }>>(new Map())
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'success' | 'info' | 'warning' }[]>([])
  
  // Connection status from socket context
  const { connectionStatus, recentProgressUpdates, groupActivityFeed, leaderboardChanges } = useSocket()
  
  // Refs for performance optimization

  useEffect(() => {
    fetchLeaderboards()
  }, [timeFrame, selectedGroup])

  // Subscribe to all leaderboard types for real-time updates
  const { subscribeLeaderboard, unsubscribeLeaderboard } = useSocket()
  
  useEffect(() => {
    // Subscribe to all three leaderboard types
    subscribeLeaderboard('xp')
    subscribeLeaderboard('problems')
    subscribeLeaderboard('streak')

    return () => {
      // Unsubscribe on cleanup
      unsubscribeLeaderboard('xp')
      unsubscribeLeaderboard('problems')
      unsubscribeLeaderboard('streak')
    }
  }, [subscribeLeaderboard, unsubscribeLeaderboard])

  // Real-time leaderboard updates with animations
  const debouncedRefresh = React.useRef<NodeJS.Timeout>()
  useSocketSubscription('leaderboard_update', (updateData: { 
    type: string; 
    updatedEntries?: Array<{ userId: string; username: string; rank: number; score: number; previousRank?: number }>
    groupId?: string 
  }) => {
    setLastUpdate(new Date().toISOString())
    
    // Show live rank indicators
    if (updateData.updatedEntries) {
      updateData.updatedEntries.forEach(entry => {
        if (entry.previousRank && entry.previousRank !== entry.rank) {
          setRankChanges(prev => new Map(prev.set(entry.userId, {
            oldRank: entry.previousRank!,
            newRank: entry.rank,
            type: updateData.type
          })))
          
          // Clear rank change after animation
          setTimeout(() => {
            setRankChanges(prev => {
              const newMap = new Map(prev)
              newMap.delete(entry.userId)
              return newMap
            })
          }, 5000)
        }
      })
    }
    
    // Clear existing timeout
    if (debouncedRefresh.current) {
      clearTimeout(debouncedRefresh.current)
    }
    
    // Debounce refresh to avoid API spam
    debouncedRefresh.current = setTimeout(() => {
      // Only refresh if the update is for the current view
      if (selectedGroup === 'global') {
        fetchLeaderboards()
      } else if (updateData.groupId === selectedGroup) {
        fetchLeaderboards()
      }
    }, 1000) // 1 second debounce
  })

  // Real-time user rank updates
  useSocketSubscription('rank_update', (rankData: {
    leaderboardType: 'xp' | 'problems' | 'streak'
    newRank: number
    previousRank?: number
    score: number
    username: string
  }) => {
    if (rankData.username === user?.username) {
      // Show notification for current user rank changes
      if (rankData.previousRank && rankData.previousRank !== rankData.newRank) {
        const improvement = rankData.previousRank - rankData.newRank
        const message = improvement > 0 
          ? `🎉 You moved up ${improvement} ranks in ${rankData.leaderboardType}! Now #${rankData.newRank}`
          : `You moved down ${Math.abs(improvement)} ranks in ${rankData.leaderboardType}. Now #${rankData.newRank}`
        
        addNotification({
          id: `rank_${Date.now()}`,
          message,
          type: improvement > 0 ? 'success' : 'warning'
        })
      }
    }
  })

  // Process progress updates for activity feed
  useEffect(() => {
    if (recentProgressUpdates.length > 0) {
      const newActivityItems: ActivityFeedItem[] = recentProgressUpdates.slice(-10).map(update => ({
        id: `progress_${update.userId}_${update.timestamp}`,
        userId: update.userId,
        username: update.username || 'Unknown User',
        type: 'problem_solve',
        message: `Solved a problem! Completion rate: ${update.progressData.completionRate}%`,
        timestamp: update.timestamp,
        metadata: {
          problemCount: update.progressData.solvedCount
        }
      }))
      
      setActivityFeed(prev => [...prev, ...newActivityItems].slice(-50))
    }
  }, [recentProgressUpdates])

  // Process group updates for activity feed  
  useEffect(() => {
    if (groupActivityFeed.length > 0) {
      const newActivityItems: ActivityFeedItem[] = groupActivityFeed.slice(-10).map(update => {
        let message = `${update.username} solved "${update.progressData.problemName}"`
        if (update.progressData.achievements?.length) {
          message += ` and ${update.progressData.achievements.join(', ')}`
        }
        
        return {
          id: `group_${update.userId}_${update.timestamp}`,
          userId: update.userId,
          username: update.username,
          type: 'problem_solve',
          message,
          timestamp: update.timestamp,
          metadata: {
            problemCount: update.progressData.solvedCount
          }
        }
      })
      
      setActivityFeed(prev => [...prev, ...newActivityItems].slice(-50))
    }
  }, [groupActivityFeed])

  // Handle leaderboard changes from socket context
  useEffect(() => {
    if (leaderboardChanges.length > 0) {
      setLastUpdate(new Date().toISOString())
      
      // Update live stats based on leaderboard changes
      const latestChange = leaderboardChanges[leaderboardChanges.length - 1]
      if (latestChange && latestChange.updatedEntries) {
        setLiveStats(prev => ({
          ...prev,
          topPerformers: latestChange.updatedEntries!.slice(0, 3).map(entry => ({
            username: entry.username,
            achievement: `#${entry.rank} in ${latestChange.type}`,
            time: new Date(latestChange.timestamp).toLocaleTimeString()
          }))
        }))
      }
    }
  }, [leaderboardChanges])

  // Notification management
  const addNotification = useCallback((notification: { id: string; message: string; type: 'success' | 'info' | 'warning' }) => {
    setNotifications(prev => [...prev, notification])
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 5000)
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const fetchLeaderboards = async () => {
    setLoading(true)
    try {
      // Map functions for backend entry structure
      const mapXp = (e: any): LeaderboardEntry => ({
        userId: e.user._id,
        username: e.user.username,
        avatar: e.user.avatar,
        rank: e.rank,
        previousRank: e.previousRank || 0,
        level: e.metadata?.level ?? 1,
        xp: e.score,
        problemsSolved: 0,
        currentStreak: 0,
        badges: [],
        lastActive: e.metadata?.lastActive ?? new Date().toISOString(),
      })
      
      const mapProblems = (e: any): LeaderboardEntry => ({
        userId: e.user._id,
        username: e.user.username,
        avatar: e.user.avatar,
        rank: e.rank,
        previousRank: e.previousRank || e.rank,
        level: e.metadata?.level ?? e.metadata?.currentLevel ?? 1,
        xp: 0,
        problemsSolved: e.score,
        currentStreak: e.metadata?.streak ?? 0,
        badges: [],
        lastActive: e.metadata?.lastActive ?? new Date().toISOString(),
      })
      
      const mapStreak = (e: any): LeaderboardEntry => ({
        userId: e.user._id,
        username: e.user.username,
        avatar: e.user.avatar,
        rank: e.rank,
        previousRank: e.rank,
        level: e.metadata?.level ?? e.metadata?.currentLevel ?? 1,
        xp: 0,
        problemsSolved: 0,
        currentStreak: e.score,
        badges: [],
        lastActive: e.metadata?.lastActive ?? new Date().toISOString(),
      })

      if (selectedGroup !== 'global') {
        // Fetch group-specific leaderboard
        const mappedTimeframe = timeFrameMapping[timeFrame as keyof typeof timeFrameMapping]
        const response = await gamificationAPI.getLeaderboard(
          'xp', // Default to XP for group leaderboards
          selectedGroup,
          mappedTimeframe
        )
        
        // Map entries using the XP mapper - response contains the leaderboard data
        const leaderboardEntries = (response?.entries || []).map(mapXp)
        const currentUserRank = response?.currentUserRank || 0
        
        const leaderboardData = {
          global: {
            xp: [],
            problemsSolved: [],
            streak: []
          },
          groups: {
            [selectedGroup]: {
              name: response?.groupName || selectedGroup,
              xp: leaderboardEntries,
              problemsSolved: [],
              streak: []
            }
          },
          userRank: {
            xp: currentUserRank,
            problemsSolved: 0,
            streak: 0
          },
          timeFrame
        }
        
        setData(leaderboardData)
      } else {
        // Fetch all three leaderboard types for global view
        const mappedTimeframe = timeFrameMapping[timeFrame as keyof typeof timeFrameMapping]
        const [xpResponse, problemsResponse, streakResponse] = await Promise.all([
          gamificationAPI.getLeaderboard('xp', undefined, mappedTimeframe),
          gamificationAPI.getLeaderboard('problems', undefined, mappedTimeframe),
          gamificationAPI.getLeaderboard('streak', undefined, mappedTimeframe)
        ])
        
        const leaderboardData = {
          global: {
            xp: (xpResponse?.entries || []).map(mapXp),
            problemsSolved: (problemsResponse?.entries || []).map(mapProblems),
            streak: (streakResponse?.entries || []).map(mapStreak)
          },
          groups: {},
          userRank: {
            xp: xpResponse?.currentUserRank || 0,
            problemsSolved: problemsResponse?.currentUserRank || 0,
            streak: streakResponse?.currentUserRank || 0
          },
          timeFrame
        }
        
        setData(leaderboardData)
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error)
      toast({
        title: "Error",
        description: "Failed to load leaderboards",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredEntries = (entries: LeaderboardEntry[]) => {
    if (!searchTerm) return entries
    return entries.filter(entry => 
      entry.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  // Connection Status Component
  const ConnectionStatusIndicator = () => {
    const getStatusIcon = () => {
      switch (connectionStatus.connectionQuality) {
        case 'excellent':
          return <Wifi className="h-4 w-4 text-green-500" />
        case 'good':
          return <Wifi className="h-4 w-4 text-yellow-500" />
        case 'poor':
          return <WifiOff className="h-4 w-4 text-orange-500" />
        default:
          return <AlertCircle className="h-4 w-4 text-red-500" />
      }
    }

    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        {getStatusIcon()}
        <span>
          {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
          {lastUpdate && ` • Last update: ${new Date(lastUpdate).toLocaleTimeString()}`}
        </span>
      </div>
    )
  }

  // Activity Feed Component
  const ActivityFeed = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Live Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {activityFeed.slice(-10).map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-2 bg-muted/50 rounded text-sm"
              >
                <div className="flex items-center justify-between">
                  <span>{item.message}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </motion.div>
            ))}
            {activityFeed.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No recent activity
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )

  // Live Statistics Component  
  const LiveStatistics = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Live Statistics</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{liveStats.totalProblemsToday}</p>
            <p className="text-xs text-muted-foreground">Problems solved today</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{liveStats.activeUsersCount}</p>
            <p className="text-xs text-muted-foreground">Active users</p>
          </div>
        </div>
        
        {liveStats.topPerformers.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Top Performers</h4>
            <div className="space-y-1">
              {liveStats.topPerformers.map((performer, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>{performer.username}</span>
                  <span className="text-muted-foreground">{performer.achievement}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Notification System
  const NotificationSystem = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className={`p-4 rounded-lg shadow-lg min-w-[300px] ${
              notification.type === 'success' ? 'bg-green-100 border-green-500' :
              notification.type === 'warning' ? 'bg-yellow-100 border-yellow-500' :
              'bg-blue-100 border-blue-500'
            } border-l-4`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {notification.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                {notification.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                {notification.type === 'info' && <Bell className="h-4 w-4 text-blue-600" />}
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeNotification(notification.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!data) return null

  const currentLeaderboard = selectedGroup === 'global' 
    ? data.global 
    : data.groups[selectedGroup] || { xp: [], problemsSolved: [], streak: [] }

  return (
    <div className="space-y-6">
      {/* Notification System */}
      <NotificationSystem />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leaderboards</h1>
          <p className="text-muted-foreground">
            Compete with fellow coders and track your ranking
          </p>
          <ConnectionStatusIndicator />
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeFrame} onValueChange={setTimeFrame}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(timeFrames).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* User Rank Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your XP Rank</p>
                  <p className="text-2xl font-bold">#{data.userRank.xp}</p>
                  <p className="text-xs text-muted-foreground">Experience Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Problems Rank</p>
                  <p className="text-2xl font-bold">#{data.userRank.problemsSolved}</p>
                  <p className="text-xs text-muted-foreground">Problems Solved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Streak Rank</p>
                  <p className="text-2xl font-bold">#{data.userRank.streak}</p>
                  <p className="text-xs text-muted-foreground">Current Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4" />
                    <span>Global Leaderboard</span>
                  </div>
                </SelectItem>
                {Object.entries(data.groups).map(([groupId, group]) => (
                  <SelectItem key={groupId} value={groupId}>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>{group.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Leaderboard Tabs - Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="xp" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="xp" className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Experience Points</span>
              </TabsTrigger>
              <TabsTrigger value="problemsSolved" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Problems Solved</span>
              </TabsTrigger>
              <TabsTrigger value="streak" className="flex items-center space-x-2">
                <Flame className="h-4 w-4" />
                <span>Streak</span>
              </TabsTrigger>
            </TabsList>

        {(['xp', 'problemsSolved', 'streak'] as const).map((type) => (
          <TabsContent key={type} value={type} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {React.createElement(leaderboardTypes[type].icon, { 
                    className: `h-5 w-5 ${leaderboardTypes[type].color}` 
                  })}
                  <span>{leaderboardTypes[type].label} Leaderboard</span>
                  {selectedGroup !== 'global' && (
                    <Badge variant="secondary">
                      {data.groups[selectedGroup]?.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <AnimatePresence mode="wait">
                  {filteredEntries(currentLeaderboard[type]).map((entry, index) => (
                    <LeaderboardEntry
                      key={entry.userId}
                      entry={entry}
                      type={type}
                      index={index}
                      currentUser={(user as any)?.id}
                    />
                  ))}
                </AnimatePresence>

                {filteredEntries(currentLeaderboard[type]).length === 0 && (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No users found matching your search.' : 'No leaderboard data available.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            </TabsContent>
          ))}
          </Tabs>
        </div>
        
        {/* Sidebar - Activity Feed and Statistics */}
        <div className="lg:col-span-1 space-y-6">
          <ActivityFeed />
          <LiveStatistics />
        </div>
      </div>
    </div>
  )
}

export default Leaderboards
