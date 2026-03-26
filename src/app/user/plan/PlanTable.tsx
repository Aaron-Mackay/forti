'use client'

import React, {useState} from "react";
import {redirect} from "next/navigation";
import {useWorkoutEditorContext} from "@/context/WorkoutEditorContext";
import {saveUserWorkoutData} from "@lib/clientApi";
import Button from "@mui/material/Button";
import Week from "./Week";
import ScreenSizeWarningBanner from "@/components/ScreenSizeWarningBanner";
import { useAppBar } from '@lib/providers/AppBarProvider';
import {Alert, Box, Snackbar, Tab, Tabs, useMediaQuery, useTheme} from "@mui/material";
import MobilePlanView from "./MobilePlanView";
import LogView from "./LogView";
import ProgressView from "./ProgressView";

type PlanTab = 'structure' | 'log' | 'progress';

export const PlanTable: React.FC<{
  lockedInEditMode: boolean;
  categories: string[];
  planId?: string;
}> = ({lockedInEditMode = false, categories, planId}) => {
  const [tab, setTab] = useState<PlanTab>(lockedInEditMode ? 'structure' : 'structure');
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success' | 'error'}>({open: false, message: '', severity: 'success'});
  const {state: userDataState, dispatch} = useWorkoutEditorContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSave = () => {
    saveUserWorkoutData(userDataState)
      .then(() => setSnackbar({open: true, message: 'Saved successfully', severity: 'success'}))
      .catch(() => setSnackbar({open: true, message: 'Failed to save', severity: 'error'}));
  };

  const plan = planId ?
    userDataState.plans.find(p => p.id === parseInt(planId))
    : userDataState.plans[0];
  useAppBar({ title: plan?.name ?? 'Plan' });
  if (!plan) {
    redirect('/user/plan/create');
  }

  return (
    <>
      <Box sx={{borderBottom: 1, borderColor: 'divider'}}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label="Structure" value="structure" />
          <Tab label="Log" value="log" />
          <Tab label="Progress" value="progress" />
        </Tabs>
      </Box>

      <Box sx={{p: 1, overflow: 'auto'}}>
        {tab !== 'progress' && (
          <Button onClick={handleSave} size="small" variant="outlined" sx={{mb: 1}}>
            Save
          </Button>
        )}

        {tab === 'structure' && (
          isMobile ? (
            <MobilePlanView plan={plan} planId={plan.id} isInEditMode={true} />
          ) : (
            <>
              {plan.weeks.map((week, i) => (
                <div key={i}>
                  <Week
                    key={week.id}
                    planId={plan.id}
                    week={week}
                    isInEditMode={true}
                    categories={categories}
                  />
                  {i === plan.weeks.length - 1 && (
                    <Button onClick={() => dispatch({type: 'DUPLICATE_WEEK', planId: Number(planId), weekId: week.id})}>
                      Duplicate Week
                    </Button>
                  )}
                </div>
              ))}
              <Button onClick={() => dispatch({type: 'ADD_WEEK', planId: Number(planId)})}>
                Add Week
              </Button>
              <ScreenSizeWarningBanner/>
            </>
          )
        )}

        {tab === 'log' && (
          <LogView plan={plan} planId={plan.id} />
        )}

        {tab === 'progress' && (
          <ProgressView plan={plan} />
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({...s, open: false}))}
        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({...s, open: false}))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
