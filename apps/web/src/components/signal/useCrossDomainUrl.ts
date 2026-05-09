'use client';

import { useEffect, useState } from 'react';

const PROD_HOST = 'forti-training.co.uk';

export function useCrossDomainUrl(isCoachDomain: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const host = window.location.hostname;
    if (!host.includes(PROD_HOST)) {
      setUrl(null);
      return;
    }
    if (isCoachDomain) {
      setUrl(window.location.origin.replace('coach.', ''));
    } else {
      const next = new URL(window.location.origin);
      next.hostname = next.hostname.replace(PROD_HOST, `coach.${PROD_HOST}`);
      setUrl(next.origin);
    }
  }, [isCoachDomain]);

  return url;
}
