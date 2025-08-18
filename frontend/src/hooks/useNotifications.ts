import { useState, useEffect, useCallback } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { useSocketSubscription } from './useSocket';
import { api } from '@/lib/api';
import { Notification } from '@/types';

export interface UseNotificationsOptions {
  limit?: number;
  filter?: {
    type?: string;
    isRead?: boolean;
  };
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { showNotification } = useNotification();

  const { limit = 20, filter } = options;

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/notifications', {
        params: {
          limit,
          ...filter,
        },
      });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, filter]);

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen for real-time notifications
  useSocketSubscription('notification', (data: Notification) => {
    setNotifications(prev => [data, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast notification
    showNotification(data.title, {
      description: data.message,
      type: data.type === 'badge_unlocked' ? 'success' : 'info',
      action: data.type === 'badge_unlocked' ? {
        label: 'View Badge',
        onClick: () => {
          // Navigate to badges or show badge modal
          console.log('View badge:', data.data);
        }
      } : undefined,
    });
  });

  // Listen for badge unlock events
  useSocketSubscription('badge_unlocked', (data: { badge: any; xp: number }) => {
    showNotification('🏆 Badge Unlocked!', {
      description: `You earned "${data.badge.name}" (+${data.xp} XP)`,
      type: 'success',
      duration: 5000,
    });
  });

  // Listen for level up events
  useSocketSubscription('level_up', (data: { level: number; xp: number }) => {
    showNotification('🎉 Level Up!', {
      description: `Congratulations! You reached level ${data.level}`,
      type: 'success',
      duration: 5000,
    });
  });

  // Listen for XP gain events
  useSocketSubscription('xp_gained', (data: { amount: number; total: number; problem: string }) => {
    showNotification('💪 XP Gained!', {
      description: `+${data.amount} XP for solving "${data.problem}"`,
      type: 'success',
      duration: 3000,
    });
  });

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(notification =>
          notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev =>
        prev.filter(notification => notification._id !== notificationId)
      );
      // Decrease unread count if the deleted notification was unread
      const notification = notifications.find(n => n._id === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error('Error deleting notification:', err);
    }
  }, [notifications]);

  // Refresh notifications
  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };
}
