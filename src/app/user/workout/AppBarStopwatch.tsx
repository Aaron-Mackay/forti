import React, {useEffect, useState} from "react";
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import {Box, Button, IconButton, Popover, Typography} from "@mui/material";
import {useSettings} from "@lib/providers/SettingsProvider";
import {APPBAR_HEIGHT} from "@/components/CustomAppBar";
import {useStopwatch} from "@/app/user/workout/StopwatchContext";

const PRESETS = [
  {label: '1:00', deciseconds: 600},
  {label: '1:30', deciseconds: 900},
  {label: '2:00', deciseconds: 1200},
  {label: '3:00', deciseconds: 1800},
] as const;

async function requestNotificationPermission(): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function playBeep(): void {
  if (!('AudioContext' in window || 'webkitAudioContext' in window)) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AudioCtx: typeof AudioContext = (window as any).AudioContext ?? (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const offsets = [0, 0.18, 0.36];
  offsets.forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.15);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + 0.15);
    if (i === offsets.length - 1) {
      osc.onended = () => ctx.close();
    }
  });
}

export function fireRestNotification(): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Rest timer complete', {
      body: 'Time to start your next set!',
      icon: '/web-app-manifest-192x192.png',
    });
  }
  playBeep();
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
}

const AppBarStopwatch: React.FC = () => {
  const {settings} = useSettings();
  const {stopwatch, handleStartStop, handleReset, notifyAt, setNotifyAt} = useStopwatch();
  const {isRunning, startTimestamp, pausedTime} = stopwatch;
  const [displayTime, setDisplayTime] = useState(pausedTime);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    let animationFrame: number;
    let lastDisplayedTime = pausedTime;
    const update = () => {
      if (isRunning && startTimestamp !== null) {
        const elapsed = Math.floor((Date.now() - startTimestamp) / 100);
        const currentDisplayTime = pausedTime + elapsed;
        if (currentDisplayTime !== lastDisplayedTime) {
          if (notifyAt !== null && lastDisplayedTime < notifyAt && currentDisplayTime >= notifyAt) {
            fireRestNotification();
            setNotifyAt(null);
          }
          setDisplayTime(currentDisplayTime);
          lastDisplayedTime = currentDisplayTime;
        }
        animationFrame = requestAnimationFrame(update);
      } else {
        setDisplayTime(pausedTime);
      }
    };
    update();
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isRunning, startTimestamp, pausedTime, notifyAt, setNotifyAt]);

  if (!settings.showStopwatch) return null;

  const minutes = Math.floor(displayTime / 600);
  const seconds = Math.floor((displayTime % 600) / 10);

  const handlePresetClick = async (deciseconds: number) => {
    setAnchorEl(null);
    if (notifyAt === deciseconds) {
      setNotifyAt(null);
      return;
    }
    await requestNotificationPermission();
    setNotifyAt(deciseconds);
  };

  return (
    <Box sx={{
      position: 'fixed',
      top: 0,
      right: 11,
      zIndex: 2000,
      display: 'flex',
      height: APPBAR_HEIGHT,
      alignItems: 'center',
      color: 'white',
    }}>
      <IconButton onClick={handleReset} aria-label="Reset stopwatch" size="small" sx={{color: 'inherit'}}>
        <RestartAltRoundedIcon/>
      </IconButton>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label="Set notification timer"
        size="small"
        sx={{color: notifyAt !== null ? 'warning.light' : 'inherit'}}
      >
        {notifyAt !== null
          ? <NotificationsActiveIcon fontSize="small"/>
          : <NotificationsNoneIcon fontSize="small"/>}
      </IconButton>
      <Typography
        variant="body1"
        sx={{fontWeight: 500, letterSpacing: 1, color: 'inherit', mx: 1, fontVariantNumeric: 'tabular-nums'}}
      >
        {minutes.toString()}:{seconds.toString().padStart(2, "0")}
      </Typography>
      <IconButton onClick={handleStartStop} aria-label={isRunning ? "Stop stopwatch" : "Start stopwatch"} size="small"
                  sx={{color: 'inherit'}}>
        {isRunning ? <PauseIcon/> : <PlayArrowIcon/>}
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
        transformOrigin={{vertical: 'top', horizontal: 'right'}}
      >
        <Box sx={{p: 1.5}}>
          <Typography variant="caption" sx={{display: 'block', mb: 1, color: 'text.secondary'}}>
            Notify at
          </Typography>
          <Box sx={{display: 'flex', gap: 0.5}}>
            {PRESETS.map(preset => (
              <Button
                key={preset.deciseconds}
                size="small"
                variant={notifyAt === preset.deciseconds ? 'contained' : 'outlined'}
                onClick={() => handlePresetClick(preset.deciseconds)}
                sx={{minWidth: 0, px: 1}}
              >
                {preset.label}
              </Button>
            ))}
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export default AppBarStopwatch;
