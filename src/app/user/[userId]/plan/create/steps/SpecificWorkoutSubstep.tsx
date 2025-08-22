import {WorkoutExercisePrisma, WorkoutPrisma} from "@/types/dataTypes";
import {useWorkoutEditorContext} from "@/context/WorkoutEditorContext";
import {useNewPlan} from "@/app/user/[userId]/plan/create/useNewPlan";
import {Box, IconButton, Paper, TextField, Typography} from "@mui/material";
import {PLACEHOLDER_ID} from "@/app/user/[userId]/plan/create/PlanBuilderWithContext";
import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Button from "@mui/material/Button";
import React from "react";
import {Dir} from "@lib/useWorkoutEditor";


const ExerciseBox = ({ex, idx, exerciseCount}: { ex: WorkoutExercisePrisma, idx: number, exerciseCount: number }) => {
  const {allExercises} = useWorkoutEditorContext()
  const {dispatch, statePlan} = useNewPlan()
  return (
    <Paper
      sx={{p: 2, width: 'calc(100% - 40px)', display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center',}}>
      <Box sx={{display: 'flex', alignItems: 'center', flexDirection: 'column'}}>
        <IconButton
          disabled={ex.order === 1}
          onClick={() =>
            dispatch({
              type: 'MOVE_EXERCISE',
              planId: statePlan.id,
              dir: Dir.UP,
              index: idx,
              weekId: PLACEHOLDER_ID,
              workoutId: ex.workoutId,
            })
          }
        >
          <KeyboardArrowUpIcon/>
        </IconButton>
        <div
          style={{
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f0f0f0'
          }}
        >
          {idx + 1}
        </div>
        <IconButton
          disabled={ex.order === exerciseCount}
          onClick={() =>
            dispatch({
              type: 'MOVE_EXERCISE',
              planId: statePlan.id,
              dir: Dir.DOWN,
              index: idx,
              weekId: PLACEHOLDER_ID,
              workoutId: ex.workoutId,
            })
          }
        >
          <KeyboardArrowDownIcon/>
        </IconButton>
      </Box>
      <Box sx={{gap: 1, display: 'flex', flexDirection: 'column', flex: 1}}>
        <Box sx={{display: 'flex', flexDirection: 'row'}}>
          <TextField
            sx={{flex: 1}}
            label={'Exercise'}
            value={ex.exercise.name}
            autoComplete='off'
            onChange={e =>
              dispatch({
                type: 'UPDATE_EXERCISE',
                planId: statePlan.id,
                weekId: PLACEHOLDER_ID,
                workoutId: ex.workoutId,
                workoutExerciseId: ex.id,
                category: ex.exercise.category!,
                exerciseName: e.target.value,
                exercises: allExercises
              })
            }
          />
          {exerciseCount > 1 &&
            <IconButton
              onClick={() =>
                dispatch({
                  type: 'REMOVE_EXERCISE',
                  planId: statePlan.id,
                  weekId: PLACEHOLDER_ID,
                  workoutId: ex.workoutId,
                  exerciseId: ex.id,
                })
              }
            >
              <DeleteIcon/>
            </IconButton>
          }
        </Box>
        <Box sx={{display: 'flex', flexDirection: 'row', gap: 1}}>
          <TextField
            sx={{flex: 1}}
            label={'Sets'}
            value={ex.sets.length}
            autoComplete='off'
            onChange={e =>
              dispatch({
                type: 'UPDATE_SET_COUNT',
                planId: statePlan.id,
                weekId: PLACEHOLDER_ID,
                workoutId: ex.workoutId,
                workoutExerciseId: ex.id,
                setCount: parseInt(e.target.value),
              })
            }
          />
          <TextField
            sx={{flex: 1}}
            label={'Rest'}
            value={ex.restTime}
            slotProps={{inputLabel: {shrink: true}}}
            autoComplete='off'
            onChange={e =>
              dispatch({
                type: 'UPDATE_REST_TIME',
                planId: statePlan.id,
                weekId: PLACEHOLDER_ID,
                workoutId: ex.workoutId,
                workoutExerciseId: ex.id,
                restTime: e.target.value,
              })
            }
          />
          <TextField
            sx={{flex: 1}}
            label={'Rep Range'}
            value={ex.repRange}
            slotProps={{inputLabel: {shrink: true}}}
            autoComplete='off'
            onChange={e =>
              dispatch({
                type: 'UPDATE_REP_RANGE',
                planId: statePlan.id,
                weekId: PLACEHOLDER_ID,
                workoutId: ex.workoutId,
                workoutExerciseId: ex.id,
                repRange: e.target.value,
              })
            }
          />
        </Box>
      </Box>
    </Paper>
  )
}

export const SpecificWorkoutSubstep = ({workout}: { workout: WorkoutPrisma }) => {
  const {dispatch} = useNewPlan()
  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column', gap: 1, padding: 2}}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            textAlign: 'center',
            flex: 1,
            fontWeight: 500,
          }}
        >
          <span>{workout.name}</span>
        </Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          paddingTop: 0,
          alignItems: 'center',
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        {workout.exercises.map((ex, i) => {
          return <ExerciseBox key={ex.id} ex={ex} idx={i} exerciseCount={workout.exercises.length}/>
        })}

        <Button
          onClick={() =>
            dispatch({
              type: 'ADD_EXERCISE_WITH_SET',
              planId: PLACEHOLDER_ID,
              weekId: PLACEHOLDER_ID,
              workoutId: workout.id
            })
          }
        >
          Add Exercise
        </Button>
      </Box>
    </div>
  )
}