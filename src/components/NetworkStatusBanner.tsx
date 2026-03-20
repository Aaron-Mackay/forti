'use client';

import {useEffect, useState} from 'react';
import {getQueuedRequests} from "@/utils/offlineSync";
import {Box, Typography} from "@mui/material";

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedRequestsCount, setQueuedRequestsCount] = useState(0);

  useEffect(() => {
    const updateStatus = async () => {
      setIsOnline(navigator.onLine);
      const count = navigator.onLine ? 0 : await getQueuedRequests();
      setQueuedRequestsCount(count);
    };

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    window.addEventListener('queue-updated', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      window.removeEventListener('queue-updated', updateStatus);
    };
  }, []);

  return (
    !isOnline &&
    <Box sx={{
      bgcolor: 'error.dark',
      color: 'white',
      textAlign: 'center',
    }}>
      <Typography variant={"caption"}>
        {queuedRequestsCount > 0
          ? `You are offline — ${queuedRequestsCount} request(s) queued for sync.`
          : 'You are offline – requests will be queued'}
      </Typography>
    </Box>
  );
}
