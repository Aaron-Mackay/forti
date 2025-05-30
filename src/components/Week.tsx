'use client';

import React from 'react';
import { Button, TableContainer } from '@mui/material';
import Workout from './Workout';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import {EditableWeek} from "@/types/editableData";
import {Exercise} from "@prisma/client";

interface WeekProps {
  week: EditableWeek
  isInEditMode: boolean
  categories: string[]
  allExercises: Exercise[]
}
const Week = ({
                week,
                isInEditMode,
                categories,
                allExercises
}: WeekProps) => {
  const { dispatch } = useWorkoutEditorContext();

  return (
    <div key={week.id} className="mb-2 border p-3">
      <h2>Week {week.order}</h2>
      {isInEditMode && (
        <Button onClick={() => dispatch({ type: 'REMOVE_WEEK', weekId: week.id })}>Remove Week</Button>
      )}

      {week.workouts.map((workout, woi) => (
        <TableContainer key={workout.id} className="mb-4">
          <Workout
            weekId={week.id}
            workout={workout}
            index={woi}
            isInEditMode={isInEditMode}
            categories={categories}
            allExercises={allExercises}
            weekWorkoutCount={week.workouts.length}
          />
        </TableContainer>
      ))}

      {isInEditMode && (
        <Button onClick={() => dispatch({ type: 'ADD_WORKOUT', weekId: week.id })}>Add Workout</Button>
      )}
    </div>
  );
};

export default Week;