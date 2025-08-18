import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { widgetsAPI } from '@/lib/api'
import { Trophy, Award, Activity, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface HackerEarthStats {
  username: string
  rating: number
  problems: number
  submissions: number
  badges: string[]
  recentActivity: Array<{
    date: string
    type: string
    title: string
  }>
  message?: string
}

interface HackerEarthWidgetProps {
  handle: string
}

export default function HackerEarthWidget({ handle }: HackerEarthWidgetProps) {
  const [stats, setStats] = useState<HackerEarthStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    if (!handle) {
      setError('No HackerEarth handle configured')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError('')
      const data = await widgetsAPI.getHackerEarthStats(handle)
      setStats(data)
    } catch (error: any) {
      console.error('Failed to fetch HackerEarth stats:', error)
      setError('Failed to load HackerEarth stats')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [handle])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg">HackerEarth</CardTitle>
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

  if (error || !stats) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg">HackerEarth</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchStats}>
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">HackerEarth</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>@{stats.username}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.rating}
            </div>
            <div className="text-xs text-muted-foreground">Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.problems}</div>
            <div className="text-xs text-muted-foreground">Problems</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.submissions}</div>
            <div className="text-xs text-muted-foreground">Submissions</div>
          </div>
        </div>

        {/* Badges */}
        {stats.badges && stats.badges.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Badges</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.badges.map((badge, index) => (
                <Badge key={index} variant="secondary">
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {stats.recentActivity && stats.recentActivity.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Recent Activity</h4>
            </div>
            <div className="space-y-2">
              {stats.recentActivity.slice(0, 3).map((activity, index) => (
                <div key={index} className="text-xs">
                  <div className="font-medium">{activity.title}</div>
                  <div className="text-muted-foreground">
                    {activity.type} • {new Date(activity.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message if placeholder */}
        {stats.message && (
          <div className="text-xs text-muted-foreground italic">
            {stats.message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
