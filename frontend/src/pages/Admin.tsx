import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/contexts/SocketContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Navigate } from 'react-router-dom'
import { 
  Users, 
  Activity, 
  Shield, 
  TrendingUp,
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  UserCheck
} from 'lucide-react'
import UserManagement from '@/components/admin/UserManagement'
import PlatformMonitoring from '@/components/admin/PlatformMonitoring'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  adminUsers: number
  newUsersThisMonth: number
  usersWithPlatformHandles: {
    leetcode: number
    codeforces: number
    github: number
    hackerrank: number
    hackerearth: number
  }
}

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

interface RecentActivity {
  newUsers: Array<{
    _id: string
    username: string
    email: string
    createdAt: string
  }>
  recentLogins: Array<{
    _id: string
    username: string
    lastLoginAt: string
  }>
}

interface DashboardData {
  userStats: AdminStats
  platformStatus: PlatformStatus[]
  recentActivity: RecentActivity
}

const Admin: React.FC = () => {
  const { checkAdminAccess, isLoading } = useAuth()
  const { socket } = useSocket()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'monitoring'>('overview')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check admin access
  if (!isLoading && !checkAdminAccess()) {
    return <Navigate to="/dashboard" replace />
  }

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoadingData(true)
        const response = await fetch('/api/admin/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load dashboard data')
        }

        const result = await response.json()
        setDashboardData(result.data)
        setError(null)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load data')
      } finally {
        setLoadingData(false)
      }
    }

    if (checkAdminAccess()) {
      loadDashboardData()
    }
  }, [checkAdminAccess])

  // Socket.IO listeners for real-time updates
  useEffect(() => {
    if (!socket) return

    // Join admin room for real-time updates
    socket.emit('join-admin')

    // Listen for platform status updates
    socket.on('platform-status-update', (data: { statuses: PlatformStatus[] }) => {
      setDashboardData(prev => prev ? {
        ...prev,
        platformStatus: data.statuses
      } : null)
    })

    // Listen for critical alerts
    socket.on('platform-critical-alert', (data: { downPlatforms: any[] }) => {
      console.warn('Critical platform alert:', data)
      // Could show toast notification here
    })

    // Listen for monitoring errors
    socket.on('monitoring-error', (data: { error: string }) => {
      console.error('Monitoring error:', data.error)
    })

    return () => {
      socket.off('platform-status-update')
      socket.off('platform-critical-alert')
      socket.off('monitoring-error')
      socket.emit('leave-admin')
    }
  }, [socket])

  if (isLoading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'degraded':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'down':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Server className="h-4 w-4 text-gray-500" />
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users and monitor platform health</p>
        </div>
        <Badge variant="secondary" className="flex items-center space-x-1">
          <Shield className="h-4 w-4" />
          <span>Admin Access</span>
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
          className="flex items-center space-x-2"
        >
          <BarChart3 className="h-4 w-4" />
          <span>Overview</span>
        </Button>
        <Button
          variant={activeTab === 'users' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('users')}
          className="flex items-center space-x-2"
        >
          <Users className="h-4 w-4" />
          <span>User Management</span>
        </Button>
        <Button
          variant={activeTab === 'monitoring' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('monitoring')}
          className="flex items-center space-x-2"
        >
          <Activity className="h-4 w-4" />
          <span>Platform Monitoring</span>
        </Button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && dashboardData && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.userStats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.userStats.activeUsers} active users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Users</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.userStats.newUsersThisMonth}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData.platformStatus.filter(p => p.status === 'operational').length}
                  /
                  {dashboardData.platformStatus.length}
                </div>
                <p className="text-xs text-muted-foreground">Platforms operational</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.userStats.adminUsers}</div>
                <p className="text-xs text-muted-foreground">Admin users</p>
              </CardContent>
            </Card>
          </div>

          {/* Platform Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>Platform Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.platformStatus.map((platform) => (
                  <div key={platform._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(platform.status)}
                      <div>
                        <div className="font-medium capitalize">{platform.platform}</div>
                        <div className="text-sm text-gray-500">
                          {platform.responseTime}ms • {platform.uptime.toFixed(1)}% uptime
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(platform.status)}>
                      {platform.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.recentActivity.newUsers.map((user) => (
                    <div key={user._id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Logins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.recentActivity.recentLogins.map((user) => (
                    <div key={user._id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{user.username}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.lastLoginAt ? 
                          new Date(user.lastLoginAt).toLocaleDateString() : 
                          'Never'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && <UserManagement />}

      {/* Platform Monitoring Tab */}
      {activeTab === 'monitoring' && <PlatformMonitoring />}
    </div>
  )
}

export default Admin

