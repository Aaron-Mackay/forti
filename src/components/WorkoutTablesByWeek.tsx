'use client'

import React, {useEffect, useState} from 'react';
import {useWorkoutEditor} from '@/lib/useWorkoutEditor';
import {EditableUser} from '@/types/editableData';
import {getExercisesAndCategories, saveUserWorkoutData} from "@lib/api";
import {ToggleableEditableField} from "@/components/ToggleableEditableField";
import {Exercise} from "@prisma/client";
import Autocomplete, {createFilterOptions} from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import {Button} from "@mui/material";

const filter = createFilterOptions<string>();
const filterOptions = (options: string[], params) => {
  const filtered = filter(options, params);
  const {inputValue} = params;

  // Suggest the creation of a new value
  const isExisting = options.some((option) => inputValue === option);
  if (inputValue.length > 2 && !isExisting) {
    filtered.push(inputValue);
  }

  return filtered
}

interface Props {
  data: EditableUser,
  lockedInEditMode: boolean
}

const WorkoutTablesByWeek: React.FC<Props> = ({data, lockedInEditMode}) => {
  const {state, dispatch} = useWorkoutEditor(data as EditableUser);
  const [isInEditMode, setIsInEditMode] = useState(lockedInEditMode);

  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const handleSave = () => {
    saveUserWorkoutData(state)
  };

  useEffect(() => {
    getExercisesAndCategories()
      .then(({exercises, categories}) => {
        setAllExercises(exercises);
        setCategories(categories);
      });
  }, []);

  return (
    <>
      {!lockedInEditMode &&
        <Button onClick={() => setIsInEditMode(!isInEditMode)}>
          Edit mode {isInEditMode ? 'ON' : 'OFF'}
        </Button>}

      {isInEditMode && (
        <Button onClick={handleSave}>
          Save
        </Button>
      )}

      <h1>User: {state.name}</h1>

      {state.weeks.map((week) => (
        <div key={week.id} className="mb-2 border p-3">
          <h2>Week {week.order}</h2>
          {isInEditMode && (
            <Button
              onClick={() =>
                dispatch({
                  type: 'REMOVE_WEEK',
                  weekId: week.id,
                })
              }
            >
              Remove Week
            </Button>
          )}

          {week.workouts.map((workout, woi) => (
            <div key={workout.id} className="mb-4">
              <h4 className="mt-3">
                Workout {workout.order} -&nbsp;
                {<ToggleableEditableField
                  label={"Workout"}
                  inputProps={{style: {textAlign: "center"}}}
                  isInEditMode={isInEditMode}
                  value={workout.name ?? ''}
                  onChange={(val) =>
                    dispatch({
                      type: 'UPDATE_WORKOUT_NAME',
                      weekId: week.id,
                      workoutId: workout.id,
                      name: val
                    })
                  }
                />}
              </h4>
              {isInEditMode && (
                <>
                  <Button
                    onClick={() =>
                      dispatch({
                        type: 'REMOVE_WORKOUT',
                        weekId: week.id,
                        workoutId: workout.id
                      })
                    }
                  >
                    Remove Workout
                  </Button>
                  <Button
                    disabled={workout.order === Math.min(...week.workouts.map(wo => wo.order))}
                    onClick={() => {
                      dispatch({
                        type: 'MOVE_WORKOUT',
                        dir: 'up',
                        index: woi,
                        weekId: week.id,
                      })
                    }
                    }
                  >
                    &uarr;
                  </Button>
                  <Button
                    disabled={workout.order === Math.max(...week.workouts.map(wo => wo.order))}
                    onClick={() =>
                      dispatch({
                        type: 'MOVE_WORKOUT',
                        dir: 'down',
                        index: woi,
                        weekId: week.id,
                      })
                    }
                  >
                    &darr;
                  </Button>
                </>

              )}

              <table className="table table-striped text-center">
                <thead>
                <tr>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  {Array.from({length: Math.max(...workout.exercises.map((e) => e.sets.length))}).map(
                    (_, idx) => (
                      <React.Fragment key={idx}>
                        <th colSpan={2}>Set {idx + 1}</th>
                      </React.Fragment>
                    )
                  )}
                </tr>
                </thead>

                <tbody>
                {workout.exercises.map((exerciseLink, i) => (
                  <tr key={exerciseLink.id}>
                    <td>
                      {isInEditMode ?
                        <Autocomplete
                          freeSolo
                          options={categories}
                          value={exerciseLink.exercise?.category || ""}
                          onInputChange={(event, newInputValue) => {
                            dispatch({
                              type: "UPDATE_CATEGORY",
                              weekId: week.id,
                              workoutId: workout.id,
                              workoutExerciseId: exerciseLink.id,
                              category: newInputValue,
                            })
                          }}
                          renderInput={(params) => <TextField {...params} label="Category"/>}
                          filterOptions={filterOptions}
                        />
                        : exerciseLink.exercise.category}
                    </td>
                    <td>
                      {isInEditMode ?
                        (exerciseLink.exercise.category && (
                            <Autocomplete
                              freeSolo
                              options={allExercises
                                .filter((ex) => ex.category === exerciseLink.exercise.category)
                                .map((ex) => (ex.name))}
                              value={exerciseLink.exercise.name || ""}
                              onInputChange={(event, newInputValue) => {
                                dispatch({
                                  type: "UPDATE_EXERCISE",
                                  weekId: week.id,
                                  workoutId: workout.id,
                                  workoutExerciseId: exerciseLink.id,
                                  exerciseId: newInputValue,
                                  exercises: allExercises,
                                  category: exerciseLink.exercise.category
                                })
                              }}
                              renderInput={(params) => <TextField {...params} label="Exercise"/>}
                              filterOptions={filterOptions}
                              sx={{ width: "25rem" }}
                            />
                          )
                        )
                        : exerciseLink.exercise.name}
                    </td>
                    <td>
                      <ToggleableEditableField
                        label={"Rep Range"}
                        inputProps={{style: {width: "10ch", textAlign: "center"}}}
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
                    </td>
                    <td>
                      <ToggleableEditableField
                        label={"Rest"}
                        inputProps={{style: {width: "10ch", textAlign: "center"}}}
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
                    </td>

                    {exerciseLink.sets.map((set) => (
                      <React.Fragment key={set.id}>
                        <td>
                          <ToggleableEditableField
                            label={"Sets"}
                            inputProps={{style: {width: "5ch", textAlign: "center"}, inputMode: "numeric"}}
                            isInEditMode={isInEditMode}
                            value={set.weight ?? ''}
                            onChange={(val) =>
                              dispatch({
                                type: 'UPDATE_SET_WEIGHT',
                                workoutExerciseId: exerciseLink.id,
                                setId: set.id,
                                weight: parseFloat(val),
                              })
                            }
                          />
                        </td>
                        <td>
                          <ToggleableEditableField
                            label={"Reps"}
                            inputProps={{style: {width: "4ch", textAlign: "center"}, inputMode: "numeric"}}
                            isInEditMode={isInEditMode}
                            value={set.reps ?? ''}
                            onChange={(val) =>
                              dispatch({
                                type: 'UPDATE_SET_REPS',
                                workoutExerciseId: exerciseLink.id,
                                setId: set.id,
                                reps: parseInt(val, 10),
                              })
                            }
                          />
                        </td>
                      </React.Fragment>
                    ))}

                    {/* Empty cells for any missing sets */}
                    {Array.from({length: Math.max(...workout.exercises.map((e) => e.sets.length)) - exerciseLink.sets.length}).map((_, idx) => (
                      <React.Fragment key={`empty-${idx}`}>
                        <td>-</td>
                        <td>-</td>
                      </React.Fragment>
                    ))}

                    {isInEditMode && (
                      <td>
                        <Button
                          onClick={() =>
                            dispatch({
                              type: 'ADD_SET',
                              weekId: week.id,
                              workoutId: workout.id,
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
                              weekId: week.id,
                              workoutId: workout.id,
                              exerciseId: exerciseLink.id,
                            })
                          }
                        >
                          -
                        </Button>
                        &nbsp;Set&nbsp;&nbsp;
                        <Button
                          onClick={() =>
                            dispatch({
                              type: 'REMOVE_EXERCISE',
                              weekId: week.id,
                              workoutId: workout.id,
                              exerciseId: exerciseLink.id
                            })
                          }
                        >
                          x
                        </Button>
                        <Button
                          disabled={exerciseLink.order === Math.min(...workout.exercises.map(ex => ex.order))}
                          onClick={() => {
                            dispatch({
                              type: 'MOVE_EXERCISE',
                              dir: 'up',
                              index: i,
                              weekId: week.id,
                              workoutId: workout.id,
                            })
                          }
                          }
                        >
                          &uarr;
                        </Button>
                        <Button
                          disabled={exerciseLink.order === Math.max(...workout.exercises.map(ex => ex.order))}
                          onClick={() =>
                            dispatch({
                              type: 'MOVE_EXERCISE',
                              dir: 'down',
                              index: i,
                              weekId: week.id,
                              workoutId: workout.id,
                            })
                          }
                        >
                          &darr;
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}

                {isInEditMode && (
                  <tr>
                    <td colSpan={100}>
                      <Button
                        onClick={() =>
                          dispatch({
                            type: 'ADD_EXERCISE',
                            weekId: week.id,
                            workoutId: workout.id,
                          })
                        }
                      >
                        Add Exercise
                      </Button>
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          ))}

          {isInEditMode && (
            <Button
              onClick={() =>
                dispatch({
                  type: 'ADD_WORKOUT',
                  weekId: week.id,
                })
              }
            >
              Add Workout
            </Button>
          )}
        </div>
      ))}

      {isInEditMode && (
        <Button
          onClick={() =>
            dispatch({
              type: 'ADD_WEEK',
            })
          }
        >
          Add Week
        </Button>
      )}
    </>
  );
};

export default WorkoutTablesByWeek;
