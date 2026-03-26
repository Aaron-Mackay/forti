'use client';

import React, {useState} from 'react';
import {Box, Button, Chip, IconButton, TableCell, TableRow, TextField, Typography} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import {createFilterOptions} from '@mui/material/Autocomplete';
import {ToggleableEditableField} from './ToggleableEditableField';
import {useWorkoutEditorContext} from '@/context/WorkoutEditorContext';
import {FilterOptionsState} from "@mui/material/useAutocomplete/useAutocomplete";
import {CompactAutocomplete} from "./CompactUI";

import {WorkoutExercisePrisma} from "@/types/dataTypes";
import {Dir} from "@lib/useWorkoutEditor";
import {AddExerciseForm} from '@/app/exercises/AddExerciseForm';
import {computeE1rm} from '@/lib/e1rm';

const filter = createFilterOptions<string>();
// Used for the category field: adds the typed value as a plain option
const filterOptions = (options: string[], params: FilterOptionsState<string>) => {
  const filtered = filter(options, params);
  const {inputValue} = params;
  const isExisting = options.some((option) => inputValue === option);
  if (inputValue.length > 2 && !isExisting) {
    filtered.push(inputValue);
  }
  return filtered;
};

const CREATE_PREFIX = '__create__:';
const exerciseFilter = createFilterOptions<string>();
// Used for the exercise name field: adds a sentinel create option
const exerciseFilterOptions = (options: string[], params: FilterOptionsState<string>) => {
  const filtered = exerciseFilter(options, params);
  const {inputValue} = params;
  if (inputValue.length > 0 && !options.some(o => o.toLowerCase() === inputValue.toLowerCase())) {
    filtered.push(`${CREATE_PREFIX}${inputValue}`);
  }
  return filtered;
};

interface ExerciseRowProps {
  exerciseLink: WorkoutExercisePrisma
  index: number
  planId: number
  workoutId: number
  weekId: number
  isInEditMode: boolean
  categories: string[]
  maxSetCount: number
  workoutExerciseCount: number
}

const ExerciseRow = ({
                       exerciseLink,
                       index,
                       planId,
                       workoutId,
                       weekId,
                       isInEditMode,
                       categories,
                       maxSetCount,
                       workoutExerciseCount,
                     }: ExerciseRowProps) => {
  const {dispatch, debouncedDispatch, allExercises, addExercise} = useWorkoutEditorContext();
  const category = exerciseLink.exercise?.category || "";
  const exerciseName = exerciseLink.exercise?.name || "";
  const [createOpen, setCreateOpen] = useState(false);

  const regularSets = exerciseLink.sets
    .filter(s => !s.isDropSet)
    .sort((a, b) => a.order - b.order);
  const setCount = regularSets.length;

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
                planId,
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
            filterOptions={exerciseFilterOptions}
            getOptionLabel={(option) =>
              option.startsWith(CREATE_PREFIX) ? option.slice(CREATE_PREFIX.length) : option
            }
            renderOption={({ key, ...optionProps }, option) =>
              option.startsWith(CREATE_PREFIX) ? (
                <li key={key} {...optionProps}>
                  <em>+ Create &quot;{option.slice(CREATE_PREFIX.length)}&quot;</em>
                </li>
              ) : (
                <li key={key} {...optionProps}>{option}</li>
              )
            }
            onChange={(_, newValue) => {
              if (typeof newValue === 'string' && newValue.startsWith(CREATE_PREFIX)) {
                setCreateOpen(true);
              }
            }}
            onInputChange={(_event, newInputValue) => {
              if (newInputValue.startsWith(CREATE_PREFIX)) return;
              debouncedDispatch({
                type: 'UPDATE_EXERCISE',
                planId,
                weekId,
                workoutId,
                workoutExerciseId: exerciseLink.id,
                exerciseName: newInputValue,
                exercises: allExercises,
                category,
              });
            }}
            renderInput={(params) => <TextField variant="standard" {...params}/>}
          />
        ) : (
          exerciseName
        )}
        <AddExerciseForm
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          initialName={exerciseName}
          onExerciseAdded={(newExercise) => {
            addExercise(newExercise);
            debouncedDispatch({
              type: 'UPDATE_EXERCISE',
              planId,
              weekId,
              workoutId,
              workoutExerciseId: exerciseLink.id,
              exerciseName: newExercise.name,
              exercises: [...allExercises, newExercise],
              category,
            });
            setCreateOpen(false);
          }}
        />
      </TableCell>

      <TableCell align={"center"}>
        <ToggleableEditableField
          inputProps={{style: {textAlign: 'center'}}}
          isInEditMode={isInEditMode}
          value={exerciseLink.repRange ?? ''}
          onChange={(val) =>
            dispatch({
              type: 'UPDATE_REP_RANGE',
              planId,
              weekId,
              workoutId,
              workoutExerciseId: exerciseLink.id,
              repRange: val,
            })
          }
        />
        {!isInEditMode && exerciseLink.isBfr && (
          <Chip label="BFR" size="small" color="warning" sx={{mt: 0.5, height: 18, fontSize: '0.7rem'}} />
        )}
      </TableCell>

      <TableCell align={"center"}>
        <ToggleableEditableField
          inputProps={{style: {textAlign: 'center'}}}
          isInEditMode={isInEditMode}
          value={exerciseLink.restTime ?? ''}
          onChange={(val) =>
            dispatch({
              type: 'UPDATE_REST_TIME',
              planId,
              weekId,
              workoutId,
              workoutExerciseId: exerciseLink.id,
              restTime: val,
            })
          }
        />
      </TableCell>

      <TableCell align={"center"}>
        <ToggleableEditableField
          inputProps={{style: {textAlign: 'center'}, inputMode: 'numeric'}}
          isInEditMode={isInEditMode}
          value={exerciseLink.targetRpe?.toString() ?? ''}
          disabled={exerciseLink.targetRir != null}
          disabledTitle="Clear RIR first"
          onChange={(val) =>
            dispatch({
              type: 'UPDATE_TARGET_EFFORT',
              planId,
              weekId,
              workoutId,
              workoutExerciseId: exerciseLink.id,
              field: 'targetRpe',
              value: val === '' ? null : Number(val),
            })
          }
        />
      </TableCell>

      <TableCell align={"center"}>
        <ToggleableEditableField
          inputProps={{style: {textAlign: 'center'}, inputMode: 'numeric'}}
          isInEditMode={isInEditMode}
          value={exerciseLink.targetRir?.toString() ?? ''}
          disabled={exerciseLink.targetRpe != null}
          disabledTitle="Clear RPE first"
          onChange={(val) =>
            dispatch({
              type: 'UPDATE_TARGET_EFFORT',
              planId,
              weekId,
              workoutId,
              workoutExerciseId: exerciseLink.id,
              field: 'targetRir',
              value: val === '' ? null : Number(val),
            })
          }
        />
      </TableCell>

      {regularSets.map((set) => {
        const drops = exerciseLink.sets
          .filter(s => s.isDropSet && s.parentSetId === set.id)
          .sort((a, b) => a.order - b.order);

        return (
          <React.Fragment key={set.id}>
            {/* Weight column */}
            <TableCell align={"center"} sx={{verticalAlign: 'top'}}>
              <ToggleableEditableField
                inputProps={{style: { textAlign: 'center'}, inputMode: 'numeric'}}
                isInEditMode={isInEditMode}
                value={set?.weight?.toString() ?? ''}
                onChange={(val) =>
                  dispatch({
                    type: 'UPDATE_SET_WEIGHT',
                    planId,
                    exerciseId: exerciseLink.id,
                    workoutId,
                    weekId,
                    setId: set.id,
                    weight: val === '' ? null : parseFloat(val),
                  })
                }
              />
              {drops.map((drop) => (
                <Box
                  key={drop.id}
                  sx={{mt: 0.5, pl: 0.75, borderLeft: '2px solid', borderColor: 'divider'}}
                >
                  <ToggleableEditableField
                    inputProps={{style: {textAlign: 'center'}, inputMode: 'numeric'}}
                    isInEditMode={isInEditMode}
                    value={drop.weight?.toString() ?? ''}
                    onChange={(val) =>
                      dispatch({
                        type: 'UPDATE_SET_WEIGHT',
                        planId,
                        exerciseId: exerciseLink.id,
                        workoutId,
                        weekId,
                        setId: drop.id,
                        weight: val === '' ? null : parseFloat(val),
                      })
                    }
                  />
                </Box>
              ))}
            </TableCell>

            {/* Reps column */}
            <TableCell align={"center"} sx={{verticalAlign: 'top'}}>
              <ToggleableEditableField
                inputProps={{style: {textAlign: 'center'}, inputMode: 'numeric'}}
                isInEditMode={isInEditMode}
                value={set?.reps ?? ''}
                onChange={(val) =>
                  dispatch({
                    type: 'UPDATE_SET_REPS',
                    planId,
                    exerciseId: exerciseLink.id,
                    workoutId,
                    weekId,
                    setId: set.id,
                    reps: parseInt(val, 10),
                  })
                }
              />
              {drops.map((drop, dropIdx) => (

                <Box
                  key={drop.id}
                  sx={{mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.25, pl: 0.75, borderLeft: '2px solid', borderColor: 'divider'}}
                >
                  <Box sx={{flex: 1}}>
                    {!isInEditMode && (
                      <Typography variant="caption" color="text.secondary" sx={{display: 'block', lineHeight: 1, mb: 0.25}}>
                        ↓ drop {dropIdx + 1}
                      </Typography>
                    )}
                    <ToggleableEditableField
                      inputProps={{style: {textAlign: 'center'}, inputMode: 'numeric'}}
                      isInEditMode={isInEditMode}
                      value={drop.reps ?? ''}
                      onChange={(val) =>
                        dispatch({
                          type: 'UPDATE_SET_REPS',
                          planId,
                          exerciseId: exerciseLink.id,
                          workoutId,
                          weekId,
                          setId: drop.id,
                          reps: parseInt(val, 10),
                        })
                      }
                    />
                  </Box>
                  {isInEditMode && (
                    <IconButton
                      size="small"
                      onClick={() =>
                        dispatch({
                          type: 'REMOVE_DROP_SET',
                          planId,
                          weekId,
                          workoutId,
                          exerciseId: exerciseLink.id,
                          setId: drop.id,
                        })
                      }
                      aria-label={`Remove drop set ${dropIdx + 1}`}
                    >
                      <CloseIcon sx={{fontSize: 14}}/>
                    </IconButton>
                  )}
                </Box>
              ))}
              {isInEditMode && (
                <Button
                  size="small"
                  sx={{mt: 0.5, fontSize: '0.65rem', py: 0, minHeight: 0, color: 'text.secondary'}}
                  onClick={() =>
                    dispatch({
                      type: 'ADD_DROP_SET',
                      planId,
                      weekId,
                      workoutId,
                      exerciseId: exerciseLink.id,
                      parentSetId: set.id,
                    })
                  }
                >
                  + drop
                </Button>
              )}
            </TableCell>

            {/* e1RM column */}
            <TableCell align={"center"} sx={{verticalAlign: 'top', color: 'text.secondary', fontSize: '0.78rem'}}>
              {(() => {
                const e1rm = computeE1rm(set.weight, set.reps);
                return e1rm != null ? Math.round(e1rm) : '—';
              })()}
            </TableCell>
          </React.Fragment>
        );
      })}

      {Array.from({length: (maxSetCount - setCount)*3}).map((_, i) => {
        return (
          <TableCell key={i}/>
        );
      })}

      {isInEditMode && (
        <TableCell>
          <Chip
            label="BFR"
            size="small"
            color={exerciseLink.isBfr ? 'warning' : 'default'}
            variant={exerciseLink.isBfr ? 'filled' : 'outlined'}
            onClick={() =>
              dispatch({
                type: 'TOGGLE_BFR',
                planId,
                weekId,
                workoutId,
                workoutExerciseId: exerciseLink.id,
                enabled: !exerciseLink.isBfr,
              })
            }
            sx={{mr: 0.5}}
          />
          <Button
            onClick={() =>
              dispatch({
                type: 'ADD_SET',
                planId,
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
                planId,
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
                planId,
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
                planId,
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
                planId,
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
