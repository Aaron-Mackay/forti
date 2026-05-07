import { useState } from 'react';
import type { WeeklyCheckIn } from '@/generated/prisma/browser';

export function useCheckInPhotos(checkIn: WeeklyCheckIn) {
  const [photoUrls, setPhotoUrls] = useState<{ front: string | null; back: string | null; side: string | null }>({
    front: checkIn.frontPhotoUrl ?? null,
    back: checkIn.backPhotoUrl ?? null,
    side: checkIn.sidePhotoUrl ?? null,
  });

  return {
    photoUrls,
    onPhotoUploaded: (angle: 'front' | 'back' | 'side', url: string) =>
      setPhotoUrls(prev => ({ ...prev, [angle]: url })),
    onPhotoRemoved: (angle: 'front' | 'back' | 'side') =>
      setPhotoUrls(prev => ({ ...prev, [angle]: null })),
  };
}
