import mongoose from 'mongoose'
import UserProgress from '@/models/UserProgress'
import { PatternService } from '@/services/patternService'
import { logger } from '@/utils/logger'

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface DifficultyDistribution {
  Easy: number
  Medium: number
  Hard: number
}

export interface PatternMasteryData {
  patternName: string
  completion: number
  solved: number
  total: number
  category: string
}

export interface AnalyticsOverview {
  totalProblems: number
  weeklyProblems: number
  currentStreak: number
  bestStreak: number
  longestStreak: number // Alias for bestStreak
  problemsSolved: number // Alias for totalProblems
  totalXP: number // From UserGamification
  difficultyDistribution: DifficultyDistribution
  recentActivity: ChartDataPoint[]
}

export interface PerformanceMetrics {
  solvingVelocity: number // problems per day
  averageSessionTime: number // minutes
  peakPerformanceHour: number
  consistencyScore: number // 0-100
  improvementRate: number // percentage
}

export interface PredictiveInsight {
  type: 'completion_estimate' | 'goal_recommendation' | 'streak_prediction'
  title: string
  description: string
  value: number
  confidence: number
  timeframe: string
}

export class AnalyticsService {
  /**
   * Get analytics overview for dashboard
   */
  static async getOverview(userId: mongoose.Types.ObjectId): Promise<AnalyticsOverview> {
    try {
      const userProgress = await UserProgress.findOne({ userId })
      if (!userProgress) {
        return this.getEmptyOverview()
      }

      // Get UserGamification data for totalXP
      const UserGamification = mongoose.model('UserGamification')
      const userGamification = await UserGamification.findOne({ userId })
      const totalXP = userGamification?.totalXp || 0

      const activityLog = userProgress.activityLog || []
      const totalProblems = activityLog.filter(log => log.type === 'problem_solved').length

      // Calculate weekly problems (last 7 days)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weeklyProblems = activityLog.filter(log => 
        log.type === 'problem_solved' && 
        log.date && 
        new Date(log.date) >= weekAgo
      ).length

      // Get difficulty distribution
      const difficultyDistribution = this.calculateDifficultyDistribution(activityLog)

      // Generate recent activity chart (last 14 days)
      const recentActivity = this.generateActivityChart(activityLog, 14)

      const bestStreak = userProgress.longestStreak || 0

      return {
        totalProblems,
        weeklyProblems,
        currentStreak: userProgress.currentStreak || 0,
        bestStreak,
        longestStreak: bestStreak, // Alias for frontend compatibility
        problemsSolved: totalProblems, // Alias for frontend compatibility
        totalXP,
        difficultyDistribution,
        recentActivity
      }

    } catch (error) {
      logger.error('Error getting analytics overview:', error)
      return this.getEmptyOverview()
    }
  }

  /**
   * Generate time-series chart data for problem solving activity
   */
  static async getProgressCharts(
    userId: mongoose.Types.ObjectId, 
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30
  ): Promise<ChartDataPoint[]> {
    try {
      const userProgress = await UserProgress.findOne({ userId })
      if (!userProgress || !userProgress.activityLog) {
        return []
      }

      return this.generateActivityChart(userProgress.activityLog, days, period)

    } catch (error) {
      logger.error('Error generating progress charts:', error)
      return []
    }
  }

  /**
   * Get pattern-specific analytics
   */
  static async getPatternAnalytics(userId: mongoose.Types.ObjectId): Promise<PatternMasteryData[]> {
    try {
      const userProgress = await UserProgress.findOne({ userId })
      const patterns = await PatternService.loadPatterns()

      if (!userProgress || !patterns.length) {
        return []
      }

      const patternData: PatternMasteryData[] = []

      patterns.forEach(pattern => {
        // Count total problems in pattern
        let totalProblems = 0
        if (pattern.subPatterns) {
          pattern.subPatterns.forEach((subPattern: any) => {
            if (subPattern.problems) {
              totalProblems += subPattern.problems.length
            }
          })
        }

        // Find user progress for this pattern
        const progress = userProgress.patternProgress?.find(
          (p: any) => p.patternName === pattern.name
        )

        const solved = progress?.solvedProblems || 0
        const completion = totalProblems > 0 ? Math.round((solved / totalProblems) * 100) : 0

        patternData.push({
          patternName: pattern.name,
          completion,
          solved,
          total: totalProblems,
          category: pattern.category || 'Other'
        })
      })

      return patternData.sort((a, b) => b.completion - a.completion)

    } catch (error) {
      logger.error('Error getting pattern analytics:', error)
      return []
    }
  }

  /**
   * Generate predictive insights using linear regression and trends
   */
  static async getPredictiveInsights(userId: mongoose.Types.ObjectId): Promise<PredictiveInsight[]> {
    try {
      const userProgress = await UserProgress.findOne({ userId })
      if (!userProgress || !userProgress.activityLog?.length) {
        return []
      }

      const insights: PredictiveInsight[] = []
      const activityLog = userProgress.activityLog.filter(log => log.type === 'problem_solved')

      // Calculate solving velocity trend
      const velocityInsight = this.calculateVelocityTrend(activityLog)
      if (velocityInsight) {
        insights.push(velocityInsight)
      }

      // Predict streak continuation
      const streakInsight = this.predictStreakContinuation(userProgress)
      if (streakInsight) {
        insights.push(streakInsight)
      }

      // Goal recommendation based on current pace
      const goalInsight = this.recommendDailyGoal(activityLog)
      if (goalInsight) {
        insights.push(goalInsight)
      }

      return insights

    } catch (error) {
      logger.error('Error generating predictive insights:', error)
      return []
    }
  }

  /**
   * Get detailed performance metrics
   */
  static async getPerformanceMetrics(userId: mongoose.Types.ObjectId): Promise<PerformanceMetrics> {
    try {
      const userProgress = await UserProgress.findOne({ userId })
      if (!userProgress || !userProgress.activityLog?.length) {
        return this.getEmptyMetrics()
      }

      const activityLog = userProgress.activityLog.filter(log => log.type === 'problem_solved')

      // Calculate solving velocity (problems per day over last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentActivity = activityLog.filter(log => 
        log.date && new Date(log.date) >= thirtyDaysAgo
      )
      const solvingVelocity = recentActivity.length / 30

      // Calculate peak performance hour
      const hourCounts = new Array(24).fill(0)
      activityLog.forEach(log => {
        if (log.date) {
          const hour = new Date(log.date).getHours()
          hourCounts[hour]++
        }
      })
      const peakPerformanceHour = hourCounts.indexOf(Math.max(...hourCounts))

      // Calculate consistency score based on activity distribution
      const consistencyScore = this.calculateConsistencyScore(activityLog)

      // Calculate improvement rate (comparing first and last 30 days)
      const improvementRate = this.calculateImprovementRate(activityLog)

      return {
        solvingVelocity,
        averageSessionTime: 25, // Placeholder - would need session tracking
        peakPerformanceHour,
        consistencyScore,
        improvementRate
      }

    } catch (error) {
      logger.error('Error calculating performance metrics:', error)
      return this.getEmptyMetrics()
    }
  }

  // Helper methods

  private static getEmptyOverview(): AnalyticsOverview {
    return {
      totalProblems: 0,
      weeklyProblems: 0,
      currentStreak: 0,
      bestStreak: 0,
      longestStreak: 0,
      problemsSolved: 0,
      totalXP: 0,
      difficultyDistribution: { Easy: 0, Medium: 0, Hard: 0 },
      recentActivity: []
    }
  }

  private static getEmptyMetrics(): PerformanceMetrics {
    return {
      solvingVelocity: 0,
      averageSessionTime: 0,
      peakPerformanceHour: 0,
      consistencyScore: 0,
      improvementRate: 0
    }
  }

  private static calculateDifficultyDistribution(activityLog: any[]): DifficultyDistribution {
    const distribution = { Easy: 0, Medium: 0, Hard: 0 }
    
    activityLog
      .filter(log => log.type === 'problem_solved' && log.metadata?.difficulty)
      .forEach(log => {
        const difficulty = log.metadata.difficulty
        if (difficulty in distribution) {
          distribution[difficulty as keyof DifficultyDistribution]++
        }
      })

    return distribution
  }

  private static generateActivityChart(
    activityLog: any[], 
    days: number, 
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): ChartDataPoint[] {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    const solvedLogs = activityLog.filter(log => 
      log.type === 'problem_solved' && 
      log.date && 
      new Date(log.date) >= startDate
    )

    switch (period) {
      case 'daily':
        return this.generateDailyChart(solvedLogs, startDate, endDate)
      case 'weekly':
        return this.generateWeeklyChart(solvedLogs, startDate, endDate)
      case 'monthly':
        return this.generateMonthlyChart(solvedLogs, startDate, endDate)
      default:
        return this.generateDailyChart(solvedLogs, startDate, endDate)
    }
  }

  private static generateDailyChart(solvedLogs: any[], startDate: Date, endDate: Date): ChartDataPoint[] {
    const chartData: ChartDataPoint[] = []

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayStart = new Date(d)
      const dayEnd = new Date(d)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const count = solvedLogs.filter(log => {
        const logDate = new Date(log.date)
        return logDate >= dayStart && logDate < dayEnd
      }).length

      chartData.push({
        date: dateStr,
        value: count,
        label: d.toLocaleDateString()
      })
    }

    return chartData
  }

  private static generateWeeklyChart(solvedLogs: any[], startDate: Date, endDate: Date): ChartDataPoint[] {
    const chartData: ChartDataPoint[] = []
    const weeklyData = new Map<string, number>()

    // Group logs by ISO week
    solvedLogs.forEach(log => {
      const logDate = new Date(log.date)
      const year = logDate.getFullYear()
      const week = this.getISOWeek(logDate)
      const weekKey = `${year}-W${week.toString().padStart(2, '0')}`
      
      weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + 1)
    })

    // Generate chart data for each week in range
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear()
      const week = this.getISOWeek(currentDate)
      const weekKey = `${year}-W${week.toString().padStart(2, '0')}`
      const weekStart = this.getFirstDayOfWeek(currentDate)

      chartData.push({
        date: weekKey,
        value: weeklyData.get(weekKey) || 0,
        label: `Week of ${weekStart.toLocaleDateString()}`
      })

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7)
    }

    return chartData
  }

  private static generateMonthlyChart(solvedLogs: any[], startDate: Date, endDate: Date): ChartDataPoint[] {
    const chartData: ChartDataPoint[] = []
    const monthlyData = new Map<string, number>()

    // Group logs by year-month
    solvedLogs.forEach(log => {
      const logDate = new Date(log.date)
      const yearMonth = `${logDate.getFullYear()}-${(logDate.getMonth() + 1).toString().padStart(2, '0')}`
      
      monthlyData.set(yearMonth, (monthlyData.get(yearMonth) || 0) + 1)
    })

    // Generate chart data for each month in range
    const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
    
    while (currentDate <= endMonth) {
      const yearMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`
      
      chartData.push({
        date: yearMonth,
        value: monthlyData.get(yearMonth) || 0,
        label: currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      })

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return chartData
  }

  private static getISOWeek(date: Date): number {
    const tempDate = new Date(date.valueOf())
    const dayNum = (date.getDay() + 6) % 7
    tempDate.setDate(tempDate.getDate() - dayNum + 3)
    const firstThursday = tempDate.valueOf()
    tempDate.setMonth(0, 1)
    if (tempDate.getDay() !== 4) {
      tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7)
    }
    return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000)
  }

  private static getFirstDayOfWeek(date: Date): Date {
    const dayOfWeek = date.getDay()
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(date.getFullYear(), date.getMonth(), diff)
  }

  private static calculateVelocityTrend(activityLog: any[]): PredictiveInsight | null {
    if (activityLog.length < 14) return null

    // Calculate velocity for last 7 days vs previous 7 days
    const now = new Date()
    const week1End = new Date(now)
    const week1Start = new Date(now)
    week1Start.setDate(week1Start.getDate() - 7)

    const week2End = new Date(week1Start)
    const week2Start = new Date(week1Start)
    week2Start.setDate(week2Start.getDate() - 7)

    const week1Count = activityLog.filter(log => {
      const logDate = new Date(log.date)
      return logDate >= week1Start && logDate < week1End
    }).length

    const week2Count = activityLog.filter(log => {
      const logDate = new Date(log.date)
      return logDate >= week2Start && logDate < week2End
    }).length

    if (week2Count === 0) return null

    const improvement = ((week1Count - week2Count) / week2Count) * 100
    const trend = improvement > 0 ? 'improving' : 'declining'

    return {
      type: 'completion_estimate',
      title: `Solving velocity is ${trend}`,
      description: `Your problem-solving rate has ${improvement > 0 ? 'increased' : 'decreased'} by ${Math.abs(improvement).toFixed(1)}% this week`,
      value: improvement,
      confidence: 75,
      timeframe: 'weekly'
    }
  }

  private static predictStreakContinuation(userProgress: any): PredictiveInsight | null {
    const currentStreak = userProgress.currentStreak || 0
    if (currentStreak === 0) return null

    // Simple prediction based on historical data
    const confidence = Math.min(currentStreak * 10, 90)
    const predictedDays = Math.floor(currentStreak * 1.2)

    return {
      type: 'streak_prediction',
      title: 'Streak continuation prediction',
      description: `Based on your current ${currentStreak}-day streak, you're likely to reach ${predictedDays} days`,
      value: predictedDays,
      confidence,
      timeframe: 'days'
    }
  }

  private static recommendDailyGoal(activityLog: any[]): PredictiveInsight | null {
    if (activityLog.length < 7) return null

    // Calculate average daily problems over last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentActivity = activityLog.filter(log => 
      log.date && new Date(log.date) >= thirtyDaysAgo
    )

    const avgDaily = recentActivity.length / 30
    const recommendedGoal = Math.max(1, Math.ceil(avgDaily * 1.2))

    return {
      type: 'goal_recommendation',
      title: 'Recommended daily goal',
      description: `Based on your recent activity, try solving ${recommendedGoal} problems per day to maintain growth`,
      value: recommendedGoal,
      confidence: 80,
      timeframe: 'daily'
    }
  }

  private static calculateConsistencyScore(activityLog: any[]): number {
    if (activityLog.length < 7) return 0

    // Calculate how evenly distributed the activity is across days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const dailyCounts = new Array(30).fill(0)
    activityLog
      .filter(log => log.date && new Date(log.date) >= thirtyDaysAgo)
      .forEach(log => {
        const daysDiff = Math.floor((new Date().getTime() - new Date(log.date).getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff < 30) {
          dailyCounts[29 - daysDiff]++
        }
      })

    // Calculate coefficient of variation (lower = more consistent)
    const mean = dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length
    if (mean === 0) return 0

    const variance = dailyCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / dailyCounts.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = stdDev / mean

    // Convert to 0-100 score (lower CV = higher score)
    return Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 50)))
  }

  private static calculateImprovementRate(activityLog: any[]): number {
    if (activityLog.length < 60) return 0 // Need at least 60 days of data

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // First 30 days
    const period1 = activityLog.filter(log => {
      const logDate = new Date(log.date)
      return logDate >= sixtyDaysAgo && logDate < thirtyDaysAgo
    }).length

    // Last 30 days
    const period2 = activityLog.filter(log => {
      const logDate = new Date(log.date)
      return logDate >= thirtyDaysAgo
    }).length

    if (period1 === 0) return 0

    return ((period2 - period1) / period1) * 100
  }
}

export default AnalyticsService
