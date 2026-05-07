'use client';

import {useEffect, useState} from 'react';
import {getQueuedRequests, syncQueuedRequests} from "@/utils/offlineSync";
import {Box, Button, Typography} from "@mui/material";

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedRequestsCount, setQueuedRequestsCount] = useState(0);
  const [syncFailed, setSyncFailed] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      const online = navigator.onLine;
      setIsOnline(online);
      const count = await getQueuedRequests();
      setQueuedRequestsCount(count);
      if (count === 0) setSyncFailed(false);
    };

    const handleSyncFailed = () => {
      setSyncFailed(true);
      updateStatus();
    };

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    window.addEventListener('queue-updated', updateStatus);
    window.addEventListener('sync-failed', handleSyncFailed);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      window.removeEventListener('queue-updated', updateStatus);
      window.removeEventListener('sync-failed', handleSyncFailed);
    };
  }, []);

  const handleRetry = () => {
    setSyncFailed(false);
    syncQueuedRequests().catch(() => {});
  };

  if (!isOnline) {
    return (
      <Box sx={{bgcolor: 'error.dark', color: 'white', textAlign: 'center'}}>
        <Typography variant="caption">
          {queuedRequestsCount > 0
            ? `You are offline — ${queuedRequestsCount} change(s) queued for sync.`
            : 'You are offline – changes will be queued'}
        </Typography>
      </Box>
    );
  }

  if (syncFailed && queuedRequestsCount > 0) {
    return (
      <Box sx={{bgcolor: 'warning.dark', color: 'white', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 0.25}}>
        <Typography variant="caption">
          {queuedRequestsCount} change(s) failed to sync.
        </Typography>
        <Button size="small" sx={{color: 'white', minWidth: 0, py: 0, textTransform: 'none', fontSize: 'inherit'}} onClick={handleRetry}>
          Retry
        </Button>
      </Box>
    );
  }

  return null;
}
