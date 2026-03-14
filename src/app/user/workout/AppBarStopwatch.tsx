import React, {useEffect, useRef, useState} from "react";
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

function createSilentAudio(): { audio: HTMLAudioElement; ctx: AudioContext } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AudioCtx: typeof AudioContext = (window as any).AudioContext ?? (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const dest = ctx.createMediaStreamDestination();
  const audio = new Audio();
  audio.srcObject = dest.stream;
  audio.loop = true;
  return {audio, ctx};
}

async function activateMediaSession(
  handleStartStop: () => void,
  handleResetFn: () => void,
  silentAudioRef: React.MutableRefObject<HTMLAudioElement | null>,
  mediaAudioCtxRef: React.MutableRefObject<AudioContext | null>,
): Promise<void> {
  if (!('mediaSession' in navigator)) return;
  if (!('AudioContext' in window || 'webkitAudioContext' in window)) return;
  if (silentAudioRef.current) return; // already active
  const {audio, ctx} = createSilentAudio();
  silentAudioRef.current = audio;
  mediaAudioCtxRef.current = ctx;
  try {
    await audio.play();
  } catch {
    silentAudioRef.current = null;
    mediaAudioCtxRef.current = null;
    return; // autoplay blocked — MediaSession won't be shown
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: '0:00',
    artist: 'Forti Workout',
    artwork: [{src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png'}],
  });
  navigator.mediaSession.playbackState = 'playing';
  navigator.mediaSession.setActionHandler('play', handleStartStop);
  navigator.mediaSession.setActionHandler('pause', handleStartStop);
  navigator.mediaSession.setActionHandler('stop', handleResetFn);
}

function deactivateMediaSession(
  silentAudioRef: React.MutableRefObject<HTMLAudioElement | null>,
  mediaAudioCtxRef: React.MutableRefObject<AudioContext | null>,
): void {
  if (!('mediaSession' in navigator)) return;
  if (silentAudioRef.current) {
    silentAudioRef.current.pause();
    silentAudioRef.current.srcObject = null;
    silentAudioRef.current = null;
  }
  if (mediaAudioCtxRef.current) {
    mediaAudioCtxRef.current.close()?.catch(() => {});
    mediaAudioCtxRef.current = null;
  }
  navigator.mediaSession.playbackState = 'none';
  navigator.mediaSession.setActionHandler('play', null);
  navigator.mediaSession.setActionHandler('pause', null);
  navigator.mediaSession.setActionHandler('stop', null);
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
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaAudioCtxRef = useRef<AudioContext | null>(null);

  // Keep a ref so the rAF loop can read the latest notifyAt without re-running the effect
  const notifyAtRef = useRef(notifyAt);
  useEffect(() => { notifyAtRef.current = notifyAt; }, [notifyAt]);

  // Sync play/pause state into MediaSession when isRunning changes.
  // Activation happens in click handlers (requires user-gesture context for audio.play()).
  useEffect(() => {
    if (isRunning) {
      if (silentAudioRef.current) {
        silentAudioRef.current.play().catch(() => {});
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      }
    } else {
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      }
    }
  }, [isRunning]);

  // Full cleanup on unmount
  useEffect(() => {
    return () => deactivateMediaSession(silentAudioRef, mediaAudioCtxRef);
  }, []);

  // rAF loop — notifyAt is read via ref so this effect stays stable when notify fires
  useEffect(() => {
    let animationFrame: number;
    let lastDisplayedTime = pausedTime;
    const update = () => {
      if (isRunning && startTimestamp !== null) {
        const elapsed = Math.floor((Date.now() - startTimestamp) / 100);
        const currentDisplayTime = pausedTime + elapsed;
        if (currentDisplayTime !== lastDisplayedTime) {
          const na = notifyAtRef.current;
          if (na !== null && lastDisplayedTime < na && currentDisplayTime >= na) {
            fireRestNotification();
            notifyAtRef.current = null;
            setNotifyAt(null);
          }
          // Update MediaSession title once per second
          const prevSec = Math.floor(lastDisplayedTime / 10);
          const currSec = Math.floor(currentDisplayTime / 10);
          if (currSec !== prevSec && 'mediaSession' in navigator && navigator.mediaSession.metadata) {
            const m = Math.floor(currentDisplayTime / 600);
            const s = Math.floor((currentDisplayTime % 600) / 10);
            navigator.mediaSession.metadata.title = `${m}:${s.toString().padStart(2, '0')}`;
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
  }, [isRunning, startTimestamp, pausedTime, setNotifyAt]);

  if (!settings.showStopwatch) return null;

  const minutes = Math.floor(displayTime / 600);
  const seconds = Math.floor((displayTime % 600) / 10);

  const handlePlayPauseClick = async () => {
    if (!isRunning) {
      await activateMediaSession(handleStartStop, handleResetClick, silentAudioRef, mediaAudioCtxRef);
    }
    handleStartStop();
  };

  const handleResetClick = () => {
    deactivateMediaSession(silentAudioRef, mediaAudioCtxRef);
    handleReset();
  };

  const handlePresetClick = async (deciseconds: number) => {
    setAnchorEl(null);
    if (notifyAt === deciseconds) {
      setNotifyAt(null);
      return;
    }
    await requestNotificationPermission();
    setNotifyAt(deciseconds);
    if (!isRunning) {
      await activateMediaSession(handleStartStop, handleResetClick, silentAudioRef, mediaAudioCtxRef);
      handleStartStop();
    }
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
      <IconButton onClick={handleResetClick} aria-label="Reset stopwatch" size="small" sx={{color: 'inherit'}}>
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
      <IconButton onClick={handlePlayPauseClick} aria-label={isRunning ? "Stop stopwatch" : "Start stopwatch"} size="small"
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
