import cron from 'node-cron'
import monitoringService from '@/services/monitoringService'
import { logger } from '@/utils/logger'
import { Server as SocketServer } from 'socket.io'

class PlatformMonitoringJob {
  private isRunning: boolean = false
  private socketServer?: SocketServer

  constructor() {
    this.startMonitoring()
  }

  // Set the Socket.IO server instance for real-time updates
  setSocketServer(socketServer: SocketServer): void {
    this.socketServer = socketServer
    logger.info('Socket.IO server connected to platform monitoring job')
  }

  // Start the monitoring cron job
  startMonitoring(): void {
    // Run every 5 minutes: */5 * * * *
    // For testing/demo purposes, you might want to use */1 * * * * (every minute)
    cron.schedule('*/5 * * * *', async () => {
      if (this.isRunning) {
        logger.warn('Platform monitoring job already running, skipping this iteration')
        return
      }

      this.isRunning = true
      
      try {
        logger.info('Starting scheduled platform monitoring check')
        await this.runMonitoringCheck()
        logger.info('Completed scheduled platform monitoring check')
      } catch (error) {
        logger.error('Error in scheduled platform monitoring:', error)
      } finally {
        this.isRunning = false
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    })

    logger.info('Platform monitoring cron job started (runs every 5 minutes)')
  }

  // Run the actual monitoring check
  async runMonitoringCheck(): Promise<void> {
    try {
      // Update all platform statuses
      const updatedStatuses = await monitoringService.updateAllPlatformStatuses()

      // Emit real-time updates to admin dashboard via Socket.IO
      if (this.socketServer) {
        this.socketServer.to('admin').emit('platform-status-update', {
          timestamp: new Date().toISOString(),
          statuses: updatedStatuses
        })
        
        logger.debug('Emitted platform status updates to admin clients', {
          platformCount: updatedStatuses.length
        })
      }

      // Log summary of current status
      const statusSummary = updatedStatuses.reduce((acc, status) => {
        acc[status.status] = (acc[status.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      logger.info('Platform monitoring check completed', {
        totalPlatforms: updatedStatuses.length,
        statusSummary,
        averageResponseTime: this.calculateAverageResponseTime(updatedStatuses)
      })

      // Check for critical issues and alert
      const downPlatforms = updatedStatuses.filter(status => status.status === 'down')
      if (downPlatforms.length > 0) {
        logger.warn('Critical: Platforms are down', {
          downPlatforms: downPlatforms.map(p => p.platform)
        })
        
        // Emit critical alert to admin clients
        if (this.socketServer) {
          this.socketServer.to('admin').emit('platform-critical-alert', {
            timestamp: new Date().toISOString(),
            downPlatforms: downPlatforms.map(p => ({
              platform: p.platform,
              lastError: p.lastError,
              lastChecked: p.lastChecked
            }))
          })
        }
      }

    } catch (error) {
      logger.error('Error during platform monitoring check:', error)
      
      // Emit error notification to admin clients
      if (this.socketServer) {
        this.socketServer.to('admin').emit('monitoring-error', {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown monitoring error'
        })
      }
      
      throw error
    }
  }

  // Manual trigger for monitoring check (for testing or immediate updates)
  async triggerManualCheck(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Monitoring check is already running')
    }

    logger.info('Manual platform monitoring check triggered')
    
    this.isRunning = true
    try {
      await this.runMonitoringCheck()
    } finally {
      this.isRunning = false
    }
  }

  // Initialize platform statuses on startup
  async initializePlatforms(): Promise<void> {
    try {
      logger.info('Initializing platform monitoring on startup')
      
      // Initialize platform status records
      await monitoringService.initializePlatformStatuses()
      
      // Run initial health check
      await this.runMonitoringCheck()
      
      logger.info('Platform monitoring initialization completed')
    } catch (error) {
      logger.error('Error initializing platform monitoring:', error)
      throw error
    }
  }

  // Get monitoring status
  getStatus(): { isRunning: boolean; hasSocketServer: boolean } {
    return {
      isRunning: this.isRunning,
      hasSocketServer: !!this.socketServer
    }
  }

  // Calculate average response time
  private calculateAverageResponseTime(statuses: any[]): number {
    if (statuses.length === 0) return 0
    
    const totalResponseTime = statuses.reduce((sum, status) => sum + (status.responseTime || 0), 0)
    return Math.round(totalResponseTime / statuses.length)
  }

  // Stop monitoring (for graceful shutdown)
  stopMonitoring(): void {
    this.isRunning = false
    logger.info('Platform monitoring stopped')
  }

  // Healthcheck endpoint helper
  async getHealthStatus(): Promise<{
    monitoring: {
      isActive: boolean
      lastCheck?: Date | undefined
      platformCount: number
    }
    platforms: Array<{
      name: string
      status: string
      uptime: number
      lastChecked: Date
    }>
  }> {
    try {
      const platforms = await monitoringService.getPlatformStatuses()
      
      return {
        monitoring: {
          isActive: !this.isRunning, // Not currently running means it's in normal cycle
          ...(platforms.length > 0 && {
            lastCheck: new Date(Math.max(...platforms.map(p => new Date(p.lastChecked).getTime())))
          }),
          platformCount: platforms.length
        },
        platforms: platforms.map(p => ({
          name: p.platform,
          status: p.status,
          uptime: p.uptime,
          lastChecked: p.lastChecked
        }))
      }
    } catch (error) {
      logger.error('Error getting health status:', error)
      throw error
    }
  }
}

// Export singleton instance
const platformMonitoringJob = new PlatformMonitoringJob()
export default platformMonitoringJob

