'use client';

import { Alert } from '@mui/material';
import { useEffect, useState } from 'react';

export default function ScreenSizeWarningBanner() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log(window.innerWidth)
      const isSmallScreen = window.innerWidth < 1024
      setShowWarning(isSmallScreen)
    }
  }, []);

  if (!showWarning) return null;

  return (
    <Alert
      severity="warning"
      onClose={() => setShowWarning(false)}
      sx={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '87.5%',
        marginBottom: 1,
      }}
    >
      For best experience, use on a larger screen
    </Alert>
  );
}
