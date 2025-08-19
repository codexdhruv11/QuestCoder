import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinGroup: (groupId: string) => void
  leaveGroup: (groupId: string) => void
  joinChallenge: (challengeId: string) => void
  leaveChallenge: (challengeId: string) => void
  joinPattern: (patternId: string) => void
  leavePattern: (patternId: string) => void
  subscribeLeaderboard: (type: string) => void
  unsubscribeLeaderboard: (type: string) => void
  emit: (event: string, data?: any) => void
  subscribe: (event: string, callback: (data: any) => void) => () => void
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
  const { token, user } = useAuth()

  useEffect(() => {
    let socketInstance: Socket | null = null

    const connectSocket = () => {
      if (token && user) {
        socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
          auth: {
            token
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        })

        socketInstance.on('connect', () => {
          console.log('Socket connected:', socketInstance?.id)
          setIsConnected(true)
        })

        socketInstance.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason)
          setIsConnected(false)
        })

        socketInstance.on('connect_error', (error) => {
          console.error('Socket connection error:', error)
          setIsConnected(false)
        })

        socketInstance.on('connected', (data) => {
          console.log('Socket authenticated:', data)
        })

        setSocket(socketInstance)
      }
    }

    const disconnectSocket = () => {
      if (socketInstance) {
        socketInstance.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
    }

    if (token && user) {
      connectSocket()
    } else {
      disconnectSocket()
    }

    return () => {
      disconnectSocket()
    }
  }, [token, user])

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
      socket.emit(event, data)
    }
  }, [socket, isConnected])

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback)
      
      // Return cleanup function
      return () => {
        socket.off(event, callback)
      }
    }
    
    // Return no-op cleanup function if no socket
    return () => {}
  }, [socket])

  const value: SocketContextType = {
    socket,
    isConnected,
    joinGroup,
    leaveGroup,
    joinChallenge,
    leaveChallenge,
    joinPattern,
    leavePattern,
    subscribeLeaderboard,
    unsubscribeLeaderboard,
    emit,
    subscribe
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}
