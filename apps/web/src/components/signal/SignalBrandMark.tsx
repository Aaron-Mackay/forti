'use client';

import { useEffect, useState } from 'react';
import { useApiGet } from '@lib/hooks/api/useApiGet';

type Props = {
  size?: number;
};

export function SignalBrandMark({ size = 22 }: Props) {
  const [logoRev, setLogoRev] = useState(0);
  const { data: coachLogoData } = useApiGet<{ coachLogoUrl: string | null }>(
    `/api/coach/logo${logoRev > 0 ? `?rev=${logoRev}` : ''}`,
  );

  useEffect(() => {
    const handler = () => setLogoRev((revision) => revision + 1);
    window.addEventListener('coach-logo-changed', handler);
    return () => window.removeEventListener('coach-logo-changed', handler);
  }, []);

  if (coachLogoData?.coachLogoUrl) {
    return (
      <img
        src={coachLogoData.coachLogoUrl}
        alt="Coach logo"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <img
      src="/forti-icon.svg"
      alt="Forti logo"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
        filter: 'brightness(0) invert(0.94)',
      }}
    />
  );
}
