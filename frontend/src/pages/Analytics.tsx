import { useState, useEffect } from 'react'
import { analyticsAPI } from '@/lib/api'
import { AnalyticsStats, ContributionDay, WeeklyActivity } from '@/types'
import { YearSelector } from '@/components/analytics/YearSelector'
import { ContributionGraph } from '@/components/analytics/ContributionGraph'
import { EfficiencyCard } from '@/components/analytics/EfficiencyCard'
import { PlatformComparison } from '@/components/analytics/PlatformComparison'
import { WeeklyActivityChart } from '@/components/analytics/WeeklyActivityChart'
import { PlatformDistributionCharts } from '@/components/analytics/PlatformDistributionCharts'
import { Loading } from '@/components/ui/8bit/loading'
import { Code2, Sword, TrendingUp, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Analytics() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [contributions, setContributions] = useState<ContributionDay[]>([])
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([])

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)

        // Fetch all data in parallel
        const [statsData, contributionData, weeklyData] = await Promise.all([
          analyticsAPI.getStats(),
          analyticsAPI.getContributionHistory(selectedYear),
          analyticsAPI.getWeeklyActivity(selectedYear)
        ])

        setStats(statsData)
        setContributions(contributionData.data || [])
        setWeeklyActivity(weeklyData)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
        toast.error('Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [selectedYear])

  if (loading) {
    return <Loading text="Loading analytics..." />
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="retro text-lg text-muted-foreground">
            No analytics data available
          </p>
          <p className="retro text-sm text-muted-foreground mt-2">
            Add your platform handles in your profile to see analytics
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="retro text-3xl font-bold">Analytics</h1>
          <p className="retro text-sm text-muted-foreground mt-1">
            Track your coding journey across platforms
          </p>
        </div>
        <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
      </div>

      {/* Efficiency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <EfficiencyCard
          title="LeetCode"
          submissions={stats.leetcode.submissions}
          problemsSolved={stats.leetcode.problemsSolved}
          efficiency={stats.leetcode.efficiency}
          icon={<Code2 className="h-5 w-5" />}
        />
        <EfficiencyCard
          title="Codeforces"
          submissions={stats.codeforces.submissions}
          problemsSolved={stats.codeforces.problemsSolved}
          efficiency={stats.codeforces.efficiency}
          icon={<Sword className="h-5 w-5" />}
        />
        <EfficiencyCard
          title="Combined"
          submissions={stats.combined.submissions}
          problemsSolved={stats.combined.problemsSolved}
          efficiency={stats.combined.efficiency}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Contribution Graph */}
      <ContributionGraph data={contributions} year={selectedYear} />

      {/* Platform Comparison */}
      <PlatformComparison stats={stats} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <WeeklyActivityChart data={weeklyActivity} />

        {/* Platform Distribution - will span 2 columns on larger screens */}
        <div className="lg:col-span-2">
          <PlatformDistributionCharts stats={stats} />
        </div>
      </div>

      {/* Insights Section */}
      {stats.combined.problemsSolved > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <h2 className="retro text-xl font-semibold mb-4">Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Best Platform */}
            {stats.leetcode.efficiency > 0 && stats.codeforces.efficiency > 0 && (
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="retro text-sm font-semibold">Best Efficiency</p>
                  <p className="retro text-xs text-muted-foreground mt-1">
                    You're most efficient on{' '}
                    <span className="font-semibold text-foreground">
                      {stats.leetcode.efficiency < stats.codeforces.efficiency
                        ? 'LeetCode'
                        : 'Codeforces'}
                    </span>{' '}
                    with{' '}
                    {Math.min(stats.leetcode.efficiency, stats.codeforces.efficiency).toFixed(2)}{' '}
                    attempts per problem
                  </p>
                </div>
              </div>
            )}

            {/* Total Progress */}
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="retro text-sm font-semibold">Overall Progress</p>
                <p className="retro text-xs text-muted-foreground mt-1">
                  You've solved <span className="font-semibold text-foreground">{stats.combined.problemsSolved}</span> unique
                  problems with{' '}
                  <span className="font-semibold text-foreground">{stats.combined.submissions}</span> total
                  submissions
                </p>
              </div>
            </div>

            {/* Active Days */}
            {contributions.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="retro text-sm font-semibold">Activity in {selectedYear}</p>
                  <p className="retro text-xs text-muted-foreground mt-1">
                    Active on{' '}
                    <span className="font-semibold text-foreground">
                      {contributions.filter(day => day.total > 0).length}
                    </span>{' '}
                    days with{' '}
                    <span className="font-semibold text-foreground">
                      {contributions.reduce((sum, day) => sum + day.total, 0)}
                    </span>{' '}
                    total submissions
                  </p>
                </div>
              </div>
            )}

            {/* Most Active Day */}
            {weeklyActivity.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="retro text-sm font-semibold">Most Active Day</p>
                  <p className="retro text-xs text-muted-foreground mt-1">
                    You're most active on{' '}
                    <span className="font-semibold text-foreground">
                      {weeklyActivity.reduce((max, day) => (day.total > max.total ? day : max)).dayOfWeek}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}