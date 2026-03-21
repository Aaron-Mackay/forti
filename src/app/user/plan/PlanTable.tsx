'use client'

import React, {useState} from "react";
import {redirect} from "next/navigation";
import {useWorkoutEditorContext} from "@/context/WorkoutEditorContext";
import {saveUserWorkoutData} from "@lib/clientApi";
import Button from "@mui/material/Button";
import Week from "./Week";
import EditModeToggle from "./EditModeToggle";
import ScreenSizeWarningBanner from "@/components/ScreenSizeWarningBanner";
import CustomAppBar from "@/components/CustomAppBar";
import {Alert, Box, Snackbar, useMediaQuery, useTheme} from "@mui/material";
import MobilePlanView from "./MobilePlanView";

export const PlanTable: React.FC<{
  lockedInEditMode: boolean;
  categories: string[];
  planId?: string;
}> = ({lockedInEditMode = false, categories, planId}) => {
  const [isInEditMode, setIsInEditMode] = useState(lockedInEditMode);
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success' | 'error'}>({open: false, message: '', severity: 'success'});
  const {state: userDataState, dispatch} = useWorkoutEditorContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSave = () => {
    saveUserWorkoutData(userDataState)
      .then(() => {
        setIsInEditMode(false);
        setSnackbar({open: true, message: 'Saved successfully', severity: 'success'});
      })
      .catch(() => setSnackbar({open: true, message: 'Failed to save', severity: 'error'}));
  };

  const plan = planId ?
    userDataState.plans.find(p => p.id === parseInt(planId))
    : userDataState.plans[0]
  if (!plan) {
    redirect('/user/plan/create')
  }
  return (
    <>
      <CustomAppBar title={"Plan"}/>
      <Box sx={{p: 1, overflow: 'auto'}}>
        {!lockedInEditMode && (
          <EditModeToggle
            isInEditMode={isInEditMode}
            setIsInEditMode={setIsInEditMode}
          />
        )}
        {isInEditMode && (
          <Button onClick={handleSave}>
            Save
          </Button>
        )}

        <h1>User: {userDataState.name}</h1>

        {isMobile ? (
          <MobilePlanView plan={plan} planId={plan.id} isInEditMode={isInEditMode} />
        ) : (
          <>
            {plan.weeks.map((week, i) => (
              <div key={i}>
                <Week
                  key={week.id}
                  planId={plan.id}
                  week={week}
                  isInEditMode={isInEditMode}
                  categories={categories}
                />
                {isInEditMode && i === plan.weeks.length - 1 && (
                  <Button onClick={() => dispatch({type: 'DUPLICATE_WEEK', planId: Number(planId), weekId: week.id})}>
                    Duplicate Week
                  </Button>
                )}
              </div>
            ))}

            {isInEditMode && (
              // todo fix this too
              <Button onClick={() => dispatch({type: 'ADD_WEEK', planId: Number(planId)})}>
                Add Week
              </Button>
            )}
            <ScreenSizeWarningBanner/>
          </>
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
