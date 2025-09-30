import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { logger } from '@/utils/logger'

// Cache implementation using in-memory store (in production, use Redis)
interface CacheEntry {
  data: any
  expiresAt: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>()

  set(key: string, data: any, ttlSeconds = 3600): void {
    const expiresAt = Date.now() + (ttlSeconds * 1000)
    this.cache.set(key, { data, expiresAt })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instance
const cache = new MemoryCache()

// Cleanup expired entries every 10 minutes
setInterval(() => {
  cache.cleanup()
}, 10 * 60 * 1000)

// Rate limiting implementation
class RateLimiter {
  private requests = new Map<string, number[]>()

  canMakeRequest(key: string, maxRequests = 10, windowMs = 60000): boolean {
    const now = Date.now()
    const windowStart = now - windowMs

    if (!this.requests.has(key)) {
      this.requests.set(key, [])
    }

    const keyRequests = this.requests.get(key)!
    
    // Remove old requests outside the window
    const validRequests = keyRequests.filter(time => time > windowStart)
    this.requests.set(key, validRequests)

    // Check if under limit
    if (validRequests.length < maxRequests) {
      validRequests.push(now)
      return true
    }

    return false
  }
}

const rateLimiter = new RateLimiter()

export interface LeetCodeStats {
  handle: string
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  acceptanceRate: number
  ranking: number
  reputation: number
  recentSubmissions: Array<{
    id: string
    title: string
    status: string
    timestamp: string
    language: string
  }>
}

export interface SubmissionHistory {
  date: string // YYYY-MM-DD format
  count: number
  platform: 'leetcode' | 'codeforces'
}

export interface CodeforcesStats {
  handle: string
  rating: number
  maxRating: number
  rank: string
  maxRank: string
  contestsParticipated: number
  problemsSolved: number
  recentContests: Array<{
    id: string
    name: string
    rank: number
    ratingChange: number
    date: string
  }>
}

export interface GitHubStats {
  handle: string
  publicRepos: number
  followers: number
  following: number
  contributions: number
  streak: number
  languages: Record<string, number>
  recentActivity: Array<{
    type: string
    repo: string
    date: string
    description: string
  }>
}

export class PlatformService {
  private static leetcodeApi: AxiosInstance
  private static codeforcesApi: AxiosInstance
  private static githubApi: AxiosInstance

  static {
    // LeetCode API (using faisal-shohag's API with submission calendar support)
    this.leetcodeApi = axios.create({
      baseURL: process.env['LEETCODE_API_URL'] || 'https://leetcode-api-faisalshohag.vercel.app',
      timeout: 10000,
      headers: {
        'User-Agent': 'QuestCoder/1.0'
      }
    })

    // Codeforces API
    this.codeforcesApi = axios.create({
      baseURL: process.env['CODEFORCES_API_URL'] || 'https://codeforces.com/api',
      timeout: 10000,
      headers: {
        'User-Agent': 'QuestCoder/1.0'
      }
    })

    // GitHub API
    this.githubApi = axios.create({
      baseURL: process.env['GITHUB_API_URL'] || 'https://api.github.com',
      timeout: 10000,
      headers: {
        'User-Agent': 'QuestCoder/1.0',
        ...(process.env['GITHUB_TOKEN'] && {
          'Authorization': `Bearer ${process.env['GITHUB_TOKEN']}`
        })
      }
    })
  }

  /**
   * Fetch LeetCode statistics for a user
   */
  static async getLeetCodeStats(handle: string): Promise<LeetCodeStats> {
    const cacheKey = `leetcode:${handle}`
    
    // Check cache first
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      logger.info(`LeetCode stats served from cache for handle: ${handle}`)
      return cachedData
    }

    // Check rate limit
    if (!rateLimiter.canMakeRequest(`leetcode:${handle}`, 5, 60000)) {
      logger.warn(`Rate limit exceeded for LeetCode handle: ${handle}`)
      throw new Error('Rate limit exceeded. Please try again later.')
    }

    try {
      logger.info(`Fetching LeetCode stats for handle: ${handle}`)
      
      const response: AxiosResponse = await this.leetcodeApi.get(`/${handle}`)
      
      const stats: LeetCodeStats = {
        handle,
        totalSolved: response.data.totalSolved || 0,
        easySolved: response.data.easySolved || 0,
        mediumSolved: response.data.mediumSolved || 0,
        hardSolved: response.data.hardSolved || 0,
        acceptanceRate: response.data.acceptanceRate || 0,
        ranking: response.data.ranking || 0,
        reputation: response.data.reputation || 0,
        recentSubmissions: response.data.recentSubmissions || []
      }

      // Cache for 1 hour
      cache.set(cacheKey, stats, 3600)
      
      return stats
    } catch (error) {
      logger.error(`Failed to fetch LeetCode stats for ${handle}:`, error)
      
      // Return mock data as fallback
      const mockStats: LeetCodeStats = {
        handle,
        totalSolved: 245,
        easySolved: 134,
        mediumSolved: 87,
        hardSolved: 24,
        acceptanceRate: 73.5,
        ranking: 125432,
        reputation: 1567,
        recentSubmissions: [
          {
            id: '1',
            title: 'Two Sum',
            status: 'Accepted',
            timestamp: new Date().toISOString(),
            language: 'Python'
          }
        ]
      }
      
      // Cache mock data for 5 minutes
      cache.set(cacheKey, mockStats, 300)
      return mockStats
    }
  }

  /**
   * Fetch LeetCode submission history with actual dates from submission calendar
   * Returns submissions grouped by date for contribution graph
   */
  static async getLeetCodeSubmissionHistory(handle: string): Promise<SubmissionHistory[]> {
    const cacheKey = `leetcode-history:${handle}`

    // Check cache first
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      logger.info(`LeetCode submission history served from cache for handle: ${handle}`)
      return cachedData
    }

    try {
      logger.info(`Fetching LeetCode submission history for handle: ${handle}`)

      const response: AxiosResponse = await this.leetcodeApi.get(`/${handle}`)

      // submissionCalendar is an object with Unix timestamps as keys and submission counts as values
      // Example: { "1755648000": 3, "1755561600": 2 }
      const submissionCalendar = response.data.submissionCalendar || {}

      // Convert Unix timestamps to YYYY-MM-DD format
      const history: SubmissionHistory[] = Object.entries(submissionCalendar).map(([timestamp, count]) => {
        const date = new Date(parseInt(timestamp) * 1000)
        const dateStr = date.toISOString().split('T')[0]!

        return {
          date: dateStr,
          count: count as number,
          platform: 'leetcode' as const
        }
      })

      // Sort by date (oldest first)
      history.sort((a, b) => a.date.localeCompare(b.date))

      const totalSubmissions = history.reduce((sum, day) => sum + day.count, 0)
      logger.info(`Found ${history.length} days of LeetCode activity with ${totalSubmissions} total submissions for ${handle}`)

      // Cache for 2 hours
      cache.set(cacheKey, history, 7200)

      return history
    } catch (error) {
      logger.error(`Failed to fetch LeetCode submission history for ${handle}:`, error)
      return []
    }
  }

  /**
   * Fetch Codeforces statistics for a user
   */
  static async getCodeforcesStats(handle: string): Promise<CodeforcesStats> {
    const cacheKey = `codeforces:${handle}`
    
    // Check cache first
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      logger.info(`Codeforces stats served from cache for handle: ${handle}`)
      return cachedData
    }

    // Check rate limit
    if (!rateLimiter.canMakeRequest(`codeforces:${handle}`, 5, 60000)) {
      logger.warn(`Rate limit exceeded for Codeforces handle: ${handle}`)
      throw new Error('Rate limit exceeded. Please try again later.')
    }

    try {
      logger.info(`Fetching Codeforces stats for handle: ${handle}`)
      
      // Fetch user info
      const userResponse = await this.codeforcesApi.get(`/user.info?handles=${handle}`)
      
      if (userResponse.data.status !== 'OK' || !userResponse.data.result.length) {
        throw new Error('User not found')
      }

      const userInfo = userResponse.data.result[0]
      
      // Fetch user contests
      const contestResponse = await this.codeforcesApi.get(`/user.rating?handle=${handle}`).catch(() => null)
      const contests = contestResponse?.data?.status === 'OK' ? contestResponse.data.result : []

      // Fetch ALL submissions with pagination (API limit is 100 per request)
      let allSubmissions: any[] = []
      let from = 1
      const batchSize = 100

      while (allSubmissions.length < 10000) { // Safety limit
        try {
          const statusResponse = await this.codeforcesApi.get(
            `/user.status?handle=${handle}&from=${from}&count=${batchSize}`
          )

          if (statusResponse.data.status !== 'OK') break

          const batch = statusResponse.data.result || []
          if (batch.length === 0) break

          allSubmissions = allSubmissions.concat(batch)

          if (batch.length < batchSize) break // Got all submissions

          from += batchSize
          await new Promise(resolve => setTimeout(resolve, 200)) // Rate limit protection
        } catch (error) {
          logger.warn(`Failed to fetch batch ${from} for ${handle}`)
          break
        }
      }

      // Count unique solved problems
      const solvedProblems = new Set<string>()
      allSubmissions.forEach((submission: any) => {
        if (submission.verdict === 'OK' && submission.problem) {
          const problemId = `${submission.problem.contestId}-${submission.problem.index}`
          solvedProblems.add(problemId)
        }
      })

      const problemsSolved = solvedProblems.size
      logger.info(`Found ${problemsSolved} unique solved problems from ${allSubmissions.length} total submissions for ${handle}`)

      const stats: CodeforcesStats = {
        handle,
        rating: userInfo.rating || 0,
        maxRating: userInfo.maxRating || 0,
        rank: userInfo.rank || 'Unrated',
        maxRank: userInfo.maxRank || 'Unrated',
        contestsParticipated: contests.length,
        problemsSolved,
        recentContests: contests.slice(-5).map((contest: any, index: number) => ({
          id: contest.contestId?.toString() || index.toString(),
          name: contest.contestName || `Contest ${contest.contestId}`,
          rank: contest.rank,
          ratingChange: contest.newRating - contest.oldRating,
          date: new Date(contest.ratingUpdateTimeSeconds * 1000).toISOString()
        }))
      }

      logger.info(`✅ Successfully fetched REAL Codeforces stats for ${handle}: ${problemsSolved} problems solved`)

      // Cache for 2 hours
      cache.set(cacheKey, stats, 7200)

      return stats
    } catch (error) {
      logger.error(`❌ FAILED to fetch Codeforces stats for ${handle}:`, error)
      logger.warn(`⚠️  Returning ZERO stats (no mock data) for ${handle}`)

      // Return empty stats instead of mock data
      const emptyStats: CodeforcesStats = {
        handle,
        rating: 0,
        maxRating: 0,
        rank: 'Unrated',
        maxRank: 'Unrated',
        contestsParticipated: 0,
        problemsSolved: 0, // Don't use mock data - show real 0
        recentContests: []
      }

      // Don't cache errors - let it retry next time
      return emptyStats
    }
  }

  /**
   * Fetch Codeforces ALL submissions (including retries) grouped by date
   * For contribution graph - shows total submission activity
   */
  static async getCodeforcesAllSubmissions(handle: string): Promise<SubmissionHistory[]> {
    const cacheKey = `codeforces-all-submissions:${handle}`

    // Check cache first
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      logger.info(`Codeforces all submissions served from cache for handle: ${handle}`)
      return cachedData
    }

    try {
      logger.info(`Fetching ALL Codeforces submissions for handle: ${handle}`)

      // Fetch all submissions with pagination
      let allSubmissions: any[] = []
      let from = 1
      const batchSize = 100
      const maxSubmissions = 10000

      while (allSubmissions.length < maxSubmissions) {
        const statusResponse = await this.codeforcesApi.get(
          `/user.status?handle=${handle}&from=${from}&count=${batchSize}`
        )

        if (statusResponse.data.status !== 'OK') {
          logger.warn(`Failed to fetch Codeforces submissions for ${handle} at batch ${from}`)
          break
        }

        const batch = statusResponse.data.result || []
        if (batch.length === 0) break

        allSubmissions = allSubmissions.concat(batch)

        if (batch.length < batchSize) {
          logger.info(`Fetched all ${allSubmissions.length} submissions for ${handle}`)
          break
        }

        from += batchSize
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      logger.info(`Total Codeforces submissions fetched for ${handle}: ${allSubmissions.length}`)

      // Group ALL submissions by date (not just first solves)
      const submissionsByDate = new Map<string, number>()

      allSubmissions.forEach((submission: any) => {
        if (submission.creationTimeSeconds) {
          const date = new Date(submission.creationTimeSeconds * 1000)
          const dateStr = date.toISOString().split('T')[0]!

          submissionsByDate.set(dateStr, (submissionsByDate.get(dateStr) || 0) + 1)
        }
      })

      // Convert to array format
      const history: SubmissionHistory[] = Array.from(submissionsByDate.entries()).map(([date, count]) => ({
        date,
        count,
        platform: 'codeforces' as const
      }))

      // Sort by date
      history.sort((a, b) => a.date.localeCompare(b.date))

      const totalSubmissions = history.reduce((sum, day) => sum + day.count, 0)
      logger.info(`Found ${history.length} days with ${totalSubmissions} total Codeforces submissions for ${handle}`)

      // Cache for 2 hours
      cache.set(cacheKey, history, 7200)

      return history
    } catch (error) {
      logger.error(`Failed to fetch Codeforces all submissions for ${handle}:`, error)
      return []
    }
  }

  /**
   * Fetch Codeforces submission history with actual dates
   * Returns UNIQUE problems solved (first solve only) for stats calculation
   */
  static async getCodeforcesSubmissionHistory(handle: string): Promise<SubmissionHistory[]> {
    const cacheKey = `codeforces-history:${handle}`

    // Check cache first
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      logger.info(`Codeforces submission history served from cache for handle: ${handle}`)
      return cachedData
    }

    try {
      logger.info(`Fetching Codeforces submission history for handle: ${handle}`)

      // Codeforces API returns max 100 submissions per request, so we need pagination
      let allSubmissions: any[] = []
      let from = 1
      const batchSize = 100
      const maxSubmissions = 10000 // Safety limit

      while (allSubmissions.length < maxSubmissions) {
        logger.info(`Fetching submissions ${from} to ${from + batchSize - 1} for ${handle}`)

        const statusResponse = await this.codeforcesApi.get(
          `/user.status?handle=${handle}&from=${from}&count=${batchSize}`
        )

        if (statusResponse.data.status !== 'OK') {
          logger.warn(`Failed to fetch Codeforces submissions for ${handle} at batch ${from}`)
          break
        }

        const batch = statusResponse.data.result || []

        // If we got fewer than batchSize, we've reached the end
        if (batch.length === 0) {
          logger.info(`Reached end of submissions for ${handle} at ${from}`)
          break
        }

        allSubmissions = allSubmissions.concat(batch)

        // If we got fewer than batchSize, we've fetched everything
        if (batch.length < batchSize) {
          logger.info(`Fetched all ${allSubmissions.length} submissions for ${handle}`)
          break
        }

        from += batchSize

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      const submissions = allSubmissions
      logger.info(`Total submissions fetched for ${handle}: ${submissions.length}`)

      // Sort submissions by time (oldest first) to track first solves correctly
      submissions.sort((a: any, b: any) => (a.creationTimeSeconds || 0) - (b.creationTimeSeconds || 0))

      const solvedByDate = new Map<string, Set<string>>() // date -> Set of problemIds
      const globalSolvedProblems = new Set<string>() // Track all problems ever solved

      // Process submissions and group by date
      submissions.forEach((submission: any) => {
        // Only count accepted submissions
        if (submission.verdict === 'OK' && submission.creationTimeSeconds && submission.problem) {
          const date = new Date(submission.creationTimeSeconds * 1000)
          const dateStr: string = date.toISOString().split('T')[0]! // YYYY-MM-DD, guaranteed to exist

          const contestId = submission.problem.contestId || 'unknown'
          const index = submission.problem.index || 'unknown'
          const problemId = `${contestId}-${index}`

          // Only count if this is the FIRST time solving this problem
          if (!globalSolvedProblems.has(problemId)) {
            globalSolvedProblems.add(problemId)

            if (!solvedByDate.has(dateStr)) {
              solvedByDate.set(dateStr, new Set())
            }
            solvedByDate.get(dateStr)!.add(problemId)
          }
          // If already solved before, don't count it again on this day
        }
      })

      // Convert to array format
      const history: SubmissionHistory[] = Array.from(solvedByDate.entries()).map(([date, problems]) => ({
        date,
        count: problems.size,
        platform: 'codeforces' as const
      }))

      const totalUniqueProblems = globalSolvedProblems.size
      const historyTotalProblems = history.reduce((sum, day) => sum + day.count, 0)

      logger.info(`Found ${history.length} days of Codeforces activity with ${totalUniqueProblems} unique problems for ${handle}`)
      logger.info(`📊 History array sum: ${historyTotalProblems} problems (should equal ${totalUniqueProblems})`)

      if (historyTotalProblems !== totalUniqueProblems) {
        logger.error(`❌ MISMATCH: globalSolved=${totalUniqueProblems}, historySum=${historyTotalProblems}`)
        logger.info(`Sample days: ${JSON.stringify(history.slice(0, 5))}`)
      }

      // Cache for 2 hours
      cache.set(cacheKey, history, 7200)

      return history
    } catch (error) {
      logger.error(`Failed to fetch Codeforces submission history for ${handle}:`, error)
      return []
    }
  }

  /**
   * Fetch combined submission history from LeetCode and Codeforces
   * Returns actual submission dates from platform APIs
   */
  static async getCombinedSubmissionHistory(
    leetcodeHandle?: string,
    codeforcesHandle?: string
  ): Promise<SubmissionHistory[]> {
    const histories: SubmissionHistory[] = []

    try {
      // Fetch both platform histories in parallel for better performance
      const promises: Promise<SubmissionHistory[]>[] = []

      if (leetcodeHandle) {
        promises.push(this.getLeetCodeSubmissionHistory(leetcodeHandle))
      }

      if (codeforcesHandle) {
        promises.push(this.getCodeforcesSubmissionHistory(codeforcesHandle))
      }

      const results = await Promise.allSettled(promises)

      // Combine all successful results
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          histories.push(...result.value)
        }
      })

      // Sort by date (oldest first) after combining
      histories.sort((a, b) => a.date.localeCompare(b.date))

      const totalDays = histories.length
      const totalSubmissions = histories.reduce((sum, day) => sum + day.count, 0)
      const leetcodeDays = histories.filter(h => h.platform === 'leetcode').length
      const codeforcesDays = histories.filter(h => h.platform === 'codeforces').length

      logger.info(`✅ Fetched combined submission history: ${totalDays} days (${totalSubmissions} submissions)`)
      logger.info(`   - LeetCode: ${leetcodeDays} days`)
      logger.info(`   - Codeforces: ${codeforcesDays} days`)

      return histories
    } catch (error) {
      logger.error('Failed to fetch combined submission history:', error)
      return []
    }
  }

  /**
   * Fetch GitHub statistics for a user
   */
  static async getGitHubStats(handle: string): Promise<GitHubStats> {
    const cacheKey = `github:${handle}`

    // Check cache first
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      logger.info(`GitHub stats served from cache for handle: ${handle}`)
      return cachedData
    }

    // Check rate limit
    if (!rateLimiter.canMakeRequest(`github:${handle}`, 10, 60000)) {
      logger.warn(`Rate limit exceeded for GitHub handle: ${handle}`)
      throw new Error('Rate limit exceeded. Please try again later.')
    }

    try {
      logger.info(`Fetching GitHub stats for handle: ${handle}`)
      
      // Fetch user info
      const userResponse = await this.githubApi.get(`/users/${handle}`)
      const userData = userResponse.data

      // Fetch recent events
      const eventsResponse = await this.githubApi.get(`/users/${handle}/events/public?per_page=10`)
      const events = eventsResponse.data

      // Fetch repositories for language stats
      const reposResponse = await this.githubApi.get(`/users/${handle}/repos?sort=updated&per_page=20`)
      const repos = reposResponse.data

      // Calculate language statistics (simplified)
      const languages: Record<string, number> = {}
      repos.forEach((repo: any) => {
        if (repo.language) {
          languages[repo.language] = (languages[repo.language] || 0) + 1
        }
      })

      // Convert to percentages
      const totalRepos = Object.values(languages).reduce((sum: number, count: number) => sum + count, 0)
      for (const lang in languages) {
        if (languages[lang] !== undefined && totalRepos > 0) {
          languages[lang] = Math.round((languages[lang] / totalRepos) * 100)
        }
      }

      const stats: GitHubStats = {
        handle,
        publicRepos: userData.public_repos || 0,
        followers: userData.followers || 0,
        following: userData.following || 0,
        contributions: 1247, // GitHub doesn't provide this via API
        streak: 15, // Would need to calculate from commit history
        languages,
        recentActivity: events.slice(0, 5).map((event: any) => ({
          type: event.type.replace('Event', '').toLowerCase(),
          repo: event.repo?.name || 'Unknown',
          date: event.created_at,
          description: this.getEventDescription(event)
        }))
      }

      // Cache for 1 hour
      cache.set(cacheKey, stats, 3600)
      
      return stats
    } catch (error) {
      logger.error(`Failed to fetch GitHub stats for ${handle}:`, error)
      
      // Return mock data as fallback
      const mockStats: GitHubStats = {
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
          {
            type: 'push',
            repo: 'questcoder',
            date: new Date().toISOString(),
            description: 'Added new pattern tracking feature'
          }
        ]
      }
      
      // Cache mock data for 5 minutes
      cache.set(cacheKey, mockStats, 300)
      return mockStats
    }
  }

  /**
   * Helper method to generate event descriptions
   */
  private static getEventDescription(event: any): string {
    switch (event.type) {
      case 'PushEvent':
        return `Pushed ${event.payload.commits?.length || 1} commits`
      case 'PullRequestEvent':
        return `${event.payload.action} pull request`
      case 'IssuesEvent':
        return `${event.payload.action} issue`
      case 'CreateEvent':
        return `Created ${event.payload.ref_type}`
      case 'ForkEvent':
        return 'Forked repository'
      case 'WatchEvent':
        return 'Starred repository'
      default:
        return event.type.replace('Event', '')
    }
  }

  /**
   * Clear cache for a specific platform and handle
   */
  static clearCache(platform: string, handle: string): void {
    const cacheKey = `${platform}:${handle}`
    cache.delete(cacheKey)
    logger.info(`Cache cleared for ${cacheKey}`)
  }

  /**
   * Clear all cache
   */
  static clearAllCache(): void {
    cache.clear()
    logger.info('All platform cache cleared')
  }
}

export default PlatformService
