import React from 'react';
import {Box, IconButton, TextField, Typography} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from "@mui/material/Button";
import {useNewPlan} from "@/app/user/[userId]/plan/create/useNewPlan";
import {PLACEHOLDER_ID} from "@/app/user/[userId]/plan/create/PlanBuilderWithContext";


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
          <Box key={wo.id} sx={{display: 'flex', flexDirection: 'row'}}>
            <TextField
              label={`Workout ${i + 1} Name`}
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
          </Box>
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