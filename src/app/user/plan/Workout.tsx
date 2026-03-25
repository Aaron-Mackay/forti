'use client';

import React, {useState} from 'react';
import {Box, Button, TableBody, TableCell, TableHead, TableRow, Typography} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ExerciseRow from './ExerciseRow';
import {ToggleableEditableField} from './ToggleableEditableField';
import {useWorkoutEditorContext} from '@/context/WorkoutEditorContext';
import {CompactTable} from './CompactUI';
import ProgressIcon from '@/lib/ProgressIcon';
import {getWorkoutStatus} from '@/lib/workoutProgress';

import {WorkoutPrisma} from "@/types/dataTypes";
import {Dir} from "@lib/useWorkoutEditor";


interface WorkoutProps {
  planId: number
  weekId: number
  index: number
  workout: WorkoutPrisma
  isInEditMode: boolean
  categories: string[]
  weekWorkoutCount: number
}

const Workout = ({
                   planId,
                   weekId,
                   workout,
                   index,
                   isInEditMode,
                   categories,
                   weekWorkoutCount
                 }: WorkoutProps) => {
  const {dispatch} = useWorkoutEditorContext();
  const [noteExpanded, setNoteExpanded] = useState(false);

  const baseColumns = 7; // first 7 fixed cols (order, category, exercise, repRange, rest, RPE, RIR)
  const maxRegularSetCount = Math.max(...workout.exercises.map(e => e.sets.filter(s => !s.isDropSet).length), 0);
  const setColumns = maxRegularSetCount * 2; // each set has 2 cols
  const editModeExtraColumn = isInEditMode ? 1 : 0;
  const totalColumns = baseColumns + setColumns + editModeExtraColumn;

  return (
    <>
      <Box component="h4" className="mt-3" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        Workout {workout.order} -{' '}
        <ToggleableEditableField
          inputProps={{style: {textAlign: 'center'}}}
          isInEditMode={isInEditMode}
          value={workout.name ?? ''}
          onChange={(val) =>
            dispatch({
              type: 'UPDATE_WORKOUT_NAME',
              planId,
              weekId,
              workoutId: workout.id,
              name: val,
            })
          }
        />
        <ProgressIcon status={getWorkoutStatus(workout)} />
      </Box>

      {workout.notes && (
        <Typography
          component="div"
          variant="caption"
          color="text.secondary"
          onClick={() => setNoteExpanded(v => !v)}
          sx={{display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, cursor: 'pointer', overflow: 'hidden'}}
        >
          <ChatBubbleOutlineIcon sx={{fontSize: 12, flexShrink: 0}}/>
          <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: noteExpanded ? 'normal' : 'nowrap'}}>
            {workout.notes}
          </span>
        </Typography>
      )}

      {isInEditMode && (
        <>
          <Button onClick={() => dispatch({type: 'REMOVE_WORKOUT', planId, weekId, workoutId: workout.id})}>
            Remove Workout
          </Button>
          <Button
            disabled={workout.order === 1}
            onClick={() => dispatch({type: 'MOVE_WORKOUT', planId, dir: Dir.UP, index, weekId})}
          >
            &uarr;
          </Button>
          <Button
            disabled={workout.order === weekWorkoutCount}
            onClick={() => dispatch({type: 'MOVE_WORKOUT', planId, dir: Dir.DOWN, index, weekId})}
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
          <col style={{width: '5em'}}/>
          <col style={{width: '5em'}}/>
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
            <TableCell></TableCell>
            <TableCell></TableCell>
            {Array.from({length: maxRegularSetCount}).map((_, idx) => (
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
            <TableCell align={"center"}>Target RPE</TableCell>
            <TableCell align={"center"}>Target RIR</TableCell>
            {Array.from({length: maxRegularSetCount}).map((_, idx) => (
              <React.Fragment key={idx}>
                <TableCell align={"center"}>Weight</TableCell>
                <TableCell align={"center"}>Reps</TableCell>
              </React.Fragment>
            ))}
          </TableRow>
        </TableHead>

        <TableBody sx={{fontSize: '0.8rem'}}>
          {workout.exercises.map((exerciseLink, i) => (
            <ExerciseRow
              planId={planId}
              key={exerciseLink.id}
              exerciseLink={exerciseLink}
              index={i}
              workoutId={workout.id}
              weekId={weekId}
              isInEditMode={isInEditMode}
              categories={categories}
              workoutExerciseCount={workout.exercises.length}
              maxSetCount={maxRegularSetCount}
            />
          ))}

          {isInEditMode && (
            <TableRow>
              <TableCell colSpan={totalColumns} align={"center"}>
                <Button onClick={() => dispatch({type: 'ADD_EXERCISE', planId, weekId, workoutId: workout.id})}>
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