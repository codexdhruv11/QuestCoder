import { useState, useEffect, useCallback } from 'react';
import { useNotifications as useNotificationContext } from '@/contexts/NotificationContext';
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
  const { showInfo, showSuccess } = useNotificationContext();

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
      // Fix API payload reading - backend returns data.data structure
      const notificationsData = response.data.data || response.data;
      setNotifications(notificationsData.notifications || []);
      setUnreadCount(notificationsData.unreadCount || 0);
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
    if (data.type === 'badge_unlocked') {
      showSuccess(`${data.title}: ${data.message}`);
    } else {
      showInfo(`${data.title}: ${data.message}`);
    }
  });

  // Listen for badge unlock events
  useSocketSubscription('badge_unlocked', (data: { badge: any; xpBonus: number }) => {
    showSuccess(`🏆 Badge Unlocked! You earned "${data.badge.name}" (+${data.xpBonus} XP)`);
  });

  // Listen for level up events
  useSocketSubscription('level_up', (data: { newLevel: number; totalXp: number }) => {
    showSuccess(`🎉 Level Up! You reached level ${data.newLevel} (Total XP: ${data.totalXp})`);
  });

  // Listen for XP gain events
  useSocketSubscription('xp_gained', (data: { xpGained: number; totalXp: number; newLevel?: number }) => {
    showSuccess(`💪 XP Gained! +${data.xpGained} XP${data.newLevel ? ` → Level ${data.newLevel}` : ''}`);
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
