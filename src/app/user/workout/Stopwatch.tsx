import React, {useEffect, useState} from "react";
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import "./stopwatch.css";
import {Collapse} from "@mui/material";

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
    <>
      {/*<Collapse in={!isStopwatchVisible} sx={{position: "absolute", bottom: 25, right: 25, aspectRatio: "1"}}>*/}
      {/*  <button*/}
      {/*    className="stopwatch-sidebutton-circle"*/}
      {/*    onClick={() => setIsStopwatchVisible(true)}*/}
      {/*    aria-label="Show stopwatch"*/}
      {/*  >*/}
      {/*    <TimerOutlinedIcon/>*/}
      {/*  </button>*/}
      {/*</Collapse>*/}

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
            aria-label="Hide stopwatch"
          >
            {isStopwatchVisible ? <KeyboardArrowDownOutlinedIcon/> : <TimerOutlinedIcon />}
          </button>
        </div>
    </>
  );
};

export default Stopwatch;