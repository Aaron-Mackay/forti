'use client'

import React, { useState } from "react";
import { redirect } from "next/navigation";
import { useWorkoutEditorContext } from "@/context/WorkoutEditorContext";
import { saveUserWorkoutData } from "@lib/clientApi";
import { Alert, Box, Button, Snackbar, useMediaQuery, useTheme } from "@mui/material";
import { useAppBar } from '@lib/providers/AppBarProvider';
import PlanWeekView from "./PlanWeekView";
import PlanMultiWeekTable from "./PlanMultiWeekTable";

export const PlanTable: React.FC<{
  lockedInEditMode: boolean;
  categories: string[];
  planId?: string;
}> = ({ lockedInEditMode: _lockedInEditMode, categories: _categories, planId }) => {
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const { state: userDataState } = useWorkoutEditorContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const plan = planId
    ? userDataState.plans.find(p => p.id === parseInt(planId))
    : userDataState.plans[0];

  useAppBar({ title: plan?.name ?? 'Plan' });

  if (!plan) {
    redirect('/user/plan/create');
  }

  const handleSave = () => {
    saveUserWorkoutData(userDataState)
      .then(() => setSnackbar({ open: true, message: 'Saved successfully', severity: 'success' }))
      .catch(() => setSnackbar({ open: true, message: 'Failed to save', severity: 'error' }));
  };

  return (
    <>
      <Box sx={{ p: 1.5, overflow: 'auto' }}>
        {isMobile ? (
          <PlanWeekView plan={plan} planId={plan.id} />
        ) : (
          <PlanMultiWeekTable plan={plan} planId={plan.id} />
        )}
      </Box>

      {/* Bottom-fixed Save button */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: 1.5,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <Button onClick={handleSave} variant="contained" sx={{ minWidth: 160 }}>
          Save
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
