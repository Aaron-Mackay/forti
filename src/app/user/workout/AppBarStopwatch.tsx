import React, {useEffect, useState} from "react";
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import {Box, IconButton, Typography} from "@mui/material";
import {useSettings} from "@lib/providers/SettingsProvider";
import {APPBAR_HEIGHT} from "@/components/CustomAppBar";
import {useStopwatch} from "@/app/user/workout/StopwatchContext";

const AppBarStopwatch: React.FC = () => {
  const {settings} = useSettings();
  const {stopwatch, handleStartStop, handleReset} = useStopwatch();
  const {isRunning, startTimestamp, pausedTime} = stopwatch;
  const [displayTime, setDisplayTime] = useState(pausedTime);

  useEffect(() => {
    let animationFrame: number;
    let lastDisplayedTime = pausedTime;
    const update = () => {
      if (isRunning && startTimestamp !== null) {
        const elapsed = Math.floor((Date.now() - startTimestamp) / 100);
        const currentDisplayTime = pausedTime + elapsed;
        if (currentDisplayTime !== lastDisplayedTime) {
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
  }, [isRunning, startTimestamp, pausedTime]);

  if (!settings.showStopwatch) return null;

  const minutes = Math.floor(displayTime / 600);
  const seconds = Math.floor((displayTime % 600) / 10);
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
    </Box>
  );
};

export default AppBarStopwatch;
