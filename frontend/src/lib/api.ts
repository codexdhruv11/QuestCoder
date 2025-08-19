import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage and redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API endpoints
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials)
    return response.data.data || response.data
  },
  
  signup: async (userData: {
    username: string
    email: string
    password: string
    leetcodeHandle?: string
    codeforcesHandle?: string
    githubHandle?: string
    hackerrankHandle?: string
  }) => {
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

// Patterns API endpoints
export const patternsAPI = {
  getPatterns: async (params?: { limit?: number; offset?: number }) => {
    const response = await api.get('/patterns', { params })
    return response.data.data || response.data
  },
  
  toggleProblem: async (patternId: string, problemId: string) => {
    const response = await api.post(`/patterns/${patternId}/problems/${problemId}/toggle`)
    return response.data.data || response.data
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

// Analytics API endpoints
export const analyticsAPI = {
  getOverview: async () => {
    const response = await api.get('/analytics/overview')
    return response.data.data
  },
  
  getProgress: async (period?: string, days?: number) => {
    const response = await api.get('/analytics/progress', {
      params: { period, days }
    })
    return response.data.data
  },
  
  getPatterns: async () => {
    const response = await api.get('/analytics/patterns')
    return response.data.data
  },
  
  getPredictions: async () => {
    const response = await api.get('/analytics/predictions')
    return response.data.data
  },
  
  getPerformance: async (timeRange?: string) => {
    const response = await api.get('/analytics/performance', {
      params: timeRange ? { timeRange } : undefined
    })
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

export { api }
export default api
