'use client';

import { AppBar, Toolbar, IconButton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import React from 'react';

export default function DashboardAppBar({
  title,
  onBack,
  showBack = false,
}: {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
}) {
  return (
    <AppBar position="sticky" color="primary" enableColorOnDark>
      <Toolbar>
        {showBack && (
          <IconButton edge="start" color="inherit" aria-label="back" onClick={onBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}