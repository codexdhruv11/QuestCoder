import '@/components/ui/8bit/styles/retro.css'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { widgetsAPI } from '@/lib/api'
import { StreakData, DailyActivity } from '@/types'
import { Flame, Calendar, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/8bit/button'

export default function StreakTracker() {
  const [streakData, setStreakData] = useState<StreakData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStreakData = async () => {
    try {
      setIsLoading(true)
      setError('')
      const data = await widgetsAPI.getStreak()
      
      // Adapt backend data format to frontend StreakData type
      const dailyActivities = data.streakCalendar ? 
        Object.entries(data.streakCalendar).map(([date, active]) => ({
          date,
          platforms: active ? ['QuestCoder'] : [],
          problemsSolved: active ? 1 : 0,
        })) : []
      
      setStreakData({
        userId: data.userId || 'current-user',
        currentStreak: data.currentStreak || 0,
        longestStreak: data.longestStreak || 0,
        lastActivityDate: data.lastActivity || new Date().toISOString().split('T')[0],
        dailyActivities
      })
    } catch (error: any) {
      console.error('Failed to fetch streak data:', error)
      setError('Failed to load streak data')
      // Set mock data for demo
      setStreakData({
        userId: 'current-user',
        currentStreak: 7,
        longestStreak: 23,
        lastActivityDate: '2024-01-15',
        dailyActivities: generateMockActivity()
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStreakData()
  }, [])

  // Generate mock activity data for the last 30 days
  function generateMockActivity(): DailyActivity[] {
    const activities: DailyActivity[] = []
    const today = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateString = date.toISOString().split('T')[0]
      
      // Simulate some activity pattern (70% chance of activity)
      if (Math.random() > 0.3 && dateString) {
        activities.push({
          date: dateString,
          platforms: ['LeetCode', 'GitHub'].filter(() => Math.random() > 0.5),
          problemsSolved: Math.floor(Math.random() * 5) + 1,
        })
      }
    }
    
    return activities
  }

  const renderCalendar = () => {
    if (!streakData?.dailyActivities) return null

    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 29)

    const calendarDays = []
    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      const dateString = currentDate.toISOString().split('T')[0]
      
      const activity = streakData.dailyActivities.find(a => a.date === dateString)
      const intensity = activity ? Math.min(activity.problemsSolved / 3, 1) : 0
      
      calendarDays.push({
        date: dateString,
        day: currentDate.getDate(),
        activity,
        intensity
      })
    }

    return (
      <div className="grid grid-cols-10 gap-1">
        {calendarDays.map((day) => (
          <div
            key={day.date}
            className={`w-6 h-6 rounded-sm border ${
              day.intensity > 0
                ? `bg-primary/20 border-primary/30`
                : 'bg-muted border-muted'
            }`}
            style={{
              backgroundColor: day.intensity > 0 
                ? `hsl(var(--primary) / ${0.2 + day.intensity * 0.6})`
                : undefined
            }}
            title={`${day.date}: ${day.activity?.problemsSolved || 0} problems`}
          />
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card font="retro">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <CardTitle font="retro" className="retro text-lg">Streak Tracker</CardTitle>
            </div>
            <div className="animate-spin">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-16 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !streakData) {
    return (
      <Card font="retro">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <CardTitle font="retro" className="retro text-lg">Streak Tracker</CardTitle>
            </div>
            <Button font="retro" variant="ghost" size="sm" onClick={fetchStreakData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card font="retro">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <CardTitle font="retro" className="retro text-lg">Streak Tracker</CardTitle>
          </div>
          <Button font="retro" variant="ghost" size="sm" onClick={fetchStreakData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription font="retro">
          Your daily coding activity across all platforms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {streakData.currentStreak}
            </div>
            <div className="text-xs text-muted-foreground">Current Streak</div>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {streakData.longestStreak}
            </div>
            <div className="text-xs text-muted-foreground">Longest Streak</div>
          </div>
        </div>

        {/* Activity Calendar */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h4 className="retro text-sm font-medium">Last 30 Days</h4>
          </div>
          {renderCalendar()}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-muted" />
              <div className="w-3 h-3 rounded-sm bg-primary/20" />
              <div className="w-3 h-3 rounded-sm bg-primary/40" />
              <div className="w-3 h-3 rounded-sm bg-primary/60" />
              <div className="w-3 h-3 rounded-sm bg-primary/80" />
            </div>
            <span>More</span>
          </div>
        </div>

        {/* Recent Activity Summary */}
        <div>
          <h4 className="text-sm font-medium mb-2">This Week</h4>
          <div className="text-sm text-muted-foreground">
            {streakData.dailyActivities.slice(-7).reduce((total, day) => total + day.problemsSolved, 0)} problems solved
            across {new Set(streakData.dailyActivities.slice(-7).flatMap(day => day.platforms)).size} platforms
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
