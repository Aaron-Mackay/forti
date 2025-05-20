import React, {useEffect, useState} from 'react';
import {useWorkoutEditor} from '@/lib/useWorkoutEditor';
import {EditableUser} from '@/types/editableData';
import {getExercisesAndCategories, saveUserWorkoutData} from "@lib/api";
import {ToggleableEditableField} from "@/components/ToggleableEditableField";
import {Exercise} from "@prisma/client";

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
    <div className="container mt-4 mb-4">
      {!lockedInEditMode &&
        <button onClick={() => setIsInEditMode(!isInEditMode)}>
          Edit mode {isInEditMode ? 'ON' : 'OFF'}
        </button>}

      {isInEditMode && (
        <button onClick={handleSave}>
          Save
        </button>
      )}

      <h1>User: {state.name}</h1>

      {state.weeks.map((week) => (
        <div key={week.id} className="mb-2 border p-3">
          <h2>Week {week.order}</h2>
          {isInEditMode && (
            <button
              onClick={() =>
                dispatch({
                  type: 'REMOVE_WEEK',
                  weekId: week.id,
                })
              }
            >
              Remove Week
            </button>
          )}

          {week.workouts.map((workout, woi) => (
            <div key={workout.id} className="mb-4">
              <h4 className="mt-3">
                Workout {workout.order} -&nbsp;
                {<ToggleableEditableField
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
                  <button
                    onClick={() =>
                      dispatch({
                        type: 'REMOVE_WORKOUT',
                        weekId: week.id,
                        workoutId: workout.id
                      })
                    }
                  >
                    Remove Workout
                  </button>
                  <button
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
                  </button>
                  <button
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
                  </button>
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
                <tr>
                  <th>Muscle</th>
                  <th>Exercise</th>
                  <th>Rep Range</th>
                  <th>Rest</th>
                  {Array.from({length: Math.max(...workout.exercises.map((e) => e.sets.length))}).map(
                    (_, idx) => (
                      <React.Fragment key={idx}>
                        <th>Weight</th>
                        <th>Reps</th>
                      </React.Fragment>
                    )
                  )}
                </tr>
                </thead>

                <tbody>
                {workout.exercises.map((exerciseLink, i) => (
                  <tr key={exerciseLink.id}>
                    <td>
                      {isInEditMode ? (
                        <select
                          value={exerciseLink.exercise.category || ""}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_CATEGORY",
                              weekId: week.id,
                              workoutId: workout.id,
                              workoutExerciseId: exerciseLink.id,
                              category: e.target.value,
                            })
                          }
                        >
                          <option value="">--Select Muscle--</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      ) : (
                        exerciseLink.exercise.category || "-"
                      )}
                    </td>
                    <td>
                      {isInEditMode ?
                        (exerciseLink.exercise.category && (
                            <select
                              value={exerciseLink.exercise.id || ""}
                              onChange={(e) =>
                                dispatch({
                                  type: "UPDATE_EXERCISE",
                                  weekId: week.id,
                                  workoutId: workout.id,
                                  workoutExerciseId: exerciseLink.id,
                                  exerciseId: e.target.value,
                                  exercises: allExercises
                                })
                              }
                            >
                              <option value="">--Select Exercise--</option>
                              {allExercises
                                .filter((ex) => ex.category === exerciseLink.exercise.category)
                                .map((ex) => (
                                  <option key={ex.id} value={ex.id}>
                                    {ex.name}
                                  </option>
                                ))}
                            </select>)
                        )
                        : exerciseLink.exercise.name}
                    </td>
                    <td>
                      <ToggleableEditableField
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
                        <button
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
                        </button>
                        <button
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
                        </button>
                        &nbsp;Set&nbsp;&nbsp;
                        <button
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
                        </button>
                        <button
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
                        </button>
                        <button
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
                        </button>
                      </td>
                    )}
                  </tr>
                ))}

                {isInEditMode && (
                  <tr>
                    <td colSpan={100}>
                      <button
                        onClick={() =>
                          dispatch({
                            type: 'ADD_EXERCISE',
                            weekId: week.id,
                            workoutId: workout.id,
                          })
                        }
                      >
                        Add Exercise
                      </button>
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          ))}

          {isInEditMode && (
            <button
              onClick={() =>
                dispatch({
                  type: 'ADD_WORKOUT',
                  weekId: week.id,
                })
              }
            >
              Add Workout
            </button>
          )}
        </div>
      ))}

      {isInEditMode && (
        <button
          onClick={() =>
            dispatch({
              type: 'ADD_WEEK',
            })
          }
        >
          Add Week
        </button>
      )}
    </div>
  );
};

export default WorkoutTablesByWeek;
