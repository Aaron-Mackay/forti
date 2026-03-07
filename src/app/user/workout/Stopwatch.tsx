import React, {useEffect, useState} from "react";
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import "./stopwatch.css";
import {Box, Collapse} from "@mui/material";
import {useSettings} from "@lib/providers/SettingsProvider";

type StopwatchProps = {
  isRunning: boolean;
  startTimestamp: number | null;
  pausedTime: number; // in deciseconds
  onStartStop: () => void;
  onReset: () => void;
  isStopwatchVisible: boolean;
  setIsStopwatchVisible: (isVisible: boolean) => void;
};

const Stopwatch: React.FC<StopwatchProps> = ({
                                               isRunning,
                                               startTimestamp,
                                               pausedTime,
                                               onStartStop,
                                               onReset,
                                               isStopwatchVisible,
                                               setIsStopwatchVisible
                                             }) => {
  const {settings} = useSettings();
  const [displayTime, setDisplayTime] = useState(pausedTime);

  useEffect(() => {
    let animationFrame: number;
    let lastDisplayedTime = pausedTime;
    const update = () => {
      if (isRunning && startTimestamp !== null) {
        const elapsed = Math.floor((Date.now() - startTimestamp) / 100);
        const currentDisplayTime = pausedTime + elapsed
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

  // time is incremented by 1 if running elsewhere, but displayed here.
  const minutes = Math.floor(displayTime / 600)
  const seconds = Math.floor((displayTime % 600) / 10)
  const deciseconds = displayTime % 10;
  return (
    <Box sx={{position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10}}>
      <div className="stopwatch-outer-container">
        <Collapse in={isStopwatchVisible}>
          <button
            className="stopwatch-sidebutton-circle"
            onClick={onReset}
            aria-label="Reset stopwatch"
          >
            <RestartAltRoundedIcon/>
          </button>
        </Collapse>
        <Collapse in={isStopwatchVisible}>
          <button
            className={`stopwatch-circle${isRunning ? " running" : ""}`}
            onClick={onStartStop}
            aria-label={isRunning ? "Stop stopwatch" : "Start stopwatch"}
          >
            <span className="stopwatch-time">
            {minutes.toString()}:
              {seconds.toString().padStart(2, "0")}:
              {deciseconds.toString()}
            </span>
          </button>
        </Collapse>
        <button
          className={`stopwatch-sidebutton-circle ${isRunning && !isStopwatchVisible && " active-stopwatch"}`}
          onClick={() => setIsStopwatchVisible(!isStopwatchVisible)}
          aria-label="Toggle stopwatch"
        >
          {isStopwatchVisible ? <KeyboardArrowDownOutlinedIcon/> : <TimerOutlinedIcon/>}
        </button>
      </div>
    </Box>
  );
};

export default Stopwatch;