import React, { createContext, useContext, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useSocket } from './SocketContext'

interface NotificationContextType {
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showInfo: (message: string) => void
  showXpGain: (xp: number, level?: number) => void
  showBadgeUnlock: (badgeName: string) => void
  showLevelUp: (level: number) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { subscribe } = useSocket()

  const showSuccess = useCallback((message: string) => {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
    })
  }, [])

  const showError = useCallback((message: string) => {
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
    })
  }, [])

  const showInfo = useCallback((message: string) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: 'ℹ️',
    })
  }, [])

  const showXpGain = useCallback((xp: number, level?: number) => {
    toast.success(`+${xp} XP gained!${level ? ` Level ${level}!` : ''}`, {
      duration: 3000,
      position: 'top-right',
      icon: '⚡',
      style: {
        background: '#10B981',
        color: '#fff',
      },
    })
  }, [])

  const showBadgeUnlock = useCallback((badgeName: string) => {
    toast.success(`🏆 Badge Unlocked: ${badgeName}!`, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#F59E0B',
        color: '#fff',
        fontWeight: 'bold',
      },
    })
  }, [])

  const showLevelUp = useCallback((level: number) => {
    toast.success(`🎉 Level Up! You reached level ${level}!`, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#8B5CF6',
        color: '#fff',
        fontWeight: 'bold',
      },
    })
  }, [])

  // Socket event listeners
  useEffect(() => {
    const unsubscribeFunctions: (() => void)[] = []

    // Listen for XP gain events
    const unsubscribeXp = subscribe('xp_gained', (data: any) => {
      showXpGain(data.xpGained, data.newLevel)
    })
    unsubscribeFunctions.push(unsubscribeXp)

    // Listen for badge unlock events
    const unsubscribeBadge = subscribe('badge_unlocked', (data: any) => {
      showBadgeUnlock(data.badge.name)
    })
    unsubscribeFunctions.push(unsubscribeBadge)

    // Listen for level up events
    const unsubscribeLevelUp = subscribe('level_up', (data: any) => {
      showLevelUp(data.newLevel)
    })
    unsubscribeFunctions.push(unsubscribeLevelUp)

    // Listen for general notifications
    const unsubscribeNotification = subscribe('notification', (data: any) => {
      switch (data.type) {
        case 'badge_unlocked':
          showBadgeUnlock(data.title)
          break
        case 'level_up':
          showLevelUp(data.data?.newLevel || 1)
          break
        case 'challenge_invite':
        case 'group_invite':
          showInfo(data.message)
          break
        case 'achievement':
          showSuccess(data.message)
          break
        case 'system':
          showInfo(data.message)
          break
        default:
          showInfo(data.message)
      }
    })
    unsubscribeFunctions.push(unsubscribeNotification)

    // Listen for streak milestones
    const unsubscribeStreak = subscribe('streak_milestone', (data: any) => {
      showSuccess(`${data.milestone}`)
    })
    unsubscribeFunctions.push(unsubscribeStreak)

    // Listen for pattern completion
    const unsubscribePattern = subscribe('pattern_completed', (data: any) => {
      showSuccess(`🎯 Pattern completed: ${data.patternName}!`)
    })
    unsubscribeFunctions.push(unsubscribePattern)

    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
    }
  }, [subscribe, showSuccess, showError, showInfo, showXpGain, showBadgeUnlock, showLevelUp])

  const value: NotificationContextType = {
    showSuccess,
    showError,
    showInfo,
    showXpGain,
    showBadgeUnlock,
    showLevelUp
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
