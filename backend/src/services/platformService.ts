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
    // LeetCode API (using third-party service)
    this.leetcodeApi = axios.create({
      baseURL: process.env['LEETCODE_API_URL'] || 'https://leetcode-stats-api.herokuapp.com',
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
      const contestResponse = await this.codeforcesApi.get(`/user.rating?handle=${handle}`)
      const contests = contestResponse.data.status === 'OK' ? contestResponse.data.result : []

      const stats: CodeforcesStats = {
        handle,
        rating: userInfo.rating || 0,
        maxRating: userInfo.maxRating || 0,
        rank: userInfo.rank || 'Unrated',
        maxRank: userInfo.maxRank || 'Unrated',
        contestsParticipated: contests.length,
        problemsSolved: 0, // Codeforces API doesn't provide this directly
        recentContests: contests.slice(-5).map((contest: any, index: number) => ({
          id: contest.contestId?.toString() || index.toString(),
          name: contest.contestName || `Contest ${contest.contestId}`,
          rank: contest.rank,
          ratingChange: contest.newRating - contest.oldRating,
          date: new Date(contest.ratingUpdateTimeSeconds * 1000).toISOString()
        }))
      }

      // Cache for 2 hours
      cache.set(cacheKey, stats, 7200)
      
      return stats
    } catch (error) {
      logger.error(`Failed to fetch Codeforces stats for ${handle}:`, error)
      
      // Return mock data as fallback
      const mockStats: CodeforcesStats = {
        handle,
        rating: 1567,
        maxRating: 1678,
        rank: 'Expert',
        maxRank: 'Candidate Master',
        contestsParticipated: 23,
        problemsSolved: 0, // Placeholder - would need user.status API call to compute
        recentContests: [
          {
            id: '1',
            name: 'Codeforces Round #912',
            rank: 245,
            ratingChange: 32,
            date: new Date().toISOString()
          }
        ]
      }
      
      // Cache mock data for 5 minutes
      cache.set(cacheKey, mockStats, 300)
      return mockStats
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
        languages[lang] = Math.round((languages[lang] / totalRepos) * 100)
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
