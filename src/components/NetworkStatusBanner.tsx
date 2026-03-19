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
  }, [queuedRequestsCount]);

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
    !isOnline &&
    <Box sx={{
      bgcolor: 'error.dark',
      color: 'white',
      textAlign: 'center',
    }}>
      <Typography variant={"caption"}>
        {(queuedRequestsCount > 0
          ? `You are offline — ${queuedRequestsCount} request(s) queued for sync.`
          : 'You are offline – requests will be queued')
        }
      </Typography>
    </Box>
  );
}
