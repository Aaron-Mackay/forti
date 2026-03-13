'use client';

import React, {createContext, useContext, useState} from 'react';

type StopwatchState = {
  isRunning: boolean;
  startTimestamp: number | null;
  pausedTime: number;
};

type StopwatchContextType = {
  stopwatch: StopwatchState;
  notifyAt: number | null;
  setNotifyAt: (val: number | null) => void;
  handleStartStop: () => void;
  handleReset: () => void;
};

const StopwatchContext = createContext<StopwatchContextType | null>(null);

export function StopwatchProvider({children}: {children: React.ReactNode}) {
  const [stopwatch, setStopwatch] = useState<StopwatchState>({
    isRunning: false,
    startTimestamp: null,
    pausedTime: 0,
  });
  const [notifyAt, setNotifyAt] = useState<number | null>(null);

  const handleStartStop = () => {
    setStopwatch(sw => {
      if (sw.isRunning) {
        return {
          ...sw,
          isRunning: false,
          pausedTime: sw.startTimestamp !== null
            ? sw.pausedTime + Math.floor((Date.now() - sw.startTimestamp) / 100)
            : sw.pausedTime,
          startTimestamp: null,
        };
      } else {
        return {...sw, isRunning: true, startTimestamp: Date.now()};
      }
    });
  };

  const handleReset = () => {
    setStopwatch({isRunning: false, startTimestamp: null, pausedTime: 0});
    setNotifyAt(null);
  };

  return (
    <StopwatchContext.Provider value={{stopwatch, notifyAt, setNotifyAt, handleStartStop, handleReset}}>
      {children}
    </StopwatchContext.Provider>
  );
}

export function useStopwatch(): StopwatchContextType {
  const ctx = useContext(StopwatchContext);
  if (!ctx) throw new Error('useStopwatch must be used within a StopwatchProvider');
  return ctx;
}
