import '@/components/ui/8bit/styles/retro.css'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { widgetsAPI } from '@/lib/api'
import { CodeforcesStats } from '@/types'
import { Trophy, TrendingUp, Calendar, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/8bit/button'

interface CodeforcesWidgetProps {
  handle: string
}

export default function CodeforcesWidget({ handle }: CodeforcesWidgetProps) {
  const [stats, setStats] = useState<CodeforcesStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError('')
      const data = await widgetsAPI.getCodeforcesStats(handle)
      setStats(data)
    } catch (error: any) {
      console.error('Failed to fetch Codeforces stats:', error)
      setError('Failed to load Codeforces data')
      // Set mock data for demo
      setStats({
        handle,
        rating: 1567,
        maxRating: 1678,
        rank: 'Expert',
        maxRank: 'Candidate Master',
        contestsParticipated: 23,
        problemsSolved: 156,
        recentContests: [
          { id: '1', name: 'Codeforces Round #912', rank: 245, ratingChange: +32, date: '2024-01-15' },
          { id: '2', name: 'Educational Round #161', rank: 178, ratingChange: -18, date: '2024-01-10' },
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [handle])

  const getRankColor = (rank: string) => {
    if (rank.includes('Master')) return 'text-red-500'
    if (rank === 'Expert') return 'text-blue-500'
    if (rank === 'Specialist') return 'text-cyan-500'
    if (rank === 'Pupil') return 'text-green-500'
    return 'text-gray-500'
  }

  if (isLoading) {
    return (
      <Card font="retro">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-blue-500" />
              <CardTitle font="retro" className="retro text-lg">Codeforces</CardTitle>
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
              <Trophy className="h-5 w-5 text-blue-500" />
              <CardTitle font="retro" className="retro text-lg">Codeforces</CardTitle>
            </div>
            <Button font="retro" variant="ghost" size="sm" onClick={fetchStats}>
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
            <Trophy className="h-5 w-5 text-blue-500" />
            <CardTitle font="retro" className="retro text-lg">Codeforces</CardTitle>
          </div>
          <Button font="retro" variant="ghost" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription font="retro">@{stats.handle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="retro text-sm font-medium">Current Rating</span>
            <span className="text-2xl font-bold">{stats.rating}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${getRankColor(stats.rank)}`}>
              {stats.rank}
            </span>
            <span className="text-muted-foreground">
              Max: {stats.maxRating} ({stats.maxRank})
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="retro text-sm font-medium">{stats.contestsParticipated}</div>
              <div className="text-xs text-muted-foreground">Contests</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="retro text-sm font-medium">{stats.problemsSolved}</div>
              <div className="text-xs text-muted-foreground">Problems</div>
            </div>
          </div>
        </div>

        {/* Recent Contests */}
        <div>
          <h4 className="text-sm font-medium mb-2">Recent Contests</h4>
          <div className="space-y-2">
            {stats.recentContests.slice(0, 2).map((contest) => (
              <div key={contest.id} className="flex items-center justify-between text-sm border-l-2 pl-2 border-muted">
                <div>
                  <p className="retro font-medium">{contest.name}</p>
                  <p className="text-xs text-muted-foreground">Rank #{contest.rank}</p>
                </div>
                <div className={`text-xs font-medium ${
                  contest.ratingChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {contest.ratingChange >= 0 ? '+' : ''}{contest.ratingChange}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
