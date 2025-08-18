import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { LevelBadge } from '@/components/gamification/LevelIndicator'
import { CompactBadgeList } from '@/components/gamification/BadgeDisplay'
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
  Calendar,
  Star,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Minus
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

const timeFrames = {
  'weekly': 'This Week',
  'monthly': 'This Month',
  'allTime': 'All Time'
}

const leaderboardTypes = {
  'xp': { label: 'Experience Points', icon: Zap, color: 'text-yellow-600' },
  'problemsSolved': { label: 'Problems Solved', icon: Target, color: 'text-blue-600' },
  'streak': { label: 'Current Streak', icon: Flame, color: 'text-orange-600' }
}

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
                <CompactBadgeList badges={entry.badges} maxVisible={3} />
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
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeFrame, setTimeFrame] = useState('monthly')
  const [selectedGroup, setSelectedGroup] = useState('global')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchLeaderboards()
    getCurrentUser()
  }, [timeFrame, selectedGroup])

  const getCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const user = await response.json()
        setCurrentUserId(user.id)
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  const fetchLeaderboards = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        timeFrame,
        ...(selectedGroup !== 'global' && { groupId: selectedGroup })
      })

      const response = await fetch(`/api/gamification/leaderboards?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch leaderboards')

      const leaderboardData = await response.json()
      setData(leaderboardData)
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

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
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
    : data.groups[selectedGroup]

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leaderboards</h1>
          <p className="text-muted-foreground">
            Compete with fellow coders and track your ranking
          </p>
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

      {/* Leaderboard Tabs */}
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
                      currentUser={currentUserId || undefined}
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
  )
}

export default Leaderboards
