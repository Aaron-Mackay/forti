'use client';

import {useEffect, useState} from 'react';
import {getQueuedRequests} from "@/utils/offlineSync";

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedRequestsCount, setQueuedRequestsCount] = useState(0);

  useEffect(() => {
    const updateStatus = async () => {
      setIsOnline(navigator.onLine);
      if (!navigator.onLine) {
        // Set queued request count when offline
        const count = await getQueuedRequests(); // This should return the current number of queued requests
        setQueuedRequestsCount(count);
      } else {
        setQueuedRequestsCount(0);
      }
    };

    updateStatus().then(() => console.log(queuedRequestsCount));
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  useEffect(() => {
    const updateCount = async () => {
      const count = await getQueuedRequests();
      setQueuedRequestsCount(count);
    };

    updateCount(); // run on mount

    window.addEventListener('queue-updated', updateCount);
    return () => {
      window.removeEventListener('queue-updated', updateCount);
    };
  }, []);

  return (
    <div className={`text-center py-1 text-white text-sm ${isOnline ? 'bg-success-subtle' : 'bg-danger-subtle'}`}>
      {isOnline
        ? 'You are online'
        : queuedRequestsCount > 0
          ? `You are offline — ${queuedRequestsCount} request(s) queued for sync.`
          : 'You are offline – requests will be queued'}
    </div>
  );
}
