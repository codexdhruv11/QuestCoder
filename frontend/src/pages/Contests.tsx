import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { Button } from '@/components/ui/8bit/button'
import { Badge } from '@/components/ui/8bit/badge'
import { LoadingCard } from '@/components/ui/8bit/loading'
import { contestsAPI } from '@/lib/api'
import { ProgrammingContest, ProgrammingContestResponse } from '@/types'
import { Calendar, Clock, ExternalLink, RefreshCw, Trophy, Filter } from 'lucide-react'
import '@/components/ui/8bit/styles/retro.css'

const PLATFORM_COLORS = {
  leetcode: 'bg-orange-500 hover:bg-orange-600',
  codeforces: 'bg-blue-500 hover:bg-blue-600'
} as const

const PLATFORM_FILTERS = [
  { key: 'all', label: 'All Platforms' },
  { key: 'leetcode', label: 'LeetCode' },
  { key: 'codeforces', label: 'Codeforces' }
]

export default function Contests() {
  const [contests, setContests] = useState<ProgrammingContest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchContests = async (platform?: string, showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError('')

      const response: ProgrammingContestResponse = await contestsAPI.getContests(
        platform === 'all' ? undefined : platform
      )

      if (response.success) {
        setContests(response.data || [])
        setLastUpdated(response.meta?.lastUpdated || new Date().toISOString())
      } else {
        throw new Error('Failed to fetch contests')
      }
    } catch (error: any) {
      console.error('Failed to fetch contests:', error)
      setError('Failed to load contest data. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchContests(activeFilter)
  }, [activeFilter])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchContests(activeFilter, true)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [activeFilter])

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
  }

  const handleRefresh = () => {
    fetchContests(activeFilter, true)
  }

  const getContestStatus = (contest: ProgrammingContest): string => {
    const now = new Date()
    const startTime = new Date(contest.start_time)
    const endTime = new Date(contest.end_time)

    if (now < startTime) {
      const timeDiff = startTime.getTime() - now.getTime()
      const hoursUntilStart = timeDiff / (1000 * 60 * 60)

      if (hoursUntilStart <= 24) {
        return 'Starting Soon'
      }
      return 'Upcoming'
    } else if (now >= startTime && now <= endTime) {
      return 'Ongoing'
    } else {
      return 'Ended'
    }
  }

  const getTimeUntilStart = (contest: ProgrammingContest): string => {
    const now = new Date()
    const startTime = new Date(contest.start_time)

    if (now >= startTime) {
      return 'Started'
    }

    const timeDiff = startTime.getTime() - now.getTime()
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) {
      return `${days}d ${hours}h`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const formatDuration = (durationSeconds: string): string => {
    const seconds = parseInt(durationSeconds, 10)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPlatformColor = (site: string): string => {
    const siteLower = site.toLowerCase()
    return PLATFORM_COLORS[siteLower as keyof typeof PLATFORM_COLORS] || 'bg-gray-500 hover:bg-gray-600'
  }

  if (loading && !refreshing) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="retro text-3xl font-bold">Upcoming Contests</h1>
            <p className="text-muted-foreground mt-2">
              Track upcoming programming contests from LeetCode and Codeforces
            </p>
          </div>
        </div>

        {/* Loading grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="retro text-3xl font-bold">Upcoming Contests</h1>
          <p className="text-muted-foreground mt-2">
            Track upcoming programming contests from LeetCode and Codeforces
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            font="retro"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 mr-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="retro text-sm font-medium">Filter:</span>
        </div>
        {PLATFORM_FILTERS.map((filter) => (
          <Button
            key={filter.key}
            font="retro"
            variant={activeFilter === filter.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange(filter.key)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-sm text-muted-foreground">
          Last updated: {formatDate(lastUpdated)}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card font="retro">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="text-destructive">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">{error}</p>
              </div>
              <Button font="retro" onClick={() => fetchContests(activeFilter)}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contests Grid */}
      {!error && contests.length === 0 && !loading && (
        <Card font="retro">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="retro font-medium">No Upcoming Contests</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back later for new contests from {activeFilter === 'all' ? 'LeetCode and Codeforces' : activeFilter}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!error && contests.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contests.map((contest, index) => {
            const status = getContestStatus(contest)
            const timeUntilStart = getTimeUntilStart(contest)

            return (
              <Card key={index} font="retro" className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle font="retro" className="text-lg leading-tight">
                      {contest.name}
                    </CardTitle>
                    <Badge
                      font="retro"
                      className={`${getPlatformColor(contest.site)} text-white shrink-0`}
                    >
                      {contest.site}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Contest Status */}
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      status === 'Ongoing' ? 'bg-green-500' :
                      status === 'Starting Soon' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`} />
                    <span className="text-sm font-medium">{status}</span>
                    {status !== 'Started' && status !== 'Ongoing' && (
                      <span className="text-sm text-muted-foreground">
                        ({timeUntilStart})
                      </span>
                    )}
                  </div>

                  {/* Contest Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(contest.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDuration(contest.duration)}</span>
                    </div>
                  </div>

                  {/* Contest Link */}
                  <Button
                    font="retro"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(contest.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Contest
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Stats Footer */}
      {!error && contests.length > 0 && (
        <div className="flex items-center justify-center gap-6 p-4 text-sm text-muted-foreground border-t">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span>{contests.length} contest{contests.length !== 1 ? 's' : ''} found</span>
          </div>
          {activeFilter !== 'all' && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Showing {activeFilter} only</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}