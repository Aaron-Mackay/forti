'use client';

import { useEffect, useState } from 'react';

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushSubscription() {
  const [permission, setPermission] = useState<PushPermission>('default');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PushPermission);
  }, []);

  async function subscribe(): Promise<boolean> {
    if (permission === 'unsupported') return false;
    setSubscribing(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);
      if (result !== 'granted') return false;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return false;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      return true;
    } catch {
      return false;
    } finally {
      setSubscribing(false);
    }
  }

  return { permission, subscribing, subscribe };
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0))).buffer;
}
