'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { Notification } from '@/generated/prisma/browser';
import { markAllNotificationsRead, markNotificationRead } from '@lib/clientApi';
import { NotificationsListResponseSchema } from '@lib/contracts/notifications';

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const etagRef = useRef<string | null>(null);
  const lastModifiedRef = useRef<string | null>(null);
  const versionRef = useRef<string | null>(null);
  const recentUnreadActivityUntilRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          ...(etagRef.current ? { 'If-None-Match': etagRef.current } : {}),
          ...(lastModifiedRef.current ? { 'If-Modified-Since': lastModifiedRef.current } : {}),
        },
      });

      if (response.status === 304) return;
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const json = NotificationsListResponseSchema.parse(await response.json());
      if (versionRef.current === json.metadata.version) return;

      etagRef.current = json.metadata.etag;
      lastModifiedRef.current = new Date(json.metadata.lastModified).toUTCString();
      versionRef.current = json.metadata.version;

      if (json.unreadCount > unreadCount) {
        recentUnreadActivityUntilRef.current = Date.now() + 2 * 60_000;
      }

      setNotifications(json.notifications);
      setUnreadCount(json.unreadCount);
    } catch {
      // non-blocking — silently ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, [unreadCount]);

  useEffect(() => {
    void fetchNotifications();

    const MODERATE_POLL_MS = 45_000;
    const ACTIVE_POLL_MS = 12_000;
    const VISIBILITY_FLIP_DEBOUNCE_MS = 800;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const clearPending = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleNextPoll = () => {
      clearPending();
      if (document.visibilityState !== 'visible') return;

      const hasRecentUnreadActivity = recentUnreadActivityUntilRef.current > Date.now();
      const nextInterval = hasRecentUnreadActivity ? ACTIVE_POLL_MS : MODERATE_POLL_MS;

      timeoutId = setTimeout(() => {
        void fetchNotifications();
        scheduleNextPoll();
      }, nextInterval);
    };

    const debouncedRefresh = () => {
      clearPending();
      timeoutId = setTimeout(() => {
        if (document.visibilityState !== 'visible') return;
        void fetchNotifications();
        scheduleNextPoll();
      }, VISIBILITY_FLIP_DEBOUNCE_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        clearPending();
        return;
      }
      debouncedRefresh();
    };

    const onWindowFocus = () => {
      if (document.visibilityState !== 'visible') return;
      debouncedRefresh();
    };

    scheduleNextPoll();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      clearPending();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date() } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch {
      void fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date() })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      void fetchNotifications();
    }
  }, [fetchNotifications]);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, loading, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
