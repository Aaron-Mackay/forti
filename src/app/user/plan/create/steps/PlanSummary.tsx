import React, { useState } from 'react';
import {Alert, Box, Button, Snackbar, Table, TableBody, TableCell, TableHead, TableRow, Typography} from '@mui/material';
import {useNewPlan} from "@/app/user/plan/create/useNewPlan";
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {savePlan} from "@lib/api";
import {useRouter} from "next/navigation";


const WeekStep: React.FC<{ weekCount: string }> = ({weekCount}) => {
  const {statePlan} = useNewPlan()
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await savePlan(statePlan);
      if (response.success) {
        router.push(`/user/${statePlan.userId}/plan/${response.planId}`);
      } else {
        setError(response.error || 'Failed to save plan. Please try again.');
      }
    } catch (e) {
      console.error(e);
      setError('Failed to save plan. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <Typography
        variant="h6"
        sx={{
          mb: 1,
          textAlign: 'center',
        }}
      >
        {statePlan.name}
      </Typography>
      <Typography
        variant="subtitle2"
        sx={{
          mb: 1,
          textAlign: 'center',
        }}
      >
        {`${weekCount} week${weekCount !== '0' ? 's' : ''} of:`}
      </Typography>

      <Box
        sx={{
          // flex: 1,
          display: 'flex',
          flexDirection: 'column',
          py: 1,
          alignItems: 'center',
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        {statePlan.weeks[0].workouts.map((wo) => (
          <Accordion key={wo.id} sx={{width: '99%'}} disableGutters>
            <AccordionSummary
              expandIcon={<KeyboardArrowDownIcon/>}
              aria-controls="panel1-content"
              id="panel1-header"
            >
              <Typography component="span">{wo.name}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{paddingTop: 0}}>
              <Table size={'small'}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{width: '55%'}}>Exercise</TableCell>
                    <TableCell sx={{width: '15%', textAlign: "center",}}>Sets</TableCell>
                    <TableCell sx={{width: '15%', textAlign: "center",}}>Reps</TableCell>
                    <TableCell sx={{width: '15%', textAlign: "center",}}>Rest</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wo.exercises.map(ex => {
                    return <TableRow key={ex.id}>
                      <TableCell>{ex.exercise.name}</TableCell>
                      <TableCell sx={{textAlign: 'center'}}>{ex.sets.length}</TableCell>
                      <TableCell sx={{textAlign: 'center'}}>{ex.repRange}</TableCell>
                      <TableCell sx={{textAlign: 'center'}}>{ex.restTime}</TableCell>
                    </TableRow>
                  })}
                </TableBody>
              </Table>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
      <Box sx={{display: 'flex', justifyContent: 'center', width: '100%', paddingTop: 1}}>
        <Button variant="contained" sx={{width: '50%'}} onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </Box>
      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default WeekStep;