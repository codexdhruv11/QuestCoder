import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { widgetsAPI } from '@/lib/api'
import { LeetCodeStats } from '@/types'
import { Code, TrendingUp, Award, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/8bit/button'
import '@/components/ui/8bit/styles/retro.css'

interface LeetCodeWidgetProps {
  handle: string
}

export default function LeetCodeWidget({ handle }: LeetCodeWidgetProps) {
  const [stats, setStats] = useState<LeetCodeStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError('')
      const data = await widgetsAPI.getLeetCodeStats(handle)
      setStats(data)
    } catch (error: any) {
      console.error('Failed to fetch LeetCode stats:', error)
      setError('Failed to load LeetCode data')
      // Set mock data for demo
      setStats({
        handle,
        totalSolved: 245,
        easySolved: 134,
        mediumSolved: 87,
        hardSolved: 24,
        acceptanceRate: 73.5,
        ranking: 125432,
        reputation: 1567,
        recentSubmissions: [
          { id: '1', title: 'Two Sum', status: 'Accepted', timestamp: '2024-01-15', language: 'Python' },
          { id: '2', title: 'Add Two Numbers', status: 'Accepted', timestamp: '2024-01-14', language: 'TypeScript' },
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
      <Card font="retro">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-orange-500" />
              <CardTitle font="retro" className="retro text-lg">LeetCode</CardTitle>
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
      <Card font="retro">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-orange-500" />
              <CardTitle font="retro" className="retro text-lg">LeetCode</CardTitle>
            </div>
            <Button font="retro"
              variant="ghost"
              size="sm"
              onClick={fetchStats}
            >
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
            <Code className="h-5 w-5 text-orange-500" />
            <CardTitle font="retro" className="text-lg">LeetCode</CardTitle>
          </div>
          <Button font="retro"
            variant="ghost"
            size="sm"
            onClick={fetchStats}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription font="retro">@{stats.handle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Problems */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Problems Solved</span>
            <span className="text-2xl font-bold">{stats.totalSolved}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
              <div className="font-semibold text-green-600 dark:text-green-400">{stats.easySolved}</div>
              <div className="text-xs text-muted-foreground">Easy</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
              <div className="font-semibold text-yellow-600 dark:text-yellow-400">{stats.mediumSolved}</div>
              <div className="text-xs text-muted-foreground">Medium</div>
            </div>
            <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded">
              <div className="font-semibold text-red-600 dark:text-red-400">{stats.hardSolved}</div>
              <div className="text-xs text-muted-foreground">Hard</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{stats.acceptanceRate}%</div>
              <div className="text-xs text-muted-foreground">Acceptance</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">#{stats.ranking.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Ranking</div>
            </div>
          </div>
        </div>

        {/* Recent Submissions */}
        <div>
          <h4 className="text-sm font-medium mb-2">Recent Submissions</h4>
          <div className="space-y-2">
            {stats.recentSubmissions.slice(0, 3).map((submission) => (
              <div key={submission.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    submission.status === 'Accepted' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="font-medium">{submission.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">{submission.language}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
