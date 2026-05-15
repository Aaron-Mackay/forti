'use client';

import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useState } from 'react';
import { useSettings } from '@lib/providers/SettingsProvider';
import { Overlay } from '@/components/signal/overlay';

const FEATURES = [
  { icon: <FitnessCenterIcon fontSize="small" color="primary" />, text: 'Plan your training weeks' },
  { icon: <MonitorHeartIcon fontSize="small" color="secondary" />, text: 'Log daily metrics (weight, sleep, calories)' },
  { icon: <CheckBoxIcon fontSize="small" color="success" />, text: 'Complete weekly check-ins' },
  { icon: <CalendarMonthIcon fontSize="small" color="info" />, text: 'Track workouts in real time' },
];

export default function WelcomeModal() {
  const { settings, loading, updateSetting } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  const open = !loading && !settings.onboardingSeenWelcome && !dismissed;

  const handleClose = () => {
    setDismissed(true);
    updateSetting('onboardingSeenWelcome', true);
  };

  return (
    <Overlay
      open={open}
      onClose={handleClose}
      title="Welcome to Forti"
      eyebrow="Your fitness journey starts here"
      size="sm"
      dismissOnBackdrop={false}
      primaryAction={{ label: 'Get started', onClick: handleClose }}
      ghostAction={{ label: 'Skip for now', onClick: handleClose }}
    >
      <Box sx={{ textAlign: 'center', pt: 2, pb: 1 }}>
        <Box sx={{ mb: 2 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/forti-icon.svg" alt="Forti" width={56} height={56} />
        </Box>
        <List dense sx={{ textAlign: 'left' }}>
          {FEATURES.map(({ icon, text }) => (
            <ListItem key={text} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
              <ListItemText primary={text} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Overlay>
  );
}
