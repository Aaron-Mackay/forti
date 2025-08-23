'use client';

import {Box, Container, List, ListItem, ListItemButton, ListItemText, Typography} from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import {WorkoutPrisma} from '@/types/dataTypes';
import Stopwatch from "./Stopwatch";
import './exercisesListView.css'
import CustomAppBar from "@/components/CustomAppBar";

export default function ExercisesListView({
                                            workout,
                                            onBack,
                                            onSelectExercise,
                                            stopwatchIsRunning,
                                            stopwatchStartTimestamp,
                                            stopwatchPausedTime,
                                            onStopwatchStartStop,
                                            onStopwatchReset,
                                            isStopwatchVisible,
                                            setIsStopwatchVisible
                                          }: {
  workout: WorkoutPrisma;
  onBack: () => void;
  onSelectExercise: (exerciseId: number) => void;
  stopwatchIsRunning: boolean;
  stopwatchStartTimestamp: number | null;
  stopwatchPausedTime: number;
  onStopwatchStartStop: () => void;
  onStopwatchReset: () => void;
  isStopwatchVisible: boolean;
  setIsStopwatchVisible: (isVisible: boolean) => void;
}) {
  return (
    <Box sx={{
      minHeight: '100dvh',
      bgcolor: 'background.default',
      color: 'text.primary',
      display: 'flex',
      flexDirection: 'column',
      height: "100dvh"
    }}>
      <CustomAppBar title={workout.name} onBack={onBack} showBack/>
      <Container
        maxWidth="sm"
        sx={{
          py: 2,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1
        }}
      >
        <Typography variant="subtitle1" gutterBottom>
          Exercises
        </Typography>
        <List
          className={"maskedOverflow"}
          sx={{
            flex: 1,
            overflowY: 'auto',
            mb: 2,
            minHeight: 0
          }}
        >
          {workout.exercises.map((ex) => (
            <ListItem key={ex.id} disablePadding>
              <ListItemButton onClick={() => onSelectExercise(ex.id)} sx={{display: 'flex', alignItems: 'center'}}>
                <ListItemText
                  primary={ex.exercise.name}
                  sx={{flex: 1}}
                />
                <Box sx={{display: 'flex', alignItems: 'center', ml: 2}}>
                  {ex.sets.map((set, idx) => (
                    set.reps ? <TaskAltIcon key={idx}/> : <PanoramaFishEyeIcon key={idx}/>
                  ))}
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Stopwatch
          isRunning={stopwatchIsRunning}
          startTimestamp={stopwatchStartTimestamp}
          pausedTime={stopwatchPausedTime}
          onStartStop={onStopwatchStartStop}
          onReset={onStopwatchReset}
          isStopwatchVisible={isStopwatchVisible}
          setIsStopwatchVisible={setIsStopwatchVisible}
        />
      </Container>
    </Box>
  );
}