'use client';

import {useEffect} from 'react';
import {syncQueuedRequests} from '@/utils/offlineSync';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    }

    const sync = () => { syncQueuedRequests().catch(() => {}); };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') sync();
    };

    // Sync on reconnect, app focus (visibilitychange covers iOS PWA foreground),
    // and page restore from bfcache (pageshow)
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', sync);

    return () => {
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', sync);
    };
  }, []);

  return null;
}
