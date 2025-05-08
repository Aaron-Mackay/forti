'use client';

import {usePathname, useRouter} from 'next/navigation';

export default function BackButton({higherLevel}: { higherLevel: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const goUpOneLevel = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 1) {
      const newPath = '/' + parts.slice(0, -2).join('/');
      router.push(newPath);
    } else {
      router.push('/');
    }
  };

  return (
    <button
      onClick={goUpOneLevel}
      className="text-sm text-blue-600 underline hover:text-blue-800"
    >
      ← {higherLevel}
    </button>
  );
}
