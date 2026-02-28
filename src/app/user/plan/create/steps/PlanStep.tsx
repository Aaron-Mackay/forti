import React, { useState } from 'react';
import {Box, Button, Divider, TextField, Typography} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {useNewPlan} from "@/app/user/plan/create/useNewPlan";
import {AiImportDialog} from "@/app/user/plan/create/AiImportDialog";

type PlanStepProps = {
  weekCount: string,
  setWeekCount: (val: string) => void
  onImportSuccess: (weekCount: string) => void
}

const PlanStep = ({weekCount, setWeekCount, onImportSuccess}: PlanStepProps) => {
  const {statePlan, dispatch} = useNewPlan()
  const [dialogOpen, setDialogOpen] = useState(false)

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
    <Box sx={{display: 'flex', justifyContent: 'center', mt: 2}}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<AutoAwesomeIcon />}
        onClick={() => setDialogOpen(true)}
      >
        Import with AI
      </Button>
    </Box>
    <AiImportDialog
      open={dialogOpen}
      onClose={() => setDialogOpen(false)}
      onImportSuccess={(wc) => {
        setDialogOpen(false)
        onImportSuccess(wc)
      }}
    />
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