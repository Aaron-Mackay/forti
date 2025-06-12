'use client';

import React from 'react';
import {Button, TableCell, TableRow, TextField} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import {createFilterOptions} from '@mui/material/Autocomplete';
import {ToggleableEditableField} from '@/components/ToggleableEditableField';
import {useWorkoutEditorContext} from '@/context/WorkoutEditorContext';
import {Exercise} from "@prisma/client";
import {FilterOptionsState} from "@mui/material/useAutocomplete/useAutocomplete";
import {CompactAutocomplete} from "@/components/CompactUI";

import {WorkoutExercisePrisma} from "@/types/dataTypes";
import {Dir} from "@lib/useWorkoutEditor";
import {blue} from "@mui/material/colors";

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
  exerciseLink: WorkoutExercisePrisma
  index: number
  workoutId: number
  weekId: number
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
  const setCount = exerciseLink.sets.length;

  return (
    <TableRow>
      <TableCell align={"center"}>{index + 1}</TableCell>

      <TableCell align={"center"}>
        {isInEditMode ? (
          <CompactAutocomplete
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
            renderInput={(params) => <TextField variant="standard" {...params}/>}
            filterOptions={filterOptions}
          />
        ) : (
          category
        )}
      </TableCell>

      <TableCell align={"center"}>
        {isInEditMode && category ? (
          <CompactAutocomplete
            freeSolo
            options={allExercises.filter((ex) => ex.category === category).map((ex) => ex.name)}
            value={exerciseName}
            onInputChange={(_event, newInputValue) => {
              debouncedDispatch({
                type: 'UPDATE_EXERCISE',
                weekId,
                workoutId,
                workoutExerciseId: exerciseLink.id,
                exerciseName: newInputValue,
                exercises: allExercises,
                category,
              });
            }}
            renderInput={(params) => <TextField variant="standard" {...params}/>}
            filterOptions={filterOptions}
          />
        ) : (
          exerciseName
        )}
      </TableCell>

      <TableCell align={"center"}>
        <ToggleableEditableField
          inputProps={{style: {textAlign: 'center'}}}
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
          inputProps={{style: {textAlign: 'center'}}}
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
      {Array.from({length: setCount}).map((_, i) => {
        const set = exerciseLink.sets[i];
        return (
          <React.Fragment key={i}>
            <TableCell align={"center"}>
              <ToggleableEditableField
                inputProps={{style: { textAlign: 'center'}, inputMode: 'numeric'}}
                isInEditMode={isInEditMode}
                value={set?.weight ?? ''}
                onChange={(val) =>
                  dispatch({
                    type: 'UPDATE_SET_WEIGHT',
                    workoutExerciseId: exerciseLink.id,
                    setId: set.id,
                    weight: val,
                  })
                }
              />
            </TableCell>
            <TableCell align={"center"}>
              <ToggleableEditableField
                inputProps={{style: {textAlign: 'center'}, inputMode: 'numeric'}}
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
      {Array.from({length: (maxSetCount - setCount)*2}).map((_, i) => {
        return (
          <TableCell key={i}/>
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
                dir: Dir.UP,
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
                dir: Dir.DOWN,
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
