import React from 'react';
import {Box, Divider, TextField, Typography} from '@mui/material';
import {useNewPlan} from "@/app/user/plan/create/useNewPlan";

type PlanStepProps = {
  weekCount: string,
  setWeekCount: (val: string) => void
}

const PlanStep = ({weekCount, setWeekCount}: PlanStepProps) => {
  const {statePlan, dispatch} = useNewPlan()

  return <Box>
    <Typography variant="h6" sx={{
      mb: 1,
      textAlign: 'center',
    }}>
      Name
    </Typography>
    <Box sx={{display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 2, justifyContent: 'center'}}>
      <TextField
        value={statePlan.name}
        autoComplete='off'
        sx={{width: '10em'}}
        slotProps={{
          htmlInput: {
            style: {textAlign: 'center'},
          }
        }}
        onChange={(e) =>
          dispatch({
            type: 'UPDATE_PLAN_NAME',
            planId: statePlan.id,
            name: e.target.value,
          })
        }
      />
    </Box>
    <Divider sx={{my: 2}}/>
    <Typography variant="h6" sx={{
      mb: 1,
      textAlign: 'center',
    }}>
      How long will this plan last?
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{
      mb: 3,
      textAlign: 'center',
    }}>
      This can be extended/shortened later
    </Typography>
    <Box sx={{display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 2, justifyContent: 'center'}}>
      <TextField
        value={weekCount}
        autoComplete='off'
        inputMode={'numeric'}
        sx={{width: '5em'}}
        label="Weeks"
        slotProps={{
          htmlInput: {
            style: {textAlign: 'center'},
          }
        }}
        error={weekCount === '' || weekCount === '0'}
        onChange={(e) => {
          const numericValue = e.target.value.replace(/\D/g, '')
          setWeekCount(numericValue)
        }}
      />
    </Box>
  </Box>;
};
export default PlanStep;