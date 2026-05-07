'use client';

import {
  Box,
  Button,
  Dialog,
  DialogContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useState } from 'react';
import { useSettings } from '@lib/providers/SettingsProvider';

const FEATURES = [
  { icon: <FitnessCenterIcon fontSize="small" color="primary" />, text: 'Plan your training weeks' },
  { icon: <MonitorHeartIcon fontSize="small" color="secondary" />, text: 'Log daily metrics (weight, sleep, calories)' },
  { icon: <CheckBoxIcon fontSize="small" color="success" />, text: 'Complete weekly check-ins' },
  { icon: <CalendarMonthIcon fontSize="small" color="info" />, text: 'Track workouts in real time' },
];

export default function WelcomeModal() {
  const { settings, loading, updateSetting } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  // Gate on !loading to avoid flashing for existing users during settings fetch.
  // Local `dismissed` flag prevents the modal reopening if the server PATCH
  // hasn't completed before the next settings read.
  const open = !loading && !settings.onboardingSeenWelcome && !dismissed;

  const handleClose = () => {
    setDismissed(true);
    updateSetting('onboardingSeenWelcome', true);
  };

  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogContent sx={{ textAlign: 'center', pt: 4, pb: 3 }}>
        <Box sx={{ mb: 2 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/forti-icon.svg" alt="Forti" width={56} height={56} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Welcome to Forti
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your fitness journey starts here.
        </Typography>

        <List dense sx={{ textAlign: 'left', mb: 3 }}>
          {FEATURES.map(({ icon, text }) => (
            <ListItem key={text} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
              <ListItemText primary={text} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItem>
          ))}
        </List>

        <Button variant="contained" fullWidth size="large" onClick={handleClose} sx={{ mb: 1 }}>
          Get Started
        </Button>
        <Button color="inherit" size="small" onClick={handleClose}>
          Skip for now
        </Button>
      </DialogContent>
    </Dialog>
  );
}
