import { useCallback, useEffect, useState } from 'react';
import type { Notification } from '@/generated/prisma/browser';

interface NotificationsData {
  notifications: Notification[];
  unreadCount: number;
}

export function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
} {
  const [data, setData] = useState<NotificationsData>({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const json = await res.json() as NotificationsData;
        setData(json);
      }
    } catch {
      // non-blocking — silently ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    // Poll every 60 seconds to keep the badge fresh across navigation
    const interval = setInterval(() => void fetchNotifications(), 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: number) => {
    // Optimistic update
    setData(prev => ({
      notifications: prev.notifications.map(n =>
        n.id === id ? { ...n, readAt: new Date() } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));

    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      // Revert on error by re-fetching
      void fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setData(prev => ({
      notifications: prev.notifications.map(n => ({ ...n, readAt: n.readAt ?? new Date() })),
      unreadCount: 0,
    }));

    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
    } catch {
      void fetchNotifications();
    }
  }, [fetchNotifications]);

  return { notifications: data.notifications, unreadCount: data.unreadCount, loading, markRead, markAllRead };
}
