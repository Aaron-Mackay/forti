'use client';

import React from 'react';
import {Button, TableCell, TableRow, TextField} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import Autocomplete, {createFilterOptions} from '@mui/material/Autocomplete';
import {ToggleableEditableField} from '@/components/ToggleableEditableField';
import {useWorkoutEditorContext} from '@/context/WorkoutEditorContext';
import {Exercise} from "@prisma/client";
import {EditableExercise} from "@/types/editableData";
import {FilterOptionsState} from "@mui/material/useAutocomplete/useAutocomplete";

const filter = createFilterOptions<string>();
const filterOptions = (options: string[], params: FilterOptionsState<string>) => {
  const filtered = filter(options, params);
  const {inputValue} = params;
  const isExisting = options.some((option) => inputValue === option);
  if (inputValue.length > 2 && !isExisting) {
    filtered.push(inputValue);
  }
  return filtered;
};

interface ExerciseRowProps {
  exerciseLink: EditableExercise
  index: number
  workoutId: string
  weekId: string
  isInEditMode: boolean
  allExercises: Exercise[]
  categories: string[]
  maxSetCount: number
  workoutExerciseCount: number
}

const ExerciseRow = ({
                       exerciseLink,
                       index,
                       workoutId,
                       weekId,
                       isInEditMode,
                       allExercises,
                       categories,
                       maxSetCount,
                       workoutExerciseCount,
                     }: ExerciseRowProps) => {
  const {dispatch, debouncedDispatch} = useWorkoutEditorContext();
  const category = exerciseLink.exercise?.category || "";
  const exerciseName = exerciseLink.exercise?.name || "";

  return (
    <TableRow>
      <TableCell align={"center"}>{index + 1}</TableCell>

      <TableCell align={"center"}>
        {isInEditMode ? (
          <Autocomplete
            freeSolo
            options={categories}
            value={category}
            onInputChange={(_event, newInputValue) => {
              debouncedDispatch({
                type: 'UPDATE_CATEGORY',
                weekId,
                workoutId,
                workoutExerciseId: exerciseLink.id,
                category: newInputValue,
              });
            }}
            renderInput={(params) => <TextField variant="standard" {...params} label="Category"/>}
            filterOptions={filterOptions}
          />
        ) : (
          category
        )}
      </TableCell>

      <TableCell align={"center"}>
        {isInEditMode && category ? (
          <Autocomplete
            freeSolo
            options={allExercises.filter((ex) => ex.category === category).map((ex) => ex.name)}
            value={exerciseName}
            onInputChange={(_event, newInputValue) => {
              debouncedDispatch({
                type: 'UPDATE_EXERCISE',
                weekId,
                workoutId,
                workoutExerciseId: exerciseLink.id,
                exerciseId: newInputValue,
                exercises: allExercises,
                category,
              });
            }}
            renderInput={(params) => <TextField variant="standard" {...params} label="Exercise"/>}
            filterOptions={filterOptions}
          />
        ) : (
          exerciseName
        )}
      </TableCell>

      <TableCell align={"center"}>
        <ToggleableEditableField
          inputProps={{style: {width: '10ch', textAlign: 'center'}}}
          isInEditMode={isInEditMode}
          value={exerciseLink.repRange ?? ''}
          onChange={(val) =>
            dispatch({
              type: 'UPDATE_REP_RANGE',
              workoutExerciseId: exerciseLink.id,
              repRange: val,
            })
          }
        />
      </TableCell>

      <TableCell align={"center"}>
        <ToggleableEditableField
          inputProps={{style: {width: '10ch', textAlign: 'center'}}}
          isInEditMode={isInEditMode}
          value={exerciseLink.restTime ?? ''}
          onChange={(val) =>
            dispatch({
              type: 'UPDATE_REST_TIME',
              workoutExerciseId: exerciseLink.id,
              restTime: val,
            })
          }
        />
      </TableCell>

      {Array.from({length: maxSetCount}).map((_, i) => {
        const set = exerciseLink.sets[i];
        return (
          <React.Fragment key={i}>
            <TableCell align={"center"}>
              <ToggleableEditableField
                inputProps={{style: {width: '5ch', textAlign: 'center'}, inputMode: 'numeric'}}
                isInEditMode={isInEditMode}
                value={set?.weight ?? ''}
                onChange={(val) =>
                  dispatch({
                    type: 'UPDATE_SET_WEIGHT',
                    workoutExerciseId: exerciseLink.id,
                    setId: set.id,
                    weight: parseFloat(val),
                  })
                }
              />
            </TableCell>
            <TableCell align={"center"}>
              <ToggleableEditableField
                inputProps={{style: {width: '4ch', textAlign: 'center'}, inputMode: 'numeric'}}
                isInEditMode={isInEditMode}
                value={set?.reps ?? ''}
                onChange={(val) =>
                  dispatch({
                    type: 'UPDATE_SET_REPS',
                    workoutExerciseId: exerciseLink.id,
                    setId: set.id,
                    reps: parseInt(val, 10),
                  })
                }
              />
            </TableCell>
          </React.Fragment>
        );
      })}

      {isInEditMode && (
        <TableCell>
          <Button
            onClick={() =>
              dispatch({
                type: 'ADD_SET',
                weekId,
                workoutId,
                exerciseId: exerciseLink.id,
              })
            }
          >
            +
          </Button>
          <Button
            onClick={() =>
              dispatch({
                type: 'REMOVE_SET',
                weekId,
                workoutId,
                exerciseId: exerciseLink.id,
              })
            }
          >
            -
          </Button>
          <Button
            onClick={() =>
              dispatch({
                type: 'REMOVE_EXERCISE',
                weekId,
                workoutId,
                exerciseId: exerciseLink.id,
              })
            }
          >
            <ClearIcon/>
          </Button>
          <Button
            disabled={exerciseLink.order === 1}
            onClick={() =>
              dispatch({
                type: 'MOVE_EXERCISE',
                dir: 'up',
                index,
                weekId,
                workoutId,
              })
            }
          >
            &uarr;
          </Button>
          <Button
            disabled={exerciseLink.order === workoutExerciseCount}
            onClick={() =>
              dispatch({
                type: 'MOVE_EXERCISE',
                dir: 'down',
                index,
                weekId,
                workoutId,
              })
            }
          >
            &darr;
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
};

export default ExerciseRow;
