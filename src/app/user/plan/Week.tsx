'use client';

import React from 'react';
import {Button, TableContainer} from '@mui/material';
import Workout from './Workout';
import {useWorkoutEditorContext} from '@/context/WorkoutEditorContext';
import {Exercise} from "@prisma/client";

import {WeekPrisma} from "@/types/dataTypes";
import Box from "@mui/material/Box";

interface WeekProps {
  week: WeekPrisma
  isInEditMode: boolean
  categories: string[]
  allExercises: Exercise[]
  planId: number
}

const Week = ({
                week,
                isInEditMode,
                categories,
                allExercises,
                planId
              }: WeekProps) => {
  const {dispatch} = useWorkoutEditorContext();

  return (
    <div key={week.id} className="mb-2 border p-3">
      <h2>Week {week.order}</h2>
      {isInEditMode && (
        <Button onClick={() => dispatch({type: 'REMOVE_WEEK', planId, weekId: week.id})}>Remove Week</Button>
      )}

      <Box sx={{
        display: "flex",
        flexDirection: "row",
        columnGap: 5,
        flexWrap: "nowrap",
        minWidth: "fit-content"
      }}>
        {week.workouts.map((workout, woi) => (
          <TableContainer key={workout.id} className="mb-4">
            <Workout
              planId={planId}
              weekId={week.id}
              workout={workout}
              index={woi}
              isInEditMode={isInEditMode}
              categories={categories}
              allExercises={allExercises}
              weekWorkoutCount={week.workouts.length}
            />
            <Button onClick={() => dispatch({type: 'DUPLICATE_WORKOUT', planId, weekId: week.id, workoutId: workout.id})}>
              Duplicate Workout
            </Button>
          </TableContainer>
        ))}
      </Box>

      {isInEditMode && (
        <Button onClick={() => dispatch({type: 'ADD_WORKOUT', planId, weekId: week.id})}>Add Workout</Button>
      )}
    </div>
  );
};

export default Week;