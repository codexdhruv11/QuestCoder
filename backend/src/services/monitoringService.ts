import axios, { AxiosError } from 'axios'
import PlatformStatus, { IPlatformStatus } from '@/models/PlatformStatus'
import { logger } from '@/utils/logger'

export interface HealthCheckResult {
  platform: string
  status: 'operational' | 'degraded' | 'down'
  responseTime: number
  error?: string
}

export interface PlatformEndpoint {
  name: 'leetcode' | 'codeforces' | 'github' | 'hackerrank' | 'hackerearth'
  url: string
  method: 'GET' | 'POST'
  headers?: Record<string, string>
  timeout: number
  expectedStatus?: number[]
  healthyResponseTime: number // Response time threshold for 'operational' status
  degradedResponseTime: number // Response time threshold for 'degraded' status
}

class MonitoringService {
  private readonly platforms: PlatformEndpoint[] = [
    {
      name: 'leetcode',
      url: 'https://leetcode.com/api/problems/all/',
      method: 'GET',
      timeout: 10000,
      expectedStatus: [200],
      healthyResponseTime: 2000,
      degradedResponseTime: 5000
    },
    {
      name: 'codeforces',
      url: 'https://codeforces.com/api/user.info?handles=tourist',
      method: 'GET',
      timeout: 10000,
      expectedStatus: [200],
      healthyResponseTime: 3000,
      degradedResponseTime: 7000
    },
    {
      name: 'github',
      url: 'https://api.github.com/zen',
      method: 'GET',
      headers: {
        'User-Agent': 'QuestCoder-Monitor'
      },
      timeout: 8000,
      expectedStatus: [200],
      healthyResponseTime: 1500,
      degradedResponseTime: 4000
    },
    {
      name: 'hackerrank',
      url: 'https://www.hackerrank.com/',
      method: 'GET',
      timeout: 12000,
      expectedStatus: [200],
      healthyResponseTime: 3000,
      degradedResponseTime: 8000
    },
    {
      name: 'hackerearth',
      url: 'https://www.hackerearth.com/',
      method: 'GET',
      timeout: 12000,
      expectedStatus: [200],
      healthyResponseTime: 3000,
      degradedResponseTime: 8000
    }
  ]

  // Check health of a specific platform
  async checkPlatformHealth(platform: PlatformEndpoint): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      logger.debug(`Checking health for ${platform.name}`, { url: platform.url })

      const response = await axios({
        method: platform.method,
        url: platform.url,
        headers: platform.headers,
        timeout: platform.timeout,
        validateStatus: (status) => platform.expectedStatus?.includes(status) ?? status < 400
      })

      const responseTime = Date.now() - startTime
      
      // Determine status based on response time
      let status: 'operational' | 'degraded' | 'down'
      if (responseTime <= platform.healthyResponseTime) {
        status = 'operational'
      } else if (responseTime <= platform.degradedResponseTime) {
        status = 'degraded'
      } else {
        status = 'degraded' // Still responding but very slow
      }

      logger.info(`Platform health check successful`, {
        platform: platform.name,
        status,
        responseTime,
        httpStatus: response.status
      })

      return {
        platform: platform.name,
        status,
        responseTime
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      let errorMessage = 'Unknown error'
      let status: 'degraded' | 'down' = 'down'

      if (error instanceof AxiosError) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timeout'
          status = 'down'
        } else if (error.response) {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`
          status = error.response.status >= 500 ? 'down' : 'degraded'
        } else if (error.request) {
          errorMessage = 'Network error - no response received'
          status = 'down'
        } else {
          errorMessage = error.message
        }
      } else {
        errorMessage = error instanceof Error ? error.message : String(error)
      }

      logger.warn(`Platform health check failed`, {
        platform: platform.name,
        status,
        responseTime,
        error: errorMessage
      })

      return {
        platform: platform.name,
        status,
        responseTime,
        error: errorMessage
      }
    }
  }

  // Check health of all platforms
  async checkAllPlatforms(): Promise<HealthCheckResult[]> {
    logger.info('Starting health checks for all platforms')
    
    try {
      const results = await Promise.allSettled(
        this.platforms.map(platform => this.checkPlatformHealth(platform))
      )

      const healthCheckResults: HealthCheckResult[] = []

      results.forEach((result, index) => {
        const platform = this.platforms[index]
        
        if (result.status === 'fulfilled') {
          healthCheckResults.push(result.value)
        } else {
          logger.error(`Health check promise failed for ${platform?.name || 'unknown'}:`, result.reason)
          healthCheckResults.push({
            platform: platform?.name || 'unknown',
            status: 'down',
            responseTime: 0,
            error: 'Health check failed to execute'
          })
        }
      })

      logger.info('Completed health checks for all platforms', {
        totalPlatforms: this.platforms.length,
        operational: healthCheckResults.filter(r => r.status === 'operational').length,
        degraded: healthCheckResults.filter(r => r.status === 'degraded').length,
        down: healthCheckResults.filter(r => r.status === 'down').length
      })

      return healthCheckResults
    } catch (error) {
      logger.error('Error during platform health checks:', error)
      throw error
    }
  }

  // Update platform status in database
  async updatePlatformStatus(healthCheck: HealthCheckResult): Promise<IPlatformStatus> {
    try {
      let platformStatus = await PlatformStatus.findOne({ platform: healthCheck.platform })

      if (!platformStatus) {
        // Create new platform status record
        platformStatus = new PlatformStatus({
          platform: healthCheck.platform,
          status: healthCheck.status,
          lastChecked: new Date(),
          responseTime: healthCheck.responseTime,
          errorCount: healthCheck.status !== 'operational' ? 1 : 0,
          lastError: healthCheck.error,
          uptime: healthCheck.status === 'operational' ? 100 : 90
        })
      } else {
        // Update existing record
        platformStatus.updateStatus(healthCheck.status, healthCheck.responseTime, healthCheck.error)
      }

      await platformStatus.save()

      logger.debug(`Updated platform status for ${healthCheck.platform}`, {
        status: healthCheck.status,
        responseTime: healthCheck.responseTime,
        uptime: platformStatus.uptime
      })

      return platformStatus
    } catch (error) {
      logger.error(`Error updating platform status for ${healthCheck.platform}:`, error)
      throw error
    }
  }

  // Update all platform statuses
  async updateAllPlatformStatuses(): Promise<IPlatformStatus[]> {
    try {
      const healthCheckResults = await this.checkAllPlatforms()
      
      const updatePromises = healthCheckResults.map(result => 
        this.updatePlatformStatus(result)
      )

      const updatedStatuses = await Promise.allSettled(updatePromises)
      
      const results: IPlatformStatus[] = []
      updatedStatuses.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          logger.error(`Failed to update status for ${healthCheckResults[index]?.platform || 'unknown'}:`, result.reason)
        }
      })

      return results
    } catch (error) {
      logger.error('Error updating all platform statuses:', error)
      throw error
    }
  }

  // Get current platform statuses from database
  async getPlatformStatuses(): Promise<IPlatformStatus[]> {
    try {
      const statuses = await PlatformStatus.find().sort({ platform: 1 })
      return statuses
    } catch (error) {
      logger.error('Error getting platform statuses:', error)
      throw error
    }
  }

  // Initialize platform statuses (create records if they don't exist)
  async initializePlatformStatuses(): Promise<void> {
    try {
      logger.info('Initializing platform statuses')

      for (const platform of this.platforms) {
        const existingStatus = await PlatformStatus.findOne({ platform: platform.name })
        
        if (!existingStatus) {
          const newStatus = new PlatformStatus({
            platform: platform.name,
            status: 'operational',
            lastChecked: new Date(),
            responseTime: 0,
            errorCount: 0,
            uptime: 100
          })
          
          await newStatus.save()
          logger.info(`Created initial status record for ${platform.name}`)
        }
      }

      logger.info('Platform status initialization completed')
    } catch (error) {
      logger.error('Error initializing platform statuses:', error)
      throw error
    }
  }

  // Get platform configuration
  getPlatformConfig(platformName: string): PlatformEndpoint | undefined {
    return this.platforms.find(p => p.name === platformName)
  }

  // Get all supported platforms
  getSupportedPlatforms(): string[] {
    return this.platforms.map(p => p.name)
  }
}

export default new MonitoringService()





