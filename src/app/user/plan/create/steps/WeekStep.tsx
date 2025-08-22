import React from 'react';
import {Box, IconButton, Paper, TextField, Typography} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from "@mui/material/Button";
import {useNewPlan} from "@/app/user/plan/create/useNewPlan";
import {PLACEHOLDER_ID} from "@/app/user/plan/create/PlanBuilderWithContext";
import {Dir} from "@lib/useWorkoutEditor";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";


const WeekStep: React.FC = () => {
  const {statePlan, dispatch} = useNewPlan()

  return (
    <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <Typography
        variant="h6"
        sx={{
          mb: 1,
          textAlign: 'center',
        }}
      >
        How many workouts will you do a week?
      </Typography>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          py: 1,
          alignItems: 'center',
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        {statePlan.weeks[0].workouts.map((wo, i) => (
          <Paper
            key={wo.id}
            sx={{
              p: 2,
              width: 'calc(100% - 40px)',
              display: 'flex',
              flexDirection: 'row',
              gap: 2,
              alignItems: 'center',
            }}>
            <Box sx={{display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'center', gap: 1}}>
              <Box sx={{display: 'flex', alignItems: 'center', flexDirection: 'column'}}>
                <IconButton
                  disabled={wo.order === 1}
                  onClick={() =>
                    dispatch({
                      type: 'MOVE_WORKOUT',
                      planId: statePlan.id,
                      dir: Dir.UP,
                      index: i,
                      weekId: PLACEHOLDER_ID,
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
                  {i + 1}
                </div>
                <IconButton
                  disabled={wo.order === statePlan.weeks[0].workouts.length}
                  onClick={() =>
                    dispatch({
                      type: 'MOVE_WORKOUT',
                      planId: statePlan.id,
                      dir: Dir.DOWN,
                      index: i,
                      weekId: PLACEHOLDER_ID,
                    })
                  }
                >
                  <KeyboardArrowDownIcon/>
                </IconButton>
              </Box>
              <TextField
                label={'Name'}
                sx={{width: '100%'}}
                value={wo.name}
                onChange={e =>
                  dispatch({
                    type: 'UPDATE_WORKOUT_NAME',
                    planId: statePlan.id,
                    weekId: PLACEHOLDER_ID,
                    workoutId: wo.id,
                    name: e.target.value,
                  })
                }
              />
              {statePlan.weeks[0].workouts.length > 1 &&
                <IconButton
                  onClick={() =>
                    dispatch({
                      type: 'REMOVE_WORKOUT',
                      planId: statePlan.id,
                      weekId: PLACEHOLDER_ID,
                      workoutId: wo.id,
                    })
                  }
                >
                  <DeleteIcon/>
                </IconButton>
              }
            </Box>
          </Paper>
        ))}

        <Button
          onClick={() =>
            dispatch({
              type: 'ADD_WORKOUT',
              planId: PLACEHOLDER_ID,
              weekId: PLACEHOLDER_ID,
            })
          }
        >
          Add Workout
        </Button>
      </Box>
    </Box>
  )
}

export default WeekStep;