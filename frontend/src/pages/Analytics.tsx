import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { LineChart, BarChart, PieChart, AreaChart } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Brain, 
  Zap, 
  Calendar,
  Download,
  Filter,
  BarChart3,
  Activity,
  Trophy,
  Flame
} from 'lucide-react'
import { format, subDays, subWeeks, subMonths, subYears } from 'date-fns'

interface AnalyticsData {
  overview: {
    totalProblems: number
    problemsSolved: number
    completionRate: number
    totalTimeSpent: number
    averageTimePerProblem: number
    currentStreak: number
    longestStreak: number
    totalXP: number
  }
  progressChart: {
    date: string
    problemsSolved: number
    timeSpent: number
    xpGained: number
  }[]
  patternAnalytics: {
    pattern: string
    totalProblems: number
    solved: number
    completionRate: number
    averageTime: number
    difficulty: 'Easy' | 'Medium' | 'Hard'
  }[]
  timeAnalytics: {
    hour: number
    problemsSolved: number
    averageTime: number
    performance: number
  }[]
  performanceMetrics: {
    metric: string
    current: number
    previous: number
    change: number
    trend: 'up' | 'down' | 'stable'
  }[]
  predictions: {
    nextLevelDays: number
    projectedCompletionRate: number
    suggestedFocusAreas: string[]
    estimatedTimeToGoal: number
  }
}

const timeRanges = {
  '7d': { label: 'Last 7 Days', days: 7 },
  '30d': { label: 'Last 30 Days', days: 30 },
  '90d': { label: 'Last 3 Months', days: 90 },
  '1y': { label: 'Last Year', days: 365 }
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedPattern, setSelectedPattern] = useState('all')
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange, selectedPattern, startDate, endDate])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        timeRange,
        ...(selectedPattern !== 'all' && { pattern: selectedPattern }),
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() })
      })

      const response = await fetch(`/api/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch analytics')

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/analytics/export?format=${format}&timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${format === 'csv' ? 'data.csv' : 'report.pdf'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: `Analytics exported as ${format.toUpperCase()}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your progress and performance insights
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('pdf')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(timeRanges).map(([key, range]) => (
                  <SelectItem key={key} value={key}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPattern} onValueChange={setSelectedPattern}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Patterns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patterns</SelectItem>
                {data.patternAnalytics.map((pattern) => (
                  <SelectItem key={pattern.pattern} value={pattern.pattern}>
                    {pattern.pattern}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <DatePicker
                date={startDate}
                onDateChange={setStartDate}
                placeholder="Start date"
              />
              <span className="text-muted-foreground">to</span>
              <DatePicker
                date={endDate}
                onDateChange={setEndDate}
                placeholder="End date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">
                    {Math.round(data.overview.completionRate)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.overview.problemsSolved} / {data.overview.totalProblems} problems
                  </p>
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
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Time</p>
                  <p className="text-2xl font-bold">
                    {Math.round(data.overview.averageTimePerProblem / 60)}m
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(data.overview.totalTimeSpent / 3600)}h total
                  </p>
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
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold">{data.overview.currentStreak}</p>
                  <p className="text-xs text-muted-foreground">
                    Best: {data.overview.longestStreak} days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total XP</p>
                  <p className="text-2xl font-bold">
                    {data.overview.totalXP.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Experience Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="progress" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Progress Over Time</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AreaChart
                data={data.progressChart}
                height={400}
                lines={[
                  { key: 'problemsSolved', name: 'Problems Solved', color: '#3b82f6' },
                  { key: 'xpGained', name: 'XP Gained', color: '#10b981' }
                ]}
                xAxisKey="date"
                formatXAxis={(value) => format(new Date(value), 'MMM dd')}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={data.timeAnalytics}
                  height={300}
                  bars={[
                    { key: 'problemsSolved', name: 'Problems Solved', color: '#8b5cf6' }
                  ]}
                  xAxisKey="hour"
                  formatXAxis={(value) => `${value}:00`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.performanceMetrics.map((metric, index) => (
                  <div key={metric.metric} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{metric.metric}</p>
                      <p className="text-sm text-muted-foreground">
                        Current: {metric.current} | Previous: {metric.previous}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={metric.trend === 'up' ? 'default' : metric.trend === 'down' ? 'destructive' : 'secondary'}>
                        {metric.trend === 'up' ? '+' : metric.trend === 'down' ? '-' : '='}{Math.abs(metric.change)}%
                      </Badge>
                      {metric.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : metric.trend === 'down' ? (
                        <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                      ) : (
                        <Activity className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Pattern Performance Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.patternAnalytics.map((pattern, index) => (
                  <motion.div
                    key={pattern.pattern}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold">{pattern.pattern}</h3>
                        <Badge variant={
                          pattern.difficulty === 'Easy' ? 'default' :
                          pattern.difficulty === 'Medium' ? 'secondary' : 'destructive'
                        }>
                          {pattern.difficulty}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{Math.round(pattern.completionRate)}%</p>
                        <p className="text-sm text-muted-foreground">
                          {pattern.solved} / {pattern.totalProblems}
                        </p>
                      </div>
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pattern.completionRate}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Avg. Time: {Math.round(pattern.averageTime / 60)}m</span>
                      <span>{pattern.solved} problems solved</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={data.patternAnalytics.map(p => ({
                    name: p.pattern,
                    value: p.averageTime,
                    fill: `hsl(${Math.random() * 360}, 70%, 50%)`
                  }))}
                  height={300}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completion Rates by Pattern</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={data.patternAnalytics}
                  height={300}
                  bars={[
                    { key: 'completionRate', name: 'Completion Rate (%)', color: '#f59e0b' }
                  ]}
                  xAxisKey="pattern"
                  formatXAxis={(value) => value.substring(0, 10) + '...'}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5" />
                  <span>Predictive Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    Next Level Prediction
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300">
                    You'll reach the next level in approximately{' '}
                    <strong>{data.predictions.nextLevelDays} days</strong> at your current pace.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    Projected Completion Rate
                  </h4>
                  <p className="text-green-700 dark:text-green-300">
                    Based on your progress, you're on track for a{' '}
                    <strong>{Math.round(data.predictions.projectedCompletionRate)}%</strong>{' '}
                    completion rate this month.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                    Time to Goal
                  </h4>
                  <p className="text-orange-700 dark:text-orange-300">
                    At your current rate, you'll complete all patterns in{' '}
                    <strong>{Math.round(data.predictions.estimatedTimeToGoal / 24)} days</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended Focus Areas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.predictions.suggestedFocusAreas.map((area, index) => (
                  <div key={area} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-medium">{area}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Analytics
