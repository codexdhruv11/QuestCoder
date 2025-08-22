import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

interface UserProgressUpdate {
  userId: string
  username: string
  patternId: string
  problemId: string
  progressData: {
    solvedCount: number
    completionRate: number
    streakInfo: {
      currentStreak: number
      longestStreak: number
      streakExtended?: boolean
    }
    patternProgress: {
      totalProblems: number
      solvedProblems: number
      completionRate: number
    }
  }
  timestamp: string
}

interface GroupProgressUpdate {
  userId: string
  username: string
  patternId: string
  problemId: string
  progressData: {
    problemName: string
    patternName: string
    difficulty: string
    platform: string
    solvedCount: number
    completionRate: number
    achievements?: string[]
  }
  groupInfo: {
    groupId: string
    groupName: string
  }
  timestamp: string
}

interface LeaderboardChange {
  type: 'xp' | 'problems' | 'streak'
  updatedEntries?: Array<{
    userId: string
    username: string
    rank: number
    score: number
    previousRank?: number
  }>
  timestamp: string
}

interface ConnectionStatus {
  isConnected: boolean
  lastEventReceived?: string | undefined
  eventCount: number
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected'
  retryAttempts: number
}

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  connectionStatus: ConnectionStatus
  recentProgressUpdates: UserProgressUpdate[]
  groupActivityFeed: GroupProgressUpdate[]
  leaderboardChanges: LeaderboardChange[]
  joinGroup: (groupId: string) => void
  leaveGroup: (groupId: string) => void
  joinChallenge: (challengeId: string) => void
  leaveChallenge: (challengeId: string) => void
  joinPattern: (patternId: string) => void
  leavePattern: (patternId: string) => void
  subscribeLeaderboard: (type: string) => void
  unsubscribeLeaderboard: (type: string) => void
  subscribeUserProgress: (callback: (data: UserProgressUpdate) => void) => () => void
  subscribeGroupProgress: (callback: (data: GroupProgressUpdate) => void) => () => void
  subscribeRealTimeStats: (callback: (data: any) => void) => () => void
  emit: (event: string, data?: any) => void
  subscribe: (event: string, callback: (data: any) => void) => () => void
  clearEventHistory: () => void
  // Enhanced features
  isInFallbackMode: () => boolean
  retryConnection: () => void
  getConnectionInfo: () => { 
    url: string
    connected: boolean
    quality: string
    retryAttempts: number
    lastEventReceived?: string | undefined
  }
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: React.ReactNode
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user, token } = useAuth()
  
  // Enhanced state management for real-time events
  const [recentProgressUpdates, setRecentProgressUpdates] = useState<UserProgressUpdate[]>([])
  const [groupActivityFeed, setGroupActivityFeed] = useState<GroupProgressUpdate[]>([])
  const [leaderboardChanges, setLeaderboardChanges] = useState<LeaderboardChange[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    eventCount: 0,
    connectionQuality: 'disconnected',
    lastEventReceived: undefined,
    retryAttempts: 0
  })
  
  // Refs for event deduplication and batching
  const eventHistory = useRef<Set<string>>(new Set())
  const batchTimeout = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdates = useRef<any[]>([])
  const retryTimeout = useRef<NodeJS.Timeout | null>(null)

  // Event filtering and deduplication
  const isEventDuplicate = useCallback((eventId: string): boolean => {
    if (eventHistory.current.has(eventId)) {
      return true
    }
    eventHistory.current.add(eventId)
    
    // Cleanup old events (keep only last 1000)
    if (eventHistory.current.size > 1000) {
      const entries = Array.from(eventHistory.current)
      eventHistory.current.clear()
      entries.slice(-500).forEach(id => eventHistory.current.add(id))
    }
    
    return false
  }, [])

  // Batch event processing to prevent UI thrashing
  const processBatchedUpdates = useCallback(() => {
    if (pendingUpdates.current.length === 0) return
    
    const updates = [...pendingUpdates.current]
    pendingUpdates.current = []
    
    // Group updates by type
    const progressUpdates = updates.filter(u => u.type === 'progress')
    const groupUpdates = updates.filter(u => u.type === 'group')
    const leaderboardUpdates = updates.filter(u => u.type === 'leaderboard')
    
    // Apply batched updates
    if (progressUpdates.length > 0) {
      setRecentProgressUpdates(prev => {
        const combined = [...prev, ...progressUpdates.map(u => u.data)]
        return combined.slice(-50) // Keep only last 50 updates
      })
    }
    
    if (groupUpdates.length > 0) {
      setGroupActivityFeed(prev => {
        const combined = [...prev, ...groupUpdates.map(u => u.data)]
        return combined.slice(-100) // Keep only last 100 updates
      })
    }
    
    if (leaderboardUpdates.length > 0) {
      setLeaderboardChanges(prev => {
        const combined = [...prev, ...leaderboardUpdates.map(u => u.data)]
        return combined.slice(-20) // Keep only last 20 updates
      })
    }
  }, [])

  // Update connection quality based on response times and events
  const updateConnectionQuality = useCallback((isConnected: boolean, eventReceived = false) => {
    setConnectionStatus(prev => {
      const newEventCount = eventReceived ? prev.eventCount + 1 : prev.eventCount
      let quality: ConnectionStatus['connectionQuality'] = 'disconnected'
      
      if (isConnected) {
        quality = newEventCount > 10 ? 'excellent' : 
                  newEventCount > 5 ? 'good' : 'poor'
      }
      
      return {
        ...prev,
        isConnected,
        eventCount: newEventCount,
        connectionQuality: quality,
        lastEventReceived: eventReceived ? new Date().toISOString() : prev.lastEventReceived
      }
    })
  }, [])

  // Setup automatic event listeners
  const setupEventListeners = useCallback((socketInstance: Socket) => {
    // Remove any existing listeners first to prevent duplicates
    socketInstance.off('user_progress_update')
    socketInstance.off('group_progress_update')
    socketInstance.off('leaderboard_update')
    socketInstance.off('rank_update')
    socketInstance.off('stats_update')
    socketInstance.off('analytics_update')
    
    // User progress updates
    socketInstance.on('user_progress_update', (data: UserProgressUpdate) => {
      const eventId = `progress_${data.userId}_${data.patternId}_${data.problemId}_${data.timestamp}`
      if (!isEventDuplicate(eventId)) {
        pendingUpdates.current.push({ type: 'progress', data })
        updateConnectionQuality(true, true)
        
        // Debounce batch processing
        if (batchTimeout.current) clearTimeout(batchTimeout.current)
        batchTimeout.current = setTimeout(processBatchedUpdates, 100)
      }
    })

    // Group progress updates
    socketInstance.on('group_progress_update', (data: GroupProgressUpdate) => {
      const eventId = `group_${data.userId}_${data.patternId}_${data.problemId}_${data.timestamp}`
      if (!isEventDuplicate(eventId)) {
        pendingUpdates.current.push({ type: 'group', data })
        updateConnectionQuality(true, true)
        
        if (batchTimeout.current) clearTimeout(batchTimeout.current)
        batchTimeout.current = setTimeout(processBatchedUpdates, 100)
      }
    })

    // Leaderboard updates
    socketInstance.on('leaderboard_update', (data: LeaderboardChange) => {
      const eventId = `leaderboard_${data.type}_${data.timestamp}`
      if (!isEventDuplicate(eventId)) {
        pendingUpdates.current.push({ type: 'leaderboard', data })
        updateConnectionQuality(true, true)
        
        if (batchTimeout.current) clearTimeout(batchTimeout.current)
        batchTimeout.current = setTimeout(processBatchedUpdates, 100)
      }
    })

    // Rank updates
    socketInstance.on('rank_update', (data: any) => {
      const eventId = `rank_${data.leaderboardType}_${data.newRank}_${data.timestamp}`
      if (!isEventDuplicate(eventId)) {
        // Handle rank updates immediately for current user
        updateConnectionQuality(true, true)
      }
    })

    // Stats updates
    socketInstance.on('stats_update', (data: any) => {
      // Handle both formats - new format has userId and stats, old format has flat fields
      const userId = data.userId || (data.stats ? 'unknown' : undefined)
      const eventId = `stats_${userId}_${data.timestamp}`
      if (!isEventDuplicate(eventId)) {
        updateConnectionQuality(true, true)
      }
    })

    // Analytics updates
    socketInstance.on('analytics_update', (data: any) => {
      const eventId = `analytics_${data.userId}_${data.timestamp}`
      if (!isEventDuplicate(eventId)) {
        updateConnectionQuality(true, true)
      }
    })
  }, [isEventDuplicate, updateConnectionQuality, processBatchedUpdates])

  useEffect(() => {
    let socketInstance: Socket | null = null

    const connectSocket = () => {
      if (token && user) {
        console.log('🔌 Connecting to Socket.IO server...')
        
        socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5, // Max 5 attempts to prevent spam
          reconnectionDelay: 2000, // Initial delay
          reconnectionDelayMax: 10000, // Max delay
          randomizationFactor: 0.5,
          timeout: 10000, // Connection timeout
          forceNew: false, // Reuse existing connection
          autoConnect: true,
          // Additional configuration for better reliability
          upgrade: true,
          rememberUpgrade: true,
        })

        socketInstance.on('connect', () => {
          console.log('✅ Socket.IO connected successfully:', socketInstance?.id)
          setIsConnected(true)
          updateConnectionQuality(true)
          
          // Reset retry attempts on successful connection
          setConnectionStatus(prev => ({ 
            ...prev, 
            retryAttempts: 0,
            connectionQuality: 'excellent'
          }))
          
          // Setup automatic event listeners
          setupEventListeners(socketInstance!)
        })

        socketInstance.on('disconnect', (reason) => {
          console.log('🔌 Socket.IO disconnected:', reason)
          setIsConnected(false)
          updateConnectionQuality(false)
          
          // Enhanced disconnect handling with specific reasons
          const handleDisconnectReason = (reason: string) => {
            switch (reason) {
              case 'io server disconnect':
                console.log('⚠️ Server initiated disconnect - waiting before retry')
                return 5000 // Wait 5 seconds before retry
              case 'io client disconnect':
                console.log('ℹ️ Client initiated disconnect - no auto-retry')
                return null // Don't auto-retry
              case 'ping timeout':
                console.log('⏰ Connection timeout - quick retry')
                return 2000
              case 'transport close':
                console.log('🚫 Transport closed - standard retry')
                return 3000
              case 'transport error':
                console.log('❌ Transport error - delayed retry')
                return 5000
              default:
                console.log('🔄 Unknown disconnect reason - standard retry')
                return 3000
            }
          }
          
          const retryDelay = handleDisconnectReason(reason)
          
          if (retryDelay !== null) {
            setConnectionStatus(prev => {
              const newRetryCount = prev.retryAttempts + 1
              if (newRetryCount <= 5) { // Max 5 retry attempts
                console.log(`🔄 Scheduling reconnect attempt ${newRetryCount}/5 in ${retryDelay}ms`)
                retryTimeout.current = setTimeout(() => {
                  if (socketInstance && !socketInstance.connected) {
                    console.log('🔄 Attempting to reconnect...')
                    socketInstance.connect()
                  }
                }, retryDelay)
              } else {
                console.log('❌ Max reconnection attempts reached - entering fallback mode')
              }
              return { ...prev, retryAttempts: newRetryCount }
            })
          }
        })

        socketInstance.on('connect_error', (error) => {
          console.error('❌ Socket.IO connection error:', error)
          setIsConnected(false)
          updateConnectionQuality(false)
          
          // Enhanced error handling with specific error types
          const errorMessage = error.message.toLowerCase()
          
          let retryDelay = 5000
          let shouldRetry = true
          
          if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
            console.error('🔐 Authentication failed - token may be invalid')
            shouldRetry = false
            // Clear auth data if authentication fails repeatedly
            setConnectionStatus(prev => {
              if (prev.retryAttempts > 2) {
                console.log('🚪 Multiple auth failures - clearing token')
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                window.location.href = '/login'
              }
              return prev
            })
          } else if (errorMessage.includes('namespace')) {
            console.warn('🏠 Namespace error - retrying with delay')
            retryDelay = 5000
          } else if (errorMessage.includes('timeout')) {
            console.warn('⏰ Connection timeout - quick retry')
            retryDelay = 2000
          } else if (errorMessage.includes('network')) {
            console.warn('🌐 Network error - delayed retry')
            retryDelay = 8000
          }
          
          setConnectionStatus(prev => {
            const newRetryCount = prev.retryAttempts + 1
            
            if (shouldRetry && newRetryCount <= 5) {
              console.log(`🔄 Scheduling error recovery attempt ${newRetryCount}/5 in ${retryDelay}ms`)
              retryTimeout.current = setTimeout(() => {
                if (socketInstance && !socketInstance.connected) {
                  console.log('🔄 Attempting error recovery...')
                  socketInstance.connect()
                }
              }, retryDelay)
            } else if (newRetryCount > 5) {
              console.log('❌ Max error recovery attempts reached - entering fallback mode')
            }
            
            return { ...prev, retryAttempts: newRetryCount }
          })
        })

        socketInstance.on('connected', (data) => {
          console.log('🔐 Socket.IO authenticated successfully:', data)
          updateConnectionQuality(true)
        })

        // Enhanced connection monitoring
        socketInstance.on('reconnect', (attemptNumber) => {
          console.log(`🎉 Socket.IO reconnected successfully after ${attemptNumber} attempts`)
          setIsConnected(true)
          updateConnectionQuality(true)
          setConnectionStatus(prev => ({ ...prev, retryAttempts: 0 }))
        })

        socketInstance.on('reconnect_attempt', (attemptNumber) => {
          console.log(`🔄 Socket.IO reconnect attempt ${attemptNumber}`)
        })

        socketInstance.on('reconnect_error', (error) => {
          console.error('🔄❌ Socket.IO reconnect error:', error)
        })

        socketInstance.on('reconnect_failed', () => {
          console.error('💥 Socket.IO reconnection failed - all attempts exhausted')
          setConnectionStatus(prev => ({ 
            ...prev, 
            connectionQuality: 'disconnected',
            retryAttempts: 5 
          }))
        })

        // Add ping/pong monitoring for connection health
        socketInstance.on('ping', () => {
          if (import.meta.env.VITE_DEBUG_SOCKET === 'true') {
            console.log('🏓 Socket.IO ping received')
          }
        })

        socketInstance.on('pong', (latency) => {
          if (import.meta.env.VITE_DEBUG_SOCKET === 'true') {
            console.log(`🏓 Socket.IO pong received (${latency}ms latency)`)
          }
          
          // Update connection quality based on latency
          let quality: ConnectionStatus['connectionQuality'] = 'excellent'
          if (latency > 100) quality = 'good'
          if (latency > 300) quality = 'poor'
          
          setConnectionStatus(prev => ({ 
            ...prev, 
            connectionQuality: quality 
          }))
        })

        // Error boundary for socket events
        socketInstance.on('error', (error) => {
          console.error('🚨 Socket.IO error:', error)
          updateConnectionQuality(false)
        })

        setSocket(socketInstance)
      }
    }

    const disconnectSocket = () => {
      console.log('🔌 Disconnecting Socket.IO...')
      
      if (socketInstance) {
        // Remove all listeners to prevent memory leaks
        socketInstance.removeAllListeners()
        
        // Disconnect gracefully
        socketInstance.disconnect()
        setSocket(null)
        setIsConnected(false)
        
        console.log('✅ Socket.IO disconnected successfully')
      }
      
      // Cleanup all timeouts
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current)
        retryTimeout.current = null
      }
      
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current)
        batchTimeout.current = null
      }
      
      // Reset all state
      setConnectionStatus({
        isConnected: false,
        eventCount: 0,
        connectionQuality: 'disconnected',
        lastEventReceived: undefined,
        retryAttempts: 0
      })
      
      // Clear all pending updates and event history
      pendingUpdates.current = []
      eventHistory.current.clear()
      
      // Clear state arrays
      setRecentProgressUpdates([])
      setGroupActivityFeed([])
      setLeaderboardChanges([])
    }

    // Fallback mode functions are defined outside useEffect to avoid re-creation

    if (token && user) {
      connectSocket()
    } else {
      disconnectSocket()
    }

    return () => {
      disconnectSocket()
    }
  }, [token, user, updateConnectionQuality, setupEventListeners])

  const joinGroup = useCallback((groupId: string) => {
    if (socket && isConnected) {
      socket.emit('join_group', groupId)
    }
  }, [socket, isConnected])

  const leaveGroup = useCallback((groupId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_group', groupId)
    }
  }, [socket, isConnected])

  const joinChallenge = useCallback((challengeId: string) => {
    if (socket && isConnected) {
      socket.emit('join_challenge', challengeId)
    }
  }, [socket, isConnected])

  const leaveChallenge = useCallback((challengeId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_challenge', challengeId)
    }
  }, [socket, isConnected])

  const joinPattern = useCallback((patternId: string) => {
    if (socket && isConnected) {
      socket.emit('join_pattern', patternId)
    }
  }, [socket, isConnected])

  const leavePattern = useCallback((patternId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_pattern', patternId)
    }
  }, [socket, isConnected])

  const subscribeLeaderboard = useCallback((type: string) => {
    if (socket && isConnected) {
      socket.emit('subscribe_leaderboard', type)
    }
  }, [socket, isConnected])

  const unsubscribeLeaderboard = useCallback((type: string) => {
    if (socket && isConnected) {
      socket.emit('unsubscribe_leaderboard', type)
    }
  }, [socket, isConnected])

  const emit = useCallback((event: string, data?: any) => {
    if (socket && isConnected) {
      if (import.meta.env.VITE_DEBUG_SOCKET === 'true') {
        console.log(`📤 Emitting socket event: ${event}`, data)
      }
      socket.emit(event, data)
    } else if (import.meta.env.VITE_DEBUG_SOCKET === 'true') {
      console.warn(`❌ Cannot emit ${event} - socket not connected`)
    }
  }, [socket, isConnected])

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback)
      
      if (import.meta.env.VITE_DEBUG_SOCKET === 'true') {
        console.log(`📥 Subscribed to socket event: ${event}`)
      }
      
      // Return cleanup function
      return () => {
        socket.off(event, callback)
        if (import.meta.env.VITE_DEBUG_SOCKET === 'true') {
          console.log(`📤 Unsubscribed from socket event: ${event}`)
        }
      }
    }
    
    // Return no-op cleanup function if no socket
    return () => {}
  }, [socket])

  // Additional helper functions
  const retryConnection = useCallback(() => {
    if (socket && !socket.connected) {
      console.log('🔄 Manual retry connection requested')
      setConnectionStatus(prev => ({ ...prev, retryAttempts: 0 }))
      socket.connect()
    }
  }, [socket])

  const getConnectionInfo = useCallback(() => ({
    url: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
    connected: isConnected,
    quality: connectionStatus.connectionQuality,
    retryAttempts: connectionStatus.retryAttempts,
    lastEventReceived: connectionStatus.lastEventReceived
  }), [isConnected, connectionStatus])

  // New typed subscription methods
  const subscribeUserProgress = useCallback((callback: (data: UserProgressUpdate) => void) => {
    return subscribe('user_progress_update', callback)
  }, [subscribe])

  const subscribeGroupProgress = useCallback((callback: (data: GroupProgressUpdate) => void) => {
    return subscribe('group_progress_update', callback)
  }, [subscribe])

  const subscribeRealTimeStats = useCallback((callback: (data: any) => void) => {
    return subscribe('stats_update', callback)
  }, [subscribe])

  // Clear event history function
  const clearEventHistory = useCallback(() => {
    setRecentProgressUpdates([])
    setGroupActivityFeed([])
    setLeaderboardChanges([])
    eventHistory.current.clear()
    pendingUpdates.current = []
  }, [])

  // Fallback mode check
  const isInFallbackMode = useCallback(() => {
    return connectionStatus.retryAttempts >= 5 && !isConnected
  }, [connectionStatus.retryAttempts, isConnected])

  const value: SocketContextType = {
    socket,
    isConnected,
    connectionStatus,
    recentProgressUpdates,
    groupActivityFeed,
    leaderboardChanges,
    joinGroup,
    leaveGroup,
    joinChallenge,
    leaveChallenge,
    joinPattern,
    leavePattern,
    subscribeLeaderboard,
    unsubscribeLeaderboard,
    subscribeUserProgress,
    subscribeGroupProgress,
    subscribeRealTimeStats,
    emit,
    subscribe,
    clearEventHistory,
    // Enhanced features
    isInFallbackMode,
    retryConnection,
    getConnectionInfo
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}
