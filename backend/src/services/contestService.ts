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
}

// Global cache instance for contests
const contestCache = new MemoryCache()

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

export interface Contest {
  name: string
  url: string
  start_time: string
  end_time: string
  duration: string
  site: string
  in_24_hours: string
  status: string
}

export interface ContestResponse {
  success: boolean
  data: Contest[]
  lastUpdated: string
  cached: boolean
}

export class ContestService {
  private static competeApi: AxiosInstance

  static {
    // CompeteAPI for real contest data from LeetCode, Codeforces, etc.
    this.competeApi = axios.create({
      baseURL: process.env['COMPETE_API_URL'] || 'https://competeapi.vercel.app',
      timeout: 15000,
      headers: {
        'User-Agent': 'QuestCoder/1.0'
      }
    })
  }

  /**
   * Fetch upcoming contests from CompeteAPI (LeetCode, Codeforces, etc.)
   */
  static async getUpcomingContestsFromAPI(platform?: string): Promise<Contest[]> {
    try {
      logger.info(`Fetching contest data from CompeteAPI for platform: ${platform || 'all'}`)

      const response = await this.competeApi.get('/contests/upcoming/')

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response from CompeteAPI')
      }

      const contests = response.data
      const now = new Date().getTime()

      // Filter and transform contests
      let filteredContests = contests
        .filter((contest: any) => {
          // Only include LeetCode and Codeforces
          const site = contest.site?.toLowerCase()
          if (site !== 'leetcode' && site !== 'codeforces') {
            return false
          }

          // Apply platform filter if specified
          if (platform && site !== platform.toLowerCase()) {
            return false
          }

          // Only include upcoming contests
          const startTime = contest.startTime
          return startTime > now
        })
        .map((contest: any) => {
          const startTime = new Date(contest.startTime)
          const endTime = new Date(contest.endTime || (contest.startTime + contest.duration))
          const durationMs = contest.duration || (endTime.getTime() - startTime.getTime())
          const hoursUntilStart = (contest.startTime - now) / (1000 * 60 * 60)

          return {
            name: contest.title,
            url: contest.url || `https://${contest.site}.com/contest/`,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration: Math.floor(durationMs / 1000).toString(), // Convert to seconds
            site: contest.site,
            in_24_hours: hoursUntilStart <= 24 ? 'Yes' : 'No',
            status: 'BEFORE'
          } as Contest
        })
        .sort((a: Contest, b: Contest) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

      logger.info(`Found ${filteredContests.length} upcoming contests from CompeteAPI`)
      return filteredContests

    } catch (error: any) {
      logger.error('Failed to fetch contests from CompeteAPI:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url
      })

      // Return empty array on error - fallback will be handled in main method
      return []
    }
  }

  /**
   * Fetch upcoming contests from LeetCode and Codeforces
   */
  static async getUpcomingContests(platform?: string): Promise<ContestResponse> {
    const cacheKey = `contests:${platform || 'all'}`

    // Check cache first
    const cachedData = contestCache.get(cacheKey)
    if (cachedData) {
      logger.info(`Contest data served from cache for platform: ${platform || 'all'}`)
      return {
        success: true,
        data: cachedData,
        lastUpdated: new Date().toISOString(),
        cached: true
      }
    }

    // Check rate limit (skip in development for easier testing)
    const isDevelopment = process.env['NODE_ENV'] === 'development'

    if (!isDevelopment) {
      const rateLimitKey = `contests:${platform || 'all'}`
      const maxRequests = 30
      const windowMs = 300000  // 5 minutes

      if (!rateLimiter.canMakeRequest(rateLimitKey, maxRequests, windowMs)) {
        logger.warn(`Rate limit exceeded for contests API: ${rateLimitKey}`)
        throw new Error('Rate limit exceeded. Please try again later.')
      }
    }

    try {
      logger.info(`Fetching contest data for platform: ${platform || 'all'}`)

      // Fetch contests from CompeteAPI
      const upcomingContests = await this.getUpcomingContestsFromAPI(platform)

      logger.info(`Found ${upcomingContests.length} upcoming contests`)

      // Cache for 30 minutes (shorter cache for real-time data)
      contestCache.set(cacheKey, upcomingContests, 1800)

      return {
        success: true,
        data: upcomingContests,
        lastUpdated: new Date().toISOString(),
        cached: false
      }
    } catch (error: any) {
      logger.error('Failed to fetch contest data:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      })

      // Return fallback mock data
      let fallbackContests: Contest[] = []

      try {
        // Provide minimal fallback data
        const now = new Date()
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        if (!platform || platform === 'all' || platform.toLowerCase() === 'leetcode') {
          fallbackContests.push({
            name: 'Weekly Contest (API Unavailable)',
            url: 'https://leetcode.com/contest/',
            start_time: nextWeek.toISOString(),
            end_time: new Date(nextWeek.getTime() + 90 * 60 * 1000).toISOString(),
            duration: '5400',
            site: 'leetcode',
            in_24_hours: 'No',
            status: 'BEFORE'
          })
        }

        if (!platform || platform === 'all' || platform.toLowerCase() === 'codeforces') {
          const nextWeekend = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000)
          fallbackContests.push({
            name: 'Codeforces Round (API Unavailable)',
            url: 'https://codeforces.com/contests',
            start_time: nextWeekend.toISOString(),
            end_time: new Date(nextWeekend.getTime() + 2 * 60 * 60 * 1000).toISOString(),
            duration: '7200',
            site: 'codeforces',
            in_24_hours: 'No',
            status: 'BEFORE'
          })
        }
      } catch {
        // If even fallback fails, provide empty array
      }

      // Cache fallback data for 5 minutes
      contestCache.set(cacheKey, fallbackContests, 300)

      return {
        success: true,
        data: fallbackContests,
        lastUpdated: new Date().toISOString(),
        cached: false
      }
    }
  }

  /**
   * Get contests by specific platform
   */
  static async getLeetCodeContests(): Promise<ContestResponse> {
    return this.getUpcomingContests('leetcode')
  }

  static async getCodeforcesContests(): Promise<ContestResponse> {
    return this.getUpcomingContests('codeforces')
  }

  /**
   * Clear cache for contests
   */
  static clearCache(platform?: string): void {
    const cacheKey = `contests:${platform || 'all'}`
    contestCache.delete(cacheKey)
    logger.info(`Contest cache cleared for: ${cacheKey}`)
  }

  /**
   * Clear all contest cache
   */
  static clearAllCache(): void {
    contestCache.clear()
    logger.info('All contest cache cleared')
  }

  /**
   * Get contest status based on current time
   */
  static getContestStatus(contest: Contest): string {
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

  /**
   * Calculate time until contest starts
   */
  static getTimeUntilStart(contest: Contest): string {
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
}

export default ContestService