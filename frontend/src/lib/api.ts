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
    return response.data
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
    return response.data
  },
  
  me: async () => {
    const response = await api.get('/auth/me')
    return response.data
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
    return response.data
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
    return response.data
  },
  
  getProgress: async () => {
    const response = await api.get('/users/progress')
    return response.data
  }
}

// Patterns API endpoints
export const patternsAPI = {
  getPatterns: async (params?: { limit?: number; offset?: number }) => {
    const response = await api.get('/patterns', { params })
    return response.data
  },
  
  toggleProblem: async (patternId: string, problemId: string) => {
    const response = await api.post(`/patterns/${patternId}/problems/${problemId}/toggle`)
    return response.data
  },
  
  getProgress: async () => {
    const response = await api.get('/patterns/progress/summary')
    return response.data
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

export default api
