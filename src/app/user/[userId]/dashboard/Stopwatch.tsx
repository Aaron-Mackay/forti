import React, { useEffect, useState } from "react";
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import "./stopwatch.css";

type StopwatchProps = {
  isRunning: boolean;
  startTimestamp: number | null;
  pausedTime: number; // in deciseconds
  onStartStop: () => void;
  onReset: () => void;
};

const Stopwatch: React.FC<StopwatchProps> = ({
                                               isRunning,
                                               startTimestamp,
                                               pausedTime,
                                               onStartStop,
                                               onReset,
                                             }) => {
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

  // time is incremented by 1 if running elsewhere, but displayed here.
  const minutes = Math.floor(displayTime / 600)
  const seconds = Math.floor((displayTime % 600) / 10)
  const deciseconds = displayTime % 10;
  return (
    <div className="stopwatch-outer-container">
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
      <button
        className="stopwatch-reset-circle"
        onClick={onReset}
        aria-label="Reset stopwatch"
      >
        <RestartAltRoundedIcon/>
      </button>
    </div>
  );
};

export default Stopwatch;