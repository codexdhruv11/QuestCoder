import UserProgress from '@/models/UserProgress'
import { parseCSVData } from '@/utils/csvParser'
import { logger } from '@/utils/logger'
import path from 'path'
import fs from 'fs/promises'

export interface PatternStats {
  totalPatterns: number
  completedPatterns: number
  totalProblems: number
  solvedProblems: number
  progressByCategory: Record<string, {
    total: number
    solved: number
    completion: number
  }>
}

export interface PatternInsight {
  type: 'strength' | 'weakness' | 'recommendation'
  category: string
  message: string
  progress: number
}

export class PatternService {
  private static patternsCache: any[] | null = null
  private static lastCacheUpdate = 0
  private static readonly CACHE_TTL = 10 * 60 * 1000 // 10 minutes

  /**
   * Load patterns from CSV data with caching
   */
  static async loadPatterns(): Promise<any[]> {
    const now = Date.now()
    
    // Return cached data if still valid
    if (this.patternsCache && (now - this.lastCacheUpdate) < this.CACHE_TTL) {
      return this.patternsCache
    }

    try {
      // Try to load from processed JSON first
      const jsonPath = path.join(process.cwd(), 'data', 'patterns.json')
      
      try {
        const jsonData = await fs.readFile(jsonPath, 'utf-8')
        this.patternsCache = JSON.parse(jsonData)
        this.lastCacheUpdate = now
        logger.info('Patterns loaded from cached JSON file')
        return this.patternsCache
      } catch {
        logger.info('No cached patterns JSON found, parsing CSV...')
      }

      // Parse from CSV if JSON doesn't exist
      const csvPath = path.join(process.cwd(), 'data', 'patterns.csv')
      this.patternsCache = await parseCSVData(csvPath)
      this.lastCacheUpdate = now
      
      // Cache the parsed data as JSON for future use
      await fs.mkdir(path.dirname(jsonPath), { recursive: true })
      await fs.writeFile(jsonPath, JSON.stringify(this.patternsCache, null, 2))
      
      logger.info(`Patterns service loaded ${this.patternsCache.length} patterns from CSV`)
      return this.patternsCache
    } catch (error) {
      logger.error('Failed to load patterns data:', error)
      // Return empty array as fallback
      return []
    }
  }

  /**
   * Get pattern by ID or slug
   */
  static async getPatternById(id: string): Promise<any | null> {
    const patterns = await this.loadPatterns()
    return patterns.find(p => p._id === id || p.slug === id || p.id === id) || null
  }

  /**
   * Get patterns with filters
   */
  static async getFilteredPatterns(filters: {
    category?: string
    difficulty?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ patterns: any[], total: number }> {
    const patterns = await this.loadPatterns()
    let filtered = [...patterns]

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(p => 
        p.category?.toLowerCase() === filters.category?.toLowerCase()
      )
    }

    if (filters.difficulty) {
      filtered = filtered.filter(p => 
        p.difficulty?.toLowerCase() === filters.difficulty?.toLowerCase()
      )
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchTerm) ||
        p.description?.toLowerCase().includes(searchTerm) ||
        p.keyPoints?.some((point: string) => point.toLowerCase().includes(searchTerm))
      )
    }

    // Apply pagination
    const limit = Math.min(filters.limit || 50, 100)
    const offset = Math.max(filters.offset || 0, 0)
    const paginatedPatterns = filtered.slice(offset, offset + limit)

    return {
      patterns: paginatedPatterns,
      total: filtered.length
    }
  }

  /**
   * Calculate user progress statistics
   */
  static async calculateUserStats(userId: string): Promise<PatternStats> {
    const patterns = await this.loadPatterns()
    let userProgress = await UserProgress.findOne({ userId })

    if (!userProgress) {
      userProgress = new UserProgress({ userId })
      await userProgress.save()
    }

    const stats: PatternStats = {
      totalPatterns: patterns.length,
      completedPatterns: 0,
      totalProblems: 0,
      solvedProblems: 0,
      progressByCategory: {}
    }

    // Calculate progress by category
    patterns.forEach(pattern => {
      const category = pattern.category || 'Other'
      
      // Count total problems from nested subPatterns
      let totalProblems = 0
      if (pattern.subPatterns) {
        pattern.subPatterns.forEach((subPattern: any) => {
          if (subPattern.problems) {
            totalProblems += subPattern.problems.length
          }
        })
      }
      
      stats.totalProblems += totalProblems

      if (!stats.progressByCategory[category]) {
        stats.progressByCategory[category] = {
          total: 0,
          solved: 0,
          completion: 0
        }
      }

      stats.progressByCategory[category].total += totalProblems

      // Find user progress for this pattern
      const progress = (userProgress as any).patternProgress?.find(
        (p: any) => p.patternName === pattern.name
      )

      if (progress) {
        const solvedCount = progress.solvedProblems || 0
        stats.solvedProblems += solvedCount
        stats.progressByCategory[category].solved += solvedCount

        // Check if pattern is completed
        if (totalProblems > 0 && solvedCount === totalProblems) {
          stats.completedPatterns++
        }
      }
    })

    // Calculate completion rates
    Object.keys(stats.progressByCategory).forEach(category => {
      const categoryData = stats.progressByCategory[category]
      if (categoryData.total > 0) {
        categoryData.completion = Math.round((categoryData.solved / categoryData.total) * 100)
      }
    })

    return stats
  }

  /**
   * Generate insights based on user progress
   */
  static async generateInsights(userId: string): Promise<PatternInsight[]> {
    const stats = await this.calculateUserStats(userId)
    const insights: PatternInsight[] = []

    // Find strengths (categories with >70% completion)
    Object.entries(stats.progressByCategory).forEach(([category, data]) => {
      if (data.completion >= 70 && data.total >= 5) {
        insights.push({
          type: 'strength',
          category,
          message: `Strong performance in ${category} with ${data.completion}% completion`,
          progress: data.completion
        })
      }
    })

    // Find weaknesses (categories with <30% completion)
    Object.entries(stats.progressByCategory).forEach(([category, data]) => {
      if (data.completion < 30 && data.total >= 5) {
        insights.push({
          type: 'weakness',
          category,
          message: `Room for improvement in ${category} - only ${data.completion}% completed`,
          progress: data.completion
        })
      }
    })

    // Generate recommendations
    const categoriesByCompletion = Object.entries(stats.progressByCategory)
      .sort(([,a], [,b]) => a.completion - b.completion)
      .slice(0, 3)

    categoriesByCompletion.forEach(([category, data]) => {
      if (data.completion < 50 && data.total >= 3) {
        insights.push({
          type: 'recommendation',
          category,
          message: `Focus on ${category} patterns to improve your algorithmic skills`,
          progress: data.completion
        })
      }
    })

    return insights.slice(0, 5) // Return top 5 insights
  }

  /**
   * Update user progress for a specific problem
   */
  static async updateProblemProgress(
    userId: string,
    patternName: string,
    problemId: string,
    solved: boolean
  ): Promise<{ success: boolean; currentStreak?: number; message?: string }> {
    try {
      let userProgress = await UserProgress.findOne({ userId })
      
      if (!userProgress) {
        userProgress = new UserProgress({ userId })
      }

      // Find or create pattern progress
      let patternProgress = (userProgress as any).patternProgress?.find(
        (p: any) => p.patternName === patternName
      )

      if (!patternProgress) {
        const patterns = await this.loadPatterns()
        const pattern = patterns.find(p => p.name === patternName)
        
        // Count total problems from nested subPatterns
        let totalProblems = 0
        if (pattern?.subPatterns) {
          pattern.subPatterns.forEach((subPattern: any) => {
            if (subPattern.problems) {
              totalProblems += subPattern.problems.length
            }
          })
        }
        
        patternProgress = {
          patternName,
          totalProblems,
          solvedProblems: 0,
          solvedProblemIds: []
        }
        
        if (!(userProgress as any).patternProgress) {
          (userProgress as any).patternProgress = []
        }
        (userProgress as any).patternProgress.push(patternProgress)
      }

      // Update problem status
      const isCurrentlySolved = patternProgress.solvedProblemIds?.includes(problemId) || false

      if (solved && !isCurrentlySolved) {
        // Mark as solved
        if (!patternProgress.solvedProblemIds) {
          patternProgress.solvedProblemIds = []
        }
        patternProgress.solvedProblemIds.push(problemId)
        patternProgress.solvedProblems = (patternProgress.solvedProblems || 0) + 1

        // Update streak
        const now = new Date()
        const lastSolved = (userProgress as any).lastSolvedAt

        if (lastSolved) {
          const daysSinceLastSolved = Math.floor((now.getTime() - lastSolved.getTime()) / (1000 * 60 * 60 * 24))
          if (daysSinceLastSolved === 1) {
            (userProgress as any).currentStreak = ((userProgress as any).currentStreak || 0) + 1
          } else if (daysSinceLastSolved > 1) {
            (userProgress as any).currentStreak = 1
          }
        } else {
          (userProgress as any).currentStreak = 1
        }

        (userProgress as any).longestStreak = Math.max(
          (userProgress as any).longestStreak || 0,
          (userProgress as any).currentStreak || 0
        )
        ;(userProgress as any).lastSolvedAt = now

        // Log activity
        if (!(userProgress as any).activityLog) {
          (userProgress as any).activityLog = []
        }
        ;(userProgress as any).activityLog.push({
          type: 'problem_solved',
          problemId,
          patternName,
          date: now
        })

      } else if (!solved && isCurrentlySolved) {
        // Mark as unsolved
        patternProgress.solvedProblemIds = patternProgress.solvedProblemIds?.filter(id => id !== problemId) || []
        patternProgress.solvedProblems = Math.max(0, (patternProgress.solvedProblems || 0) - 1)

        // Log activity
        if (!(userProgress as any).activityLog) {
          (userProgress as any).activityLog = []
        }
        ;(userProgress as any).activityLog.push({
          type: 'problem_unsolved',
          problemId,
          patternName,
          date: new Date()
        })
      }

      await userProgress.save()

      return {
        success: true,
        currentStreak: (userProgress as any).currentStreak || 0,
        message: solved ? 'Problem marked as solved' : 'Problem marked as unsolved'
      }

    } catch (error) {
      logger.error('Error updating problem progress:', error)
      return {
        success: false,
        message: 'Failed to update problem progress'
      }
    }
  }

  /**
   * Clear patterns cache (useful for development)
   */
  static clearCache(): void {
    this.patternsCache = null
    this.lastCacheUpdate = 0
    logger.info('Patterns cache cleared')
  }
}

export default PatternService
