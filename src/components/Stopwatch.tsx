import React, {useEffect, useState} from "react";
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import "./stopwatch.css";

const Stopwatch = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let intervalId: number | NodeJS.Timeout;
    if (isRunning) {
      intervalId = setInterval(() => setTime((prev) => prev + 100), 1000);
    }
    return () => clearInterval(intervalId);
  }, [isRunning]);

  // Minutes calculation
  const minutes = Math.floor((time % 360000) / 6000);

  // Seconds calculation
  const seconds = Math.floor((time % 6000) / 100);

  const startAndStop = () => {
    setIsRunning((prev) => !prev);
  };

  const reset = () => {
    setTime(0);
  };
  return (
    <div className="stopwatch-outer-container">
      <button
        className={`stopwatch-circle${isRunning ? " running" : ""}`}
        onClick={startAndStop}
        aria-label={isRunning ? "Stop stopwatch" : "Start stopwatch"}
      >
        <span className="stopwatch-time">
        {minutes.toString().padStart(2, "0")}:
          {seconds.toString().padStart(2, "0")}
        </span>
      </button>
      <button
        className="stopwatch-reset-circle"
        onClick={reset}
        aria-label="Reset stopwatch"
      >
        <RestartAltRoundedIcon/>
      </button>
    </div>
  );
};

export default Stopwatch;