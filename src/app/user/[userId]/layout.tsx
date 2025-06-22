'use client';

import React, { useEffect, useState } from 'react';
import {Loading} from "@/components/Loading";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    document.body.classList.add('no-body-margin');
    setIsReady(true);
    return () => {
      document.body.classList.remove('no-body-margin');
    };
  }, []);

  return isReady ? <>{children}</> : <Loading />
}