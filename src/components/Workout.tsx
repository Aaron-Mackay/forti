'use client';

import React from 'react';
import {Button, TableBody, TableCell, TableHead, TableRow} from '@mui/material';
import ExerciseRow from './ExerciseRow';
import {ToggleableEditableField} from '@/components/ToggleableEditableField';
import {useWorkoutEditorContext} from '@/context/WorkoutEditorContext';
import {Exercise} from "@prisma/client";
import {CompactTable} from './CompactUI';

import {WorkoutPrisma} from "@/types/dataTypes";
import {Dir} from "@lib/useWorkoutEditor";


interface WorkoutProps {
  weekId: number
  index: number
  workout: WorkoutPrisma
  isInEditMode: boolean
  categories: string[]
  allExercises: Exercise[]
  weekWorkoutCount: number
}

const Workout = ({
                   weekId,
                   workout,
                   index,
                   isInEditMode,
                   categories,
                   allExercises,
                   weekWorkoutCount
                 }: WorkoutProps) => {
  const {dispatch} = useWorkoutEditorContext();

  const baseColumns = 5; // first 5 fixed cols
  const setColumns = Math.max(...workout.exercises.map(e => e.sets.length)) * 2; // each set has 2 cols
  const editModeExtraColumn = isInEditMode ? 1 : 0;
  const totalColumns = baseColumns + setColumns + editModeExtraColumn;

  return (
    <>
      <h4 className="mt-3">
        Workout {workout.order} -{' '}
        <ToggleableEditableField
          inputProps={{style: {textAlign: 'center'}}}
          isInEditMode={isInEditMode}
          value={workout.name ?? ''}
          onChange={(val) =>
            dispatch({
              type: 'UPDATE_WORKOUT_NAME',
              weekId,
              workoutId: workout.id,
              name: val,
            })
          }
        />
      </h4>

      {isInEditMode && (
        <>
          <Button onClick={() => dispatch({type: 'REMOVE_WORKOUT', weekId, workoutId: workout.id})}>
            Remove Workout
          </Button>
          <Button
            disabled={workout.order === 1}
            onClick={() => dispatch({type: 'MOVE_WORKOUT', dir: Dir.UP, index, weekId})}
          >
            &uarr;
          </Button>
          <Button
            disabled={workout.order === weekWorkoutCount}
            onClick={() => dispatch({type: 'MOVE_WORKOUT', dir: Dir.DOWN, index, weekId})}
          >
            &darr;
          </Button>
        </>
      )}

      <CompactTable className="table table-striped text-center table-compact">
        <colgroup>
          <col style={{width: '3em'}}/>
          <col style={{width: '8em'}}/>
          <col style={{width: '20em'}}/>
          <col style={{width: '6em'}}/>
          <col style={{width: '6em'}}/>
          {Array.from({length: setColumns}).map((_, i) => (
            <col key={i} style={{width: '4em'}}/>
          ))}
          {isInEditMode &&
            <col style={{width: '30em'}}/>
          }
        </colgroup>
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            {Array.from({length: Math.max(...workout.exercises.map((e) => e.sets.length))}).map((_, idx) => (
              <React.Fragment key={idx}>
                <TableCell colSpan={2} align={"center"}>Set {idx + 1}</TableCell>
              </React.Fragment>
            ))}
          </TableRow>
          <TableRow>
            <TableCell></TableCell>
            <TableCell align={"center"}>Category</TableCell>
            <TableCell align={"center"}>Exercise</TableCell>
            <TableCell align={"center"}>Rep Range</TableCell>
            <TableCell align={"center"}>Rest</TableCell>
            {Array.from({length: Math.max(...workout.exercises.map((e) => e.sets.length))}).map((_, idx) => (
              <React.Fragment key={idx}>
                <TableCell align={"center"}>Reps</TableCell>
                <TableCell align={"center"}>Weight</TableCell>
              </React.Fragment>
            ))}
          </TableRow>
        </TableHead>

        <TableBody sx={{fontSize: '0.8rem'}}>
          {workout.exercises.map((exerciseLink, i) => (
            <ExerciseRow
              key={exerciseLink.id}
              exerciseLink={exerciseLink}
              index={i}
              workoutId={workout.id}
              weekId={weekId}
              isInEditMode={isInEditMode}
              allExercises={allExercises}
              categories={categories}
              workoutExerciseCount={workout.exercises.length}
              maxSetCount={Math.max(...workout.exercises.map((e) => e.sets.length))}
            />
          ))}

          {isInEditMode && (
            <TableRow>
              <TableCell colSpan={totalColumns} align={"center"}>
                <Button onClick={() => dispatch({type: 'ADD_EXERCISE', weekId, workoutId: workout.id})}>
                  Add Exercise
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </CompactTable>
    </>
  );
};

export default Workout;