import axios from 'axios'
import { SignupForm } from '../types'

type AxiosError = any
type AxiosResponse = any

// Create axios instance with enhanced configuration
const api: any = (axios as any).create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000, // Increased timeout for slower connections and large data loads
  headers: {
    'Content-Type': 'application/json',
  },
  // Performance optimizations
  maxRedirects: 5,
  withCredentials: true, // Enable credentials for CORS
})

// Connection status monitoring
let isOnline = navigator.onLine
let lastRequestTime = Date.now()

window.addEventListener('online', () => {
  isOnline = true
  console.log('API: Connection restored')
})

window.addEventListener('offline', () => {
  isOnline = false
  console.log('API: Connection lost')
})

// Request cancellation support
const cancelTokenSource = (axios as any).CancelToken.source()

// Retry configuration
const MAX_RETRY_ATTEMPTS = 3
const BASE_RETRY_DELAY = 1000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const shouldRetry = (error: AxiosError, attempt: number): boolean => {
  if (attempt >= MAX_RETRY_ATTEMPTS) return false
  
  // Retry on network errors
  if (!error.response) return true
  
  // Retry on 5xx server errors
  if (error.response.status >= 500) return true
  
  // Retry on 429 (rate limit)
  if (error.response.status === 429) return true
  
  return false
}

const retryRequest = async (error: AxiosError, attempt: number = 1): Promise<any> => {
  if (!shouldRetry(error, attempt)) {
    throw error
  }
  
  const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1) + Math.random() * 1000
  console.log(`API: Retrying request (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}) in ${Math.round(delay)}ms`)
  
  await sleep(delay)
  
  // Recreate the request with original config
  return api.request(error.config!)
}

// Request interceptor with enhanced features
api.interceptors.request.use(
  (config: any) => {
    // Add timestamp for performance monitoring
    config.metadata = { startTime: Date.now() }
    lastRequestTime = Date.now()
    
    // Add auth token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add request cancellation token
    config.cancelToken = cancelTokenSource.token
    
    // Development logging
    if (import.meta.env['VITE_DEBUG_API_CALLS'] === 'true') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
        headers: config.headers
      })
    }
    
    // Check offline status
    if (!isOnline) {
      console.warn('API: Making request while offline')
    }
    
    return config
  },
  (error: any) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Token refresh flag to prevent multiple refresh attempts
let isRefreshingToken = false
let failedQueue: Array<{ resolve: Function; reject: Function }> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  
  failedQueue = []
}

// Response interceptor with enhanced error handling and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Performance logging
    if (response.config.metadata && import.meta.env['VITE_DEBUG_API_CALLS'] === 'true') {
      const duration = Date.now() - response.config.metadata.startTime
      console.log(`API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`, response.data)
    }
    
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any
    
    // Log error details
    if (import.meta.env['VITE_DEBUG_API_CALLS'] === 'true') {
      console.error('API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        message: error.message,
        data: error.response?.data
      })
    }
    
    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshingToken) {
        // Queue the request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshingToken = true

      try {
        // Attempt to refresh token
        const response = await api.post('/auth/refresh', {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        
        const newToken = response.data.token || response.data.data?.token
        if (newToken) {
          localStorage.setItem('token', newToken)
          api.defaults.headers['Authorization'] = `Bearer ${newToken}`
          processQueue(null, newToken)
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Clear auth data and redirect to login
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        console.log('Token refresh failed, redirecting to login')
        window.location.href = '/login'
      } finally {
        isRefreshingToken = false
      }
    }
    
    // Enhanced error handling with specific error types
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data)
      throw new Error('You do not have permission to access this resource')
    } else if (error.response?.status === 429) {
      console.error('Rate limited:', error.response.data)
      throw new Error('Too many requests. Please wait before trying again')
    } else if (error.response?.status === 404) {
      console.error('Resource not found:', error.response.data)
      throw new Error('The requested resource was not found')
    } else if (error.response && error.response.status >= 500) {
      console.error('Server error:', error.response.data)
      
      // Retry logic for server errors
      if (!originalRequest._retryCount) {
        originalRequest._retryCount = 0
      }
      
      if (originalRequest._retryCount < MAX_RETRY_ATTEMPTS) {
        originalRequest._retryCount++
        return retryRequest(error, originalRequest._retryCount)
      }
      
      throw new Error('Server error. Please try again later')
    } else if (!error.response && error.code === 'NETWORK_ERROR') {
      console.error('Network error - please check your connection')
      throw new Error('Network error. Please check your internet connection')
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - please try again')
      throw new Error('Request timeout. Please try again')
    } else if ((axios as any).isCancel(error)) {
      console.log('Request cancelled')
      throw new Error('Request was cancelled')
    }
    
    // Default error handling - preserve axios error structure for proper error handling
    return Promise.reject(error)
  }
)

// Auth API endpoints
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials)
    return response.data.data || response.data
  },
  
  signup: async (userData: SignupForm) => {
    const response = await api.post('/auth/signup', userData)
    return response.data.data || response.data
  },
  
  me: async () => {
    const response = await api.get('/auth/me')
    return response.data.data || response.data
  },
  
  logout: async () => {
    await api.post('/auth/logout')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

// User API endpoints
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/profile')
    return response.data.data || response.data
  },
  
  updateProfile: async (userData: {
    username?: string
    email?: string
    leetcodeHandle?: string
    codeforcesHandle?: string
    githubHandle?: string
    hackerrankHandle?: string
  }) => {
    const response = await api.put('/users/profile', userData)
    return response.data.data || response.data
  },
  
  getProgress: async () => {
    const response = await api.get('/users/progress')
    return response.data.data || response.data
  }
}

// Enhanced utility functions
export const cancelAllRequests = () => {
  cancelTokenSource.cancel('Operation cancelled by user')
}

export const getConnectionStatus = () => ({
  isOnline,
  lastRequestTime,
  timeSinceLastRequest: Date.now() - lastRequestTime
})

// Patterns API endpoints with enhanced error handling
export const patternsAPI = {
  /**
   * Get patterns with enhanced filtering and pagination support
   * @param params - Query parameters for filtering and pagination
   * @param params.search - Search term for pattern and problem names
   * @param params.category - Filter by pattern category
   * @param params.platform - Filter by problem platform (e.g., LeetCode, Codeforces)
   * @param params.difficulty - Filter by problem difficulty (easy, medium, hard)
   * @param params.limit - Number of patterns per page (default: 20)
   * @param params.offset - Offset for pagination
   */
  getPatterns: async (params?: { 
    search?: string;
    category?: string;
    platform?: string;
    difficulty?: string;
    limit?: number; 
    offset?: number;
  }) => {
    try {
      // Validate and sanitize parameters
      const sanitizedParams = {
        ...params,
        limit: Math.min(Math.max(params?.limit || 20, 1), 1000), // Allow higher limit up to 1000
        offset: Math.max(params?.offset || 0, 0), // Ensure offset is non-negative
      }
      
      // Remove empty/undefined parameters
      Object.keys(sanitizedParams).forEach(key => {
        if (sanitizedParams[key as keyof typeof sanitizedParams] === undefined || 
            sanitizedParams[key as keyof typeof sanitizedParams] === '') {
          delete sanitizedParams[key as keyof typeof sanitizedParams]
        }
      })
      
      const response = await api.get('/patterns', { 
        params: sanitizedParams,
        timeout: 30000 // Extended timeout for pattern loading
      })
      
      // Validate response structure
      if (!response.data) {
        throw new Error('Invalid response format from server')
      }
      
      // Ensure we have a proper paginated response structure
      const responseData = {
        success: response.data.success !== false,
        data: response.data.patterns || response.data.data || [],
        pagination: response.data.pagination || {
          total: response.data.patterns?.length || 0,
          limit: sanitizedParams.limit || 20,
          offset: sanitizedParams.offset || 0,
          totalPages: Math.ceil((response.data.patterns?.length || 0) / (sanitizedParams.limit || 20)),
          hasMore: false
        },
        error: response.data.error || null
      }
      
      return responseData
    } catch (error: any) {
      console.error('Error loading patterns:', error)
      
      // Return fallback response structure for graceful degradation
      return {
        success: false,
        data: [],
        pagination: {
          total: 0,
          limit: params?.limit || 20,
          offset: params?.offset || 0,
          totalPages: 0,
          hasMore: false
        },
        error: error.message || 'Failed to load patterns'
      }
    }
  },
  
  toggleProblem: async (patternId: string, problemId: string) => {
    try {
      const response = await api.post(`/patterns/${patternId}/problems/${problemId}/toggle`)
      
      // Ensure consistent response structure
      return {
        success: response.data.success !== false,
        data: response.data.data || response.data,
        error: response.data.error || null
      }
    } catch (error: any) {
      console.error('Error toggling problem:', error)
      
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to toggle problem'
      }
    }
  },
  
  getProgress: async () => {
    const response = await api.get('/patterns/progress/summary')
    return response.data.data || response.data
  }
}

// Widgets API endpoints
export const widgetsAPI = {
  getLeetCodeStats: async (handle: string) => {
    const response = await api.get(`/widgets/leetcode/${handle}`)
    return response.data.data
  },
  
  getCodeforcesStats: async (handle: string) => {
    const response = await api.get(`/widgets/codeforces/${handle}`)
    return response.data.data
  },
  
  getGitHubStats: async (handle: string) => {
    const response = await api.get(`/widgets/github/${handle}`)
    return response.data.data
  },
  
  getHackerEarthStats: async (handle: string) => {
    const response = await api.get(`/widgets/hackerearth/${handle}`)
    return response.data.data
  },
  
  getStreak: async () => {
    const response = await api.get(`/widgets/streak`)
    return response.data.data
  }
}

// Gamification API endpoints
export const gamificationAPI = {
  getProfile: async () => {
    const response = await api.get('/gamification/profile')
    return response.data.data
  },
  
  getBadges: async () => {
    const response = await api.get('/gamification/badges')
    return response.data.data
  },
  
  getLeaderboard: async (type?: string, groupId?: string, timeframe?: string) => {
    const response = await api.get('/gamification/leaderboard', {
      params: { type, groupId, timeframe }
    })
    return response.data.data
  },
  
  claimBadge: async (badgeId: string) => {
    const response = await api.post(`/gamification/badges/${badgeId}/claim`)
    return response.data.data
  }
}

// Community API endpoints
export const communityAPI = {
  // Study Groups
  getGroups: async (params?: { search?: string; filter?: string }) => {
    const response = await api.get('/community/groups', { params })
    return response.data.data
  },
  
  createGroup: async (groupData: {
    name: string
    description: string
    isPrivate: boolean
    targetPatterns?: string[]
  }) => {
    const response = await api.post('/community/groups', groupData)
    return response.data.data
  },
  
  joinGroup: async (groupId: string) => {
    const response = await api.post(`/community/groups/${groupId}/join`)
    return response.data.data
  },
  
  leaveGroup: async (groupId: string) => {
    const response = await api.delete(`/community/groups/${groupId}/leave`)
    return response.data.data
  },
  
  // Challenges
  getChallenges: async (params?: { search?: string; status?: string }) => {
    const response = await api.get('/community/challenges', { params })
    return response.data.data
  },
  
  createChallenge: async (challengeData: {
    title: string
    description: string
    targetPatterns: string[]
    difficulty: string
    startDate: string
    endDate: string
    rewards?: { type: 'xp' | 'badge' | 'title'; value: string | number; position?: 'first' | 'top_3' | 'top_10' | 'all' }[]
    isPublic: boolean
  }) => {
    const response = await api.post('/community/challenges', challengeData)
    return response.data.data
  },
  
  joinChallenge: async (challengeId: string) => {
    const response = await api.post(`/community/challenges/${challengeId}/join`)
    return response.data.data
  },
  
  leaveChallenge: async (challengeId: string) => {
    const response = await api.post(`/community/challenges/${challengeId}/leave`)
    return response.data.data
  }
}

// Notifications API endpoints
export const notificationsAPI = {
  getNotifications: async (params?: { 
    limit?: number;
    type?: string;
    isRead?: boolean;
  }) => {
    const response = await api.get('/notifications', { params })
    return response.data.data
  },
  
  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/notifications/${notificationId}/read`)
    return response.data.data
  },
  
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all')
    return response.data.data
  },
  
  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/notifications/${notificationId}`)
    return response.data.data
  }
}

// Contests API endpoints
export const contestsAPI = {
  getContests: async (platform?: string) => {
    const params = platform ? { platform } : {}
    const response = await api.get('/contests', { params })
    return response.data
  },

  getLeetCodeContests: async () => {
    const response = await api.get('/contests/leetcode')
    return response.data
  },

  getCodeforcesContests: async () => {
    const response = await api.get('/contests/codeforces')
    return response.data
  },

  clearCache: async (platform?: string) => {
    const params = platform ? { platform } : {}
    const response = await api.delete('/contests/cache', { params })
    return response.data
  },

  checkHealth: async () => {
    const response = await api.get('/contests/health')
    return response.data
  }
}

// Analytics API endpoints
export const analyticsAPI = {
  getYears: async () => {
    const response = await api.get('/analytics/years')
    return response.data.data
  },

  getContributionHistory: async (year?: number) => {
    const params = year ? { year } : {}
    const response = await api.get('/analytics/contribution-history', { params })
    return response.data
  },

  getStats: async () => {
    const response = await api.get('/analytics/stats')
    return response.data.data
  },

  getWeeklyActivity: async (year?: number) => {
    const params = year ? { year } : {}
    const response = await api.get('/analytics/weekly', { params })
    return response.data.data
  },

  getMonthlyTrend: async (year?: number) => {
    const params = year ? { year } : {}
    const response = await api.get('/analytics/monthly', { params })
    return response.data.data
  }
}

export { api }
export default api
