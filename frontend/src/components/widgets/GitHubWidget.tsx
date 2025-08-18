import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { widgetsAPI } from '@/lib/api'
import { GitHubStats } from '@/types'
import { Github, GitFork, Users, TrendingUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GitHubWidgetProps {
  handle: string
}

export default function GitHubWidget({ handle }: GitHubWidgetProps) {
  const [stats, setStats] = useState<GitHubStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError('')
      const data = await widgetsAPI.getGitHubStats(handle)
      setStats(data)
    } catch (error: any) {
      console.error('Failed to fetch GitHub stats:', error)
      setError('Failed to load GitHub data')
      // Set mock data for demo
      setStats({
        handle,
        publicRepos: 42,
        followers: 123,
        following: 89,
        contributions: 1247,
        streak: 15,
        languages: {
          'TypeScript': 45,
          'Python': 25,
          'JavaScript': 15,
          'Go': 10,
          'Other': 5
        },
        recentActivity: [
          { type: 'push', repo: 'questcoder', date: '2024-01-15', description: 'Added new pattern tracking feature' },
          { type: 'pull_request', repo: 'open-source-project', date: '2024-01-14', description: 'Fixed authentication bug' },
        ]
      })
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
              <Github className="h-5 w-5" />
              <CardTitle className="text-lg">GitHub</CardTitle>
            </div>
            <div className="animate-spin">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
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
              <Github className="h-5 w-5" />
              <CardTitle className="text-lg">GitHub</CardTitle>
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

  const topLanguages = Object.entries(stats.languages)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <CardTitle className="text-lg">GitHub</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>@{stats.handle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <GitFork className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{stats.publicRepos}</div>
              <div className="text-xs text-muted-foreground">Repositories</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{stats.followers}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{stats.contributions}</div>
              <div className="text-xs text-muted-foreground">Contributions</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{stats.streak} days</div>
              <div className="text-xs text-muted-foreground">Streak</div>
            </div>
          </div>
        </div>

        {/* Top Languages */}
        <div>
          <h4 className="text-sm font-medium mb-2">Top Languages</h4>
          <div className="space-y-2">
            {topLanguages.map(([language, percentage]) => (
              <div key={language} className="flex items-center justify-between">
                <span className="text-sm">{language}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded-full">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">
                    {percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
          <div className="space-y-2">
            {stats.recentActivity.slice(0, 2).map((activity, index) => (
              <div key={index} className="text-sm border-l-2 pl-2 border-muted">
                <div className="flex items-center gap-1">
                  <span className="font-medium capitalize">{activity.type.replace('_', ' ')}</span>
                  <span className="text-muted-foreground">in</span>
                  <span className="font-medium">{activity.repo}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {activity.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
