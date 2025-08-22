import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authAPI } from '@/lib/api'
import { User, AuthResponse, LoginForm, SignupForm } from '@/types'

interface AuthContextType {
  token: string | null
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: (credentials: LoginForm) => Promise<void>
  signup: (userData: SignupForm) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasRole: (role: 'user' | 'admin') => boolean
  checkAdminAccess: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user
  const isAdmin = user?.role === 'admin'

  // Load user on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          const userData = await authAPI.me()
          setUser(userData.user || userData)
        }
      } catch (error) {
        console.error('Failed to load user:', error)
        // Clear invalid token
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = async (credentials: LoginForm) => {
    try {
      setIsLoading(true)
      const response: AuthResponse = await authAPI.login(credentials)
      
      // Store token and user data
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      setUser(response.user)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (userData: SignupForm) => {
    try {
      setIsLoading(true)
      const response: AuthResponse = await authAPI.signup(userData)
      
      // Store token and user data
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      setUser(response.user)
    } catch (error) {
      console.error('Signup failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage and state
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
    }
  }

  const refreshUser = async () => {
    try {
      if (isAuthenticated) {
        const userData = await authAPI.me()
        setUser(userData.user || userData)
        localStorage.setItem('user', JSON.stringify(userData.user || userData))
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
      // If refresh fails, logout user
      await logout()
    }
  }

  // Role checking helpers
  const hasRole = (role: 'user' | 'admin'): boolean => {
    if (!user) return false
    return user.role === role
  }

  const checkAdminAccess = (): boolean => {
    return isAuthenticated && isAdmin
  }

  const value: AuthContextType = {
    token: localStorage.getItem("token"),
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    login,
    signup,
    logout,
    refreshUser,
    hasRole,
    checkAdminAccess,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
