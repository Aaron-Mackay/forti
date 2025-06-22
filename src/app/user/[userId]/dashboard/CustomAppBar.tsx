'use client';

import {AppBar, IconButton, Toolbar, Typography} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import React from 'react';
import {usePathname, useRouter} from 'next/navigation';

export default function CustomAppBar(
  {
    title,
    onBack,
    showBack = false,
  }: {
    title: string;
    onBack?: () => void;
    showBack?: boolean;
  }) {
  const router = useRouter();
  const pathname = usePathname();
  if (typeof onBack === 'undefined') {
    onBack = () => {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 2) {
        const newPath = '/' + segments.slice(0, -1).join('/');
        router.push(newPath || '/');
      }
    }
  }

  return (
    <AppBar position="sticky" color="primary" enableColorOnDark>
      <Toolbar>
        {showBack && (
          <IconButton edge="start" color="inherit" aria-label="back" onClick={onBack} sx={{mr: 2}}>
            <ArrowBackIcon/>
          </IconButton>
        )}
        <Typography variant="h6" noWrap component="div" sx={{flexGrow: 1}}>
          {title}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}