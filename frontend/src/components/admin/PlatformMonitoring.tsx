import React, { useState, useEffect } from 'react'
import { useSocket } from '@/contexts/SocketContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Activity,
  Server,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  TrendingUp,
  Wifi,
  WifiOff,
  Zap,
  AlertCircle
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface PlatformStatus {
  _id: string
  platform: string
  status: 'operational' | 'degraded' | 'down'
  lastChecked: string
  responseTime: number
  uptime: number
  errorCount: number
  lastError?: string
}

// interface StatusHistory {
//   timestamp: string
//   platform: string
//   status: string
//   responseTime: number
// }

const PlatformMonitoring: React.FC = () => {
  const { socket } = useSocket()
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  // const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([])

  // Load platform statuses
  const loadPlatformStatuses = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/platform-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load platform statuses')
      }

      const result = await response.json()
      setPlatformStatuses(result.data)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading platform statuses:', error)
      setError(error instanceof Error ? error.message : 'Failed to load platform statuses')
    } finally {
      setLoading(false)
    }
  }

  // Load platform statuses on mount
  useEffect(() => {
    loadPlatformStatuses()
  }, [])

  // Socket.IO listeners for real-time updates
  useEffect(() => {
    if (!socket) return

    // Listen for platform status updates
    socket.on('platform-status-update', (data: { statuses: PlatformStatus[], timestamp: string }) => {
      setPlatformStatuses(data.statuses)
      setLastUpdated(new Date(data.timestamp))
      
      // Add to history for charts
      // const newHistory = data.statuses.map(status => ({
      //   timestamp: data.timestamp,
      //   platform: status.platform,
      //   status: status.status,
      //   responseTime: status.responseTime
      // }))
      
      // setStatusHistory(prev => [...prev.slice(-50), ...newHistory]) // Keep last 50 entries
    })

    // Listen for critical alerts
    socket.on('platform-critical-alert', (data: { downPlatforms: any[] }) => {
      console.warn('Critical platform alert received:', data)
      // Could trigger a notification here
    })

    // Listen for monitoring errors
    socket.on('monitoring-error', (data: { error: string }) => {
      console.error('Monitoring error received:', data.error)
      setError(`Monitoring error: ${data.error}`)
    })

    return () => {
      socket.off('platform-status-update')
      socket.off('platform-critical-alert')
      socket.off('monitoring-error')
    }
  }, [socket])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'degraded':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'down':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <Server className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800'
      case 'down':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 1000) return 'text-green-600'
    if (responseTime < 3000) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99) return 'text-green-600'
    if (uptime >= 95) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getStatusSummary = () => {
    const operational = platformStatuses.filter(p => p.status === 'operational').length
    const degraded = platformStatuses.filter(p => p.status === 'degraded').length
    const down = platformStatuses.filter(p => p.status === 'down').length
    
    return { operational, degraded, down, total: platformStatuses.length }
  }

  const summary = getStatusSummary()

  // Prepare chart data
  const responseTimeData = platformStatuses.map(platform => ({
    name: platform.platform,
    responseTime: platform.responseTime,
    uptime: platform.uptime
  }))


  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Platform Monitoring</h2>
          <p className="text-gray-600">Real-time status of external API integrations</p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <Button
            onClick={loadPlatformStatuses}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{summary.operational}</div>
                <div className="text-sm text-gray-600">Operational</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{summary.degraded}</div>
                <div className="text-sm text-gray-600">Degraded</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{summary.down}</div>
                <div className="text-sm text-gray-600">Down</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
                <div className="text-sm text-gray-600">Total Platforms</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Platform Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {platformStatuses.map((platform) => (
          <Card key={platform._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize flex items-center space-x-2">
                  {getStatusIcon(platform.status)}
                  <span>{platform.platform}</span>
                </CardTitle>
                <Badge className={getStatusColor(platform.status)}>
                  {platform.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Response Time */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className={`font-medium ${getResponseTimeColor(platform.responseTime)}`}>
                    {formatResponseTime(platform.responseTime)}
                  </span>
                </div>

                {/* Uptime */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className={`font-medium ${getUptimeColor(platform.uptime)}`}>
                    {platform.uptime.toFixed(2)}%
                  </span>
                </div>

                {/* Error Count */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Error Count</span>
                  <span className="font-medium text-gray-900">
                    {platform.errorCount}
                  </span>
                </div>

                {/* Last Checked */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Checked</span>
                  <span className="text-sm text-gray-900">
                    {new Date(platform.lastChecked).toLocaleTimeString()}
                  </span>
                </div>

                {/* Last Error */}
                {platform.lastError && (
                  <div className="pt-2 border-t">
                    <div className="text-sm text-gray-600 mb-1">Last Error</div>
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {platform.lastError}
                    </div>
                  </div>
                )}

                {/* Status Indicator */}
                <div className="pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    {platform.status === 'operational' ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm text-gray-600">
                      {platform.status === 'operational' 
                        ? 'All systems operational' 
                        : platform.status === 'degraded'
                        ? 'Performance issues detected'
                        : 'Service unavailable'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Response Time Chart */}
      {responseTimeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Response Time Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip />
                  <Bar 
                    dataKey="responseTime" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Status Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Real-time monitoring active</span>
            </div>
            {socket && (
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-600">Connected to live updates</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PlatformMonitoring





