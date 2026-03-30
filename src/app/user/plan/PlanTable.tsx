'use client'

import React, { useState } from "react";
import { redirect } from "next/navigation";
import { useWorkoutEditorContext } from "@/context/WorkoutEditorContext";
import { saveUserWorkoutData } from "@lib/clientApi";
import { Alert, Box, Button, Snackbar, ToggleButton, ToggleButtonGroup, useMediaQuery, useTheme } from "@mui/material";
import { useAppBar } from '@lib/providers/AppBarProvider';
import PlanWeekView from "./PlanWeekView";
import PlanMultiWeekTable from "./PlanMultiWeekTable";
import PlanSheetView from "./PlanSheetView";

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
  const [viewMode, setViewMode] = useState<'classic' | 'sheet'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('planViewMode');
      if (stored === 'classic' || stored === 'sheet') return stored;
    }
    return 'classic';
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

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, next: 'classic' | 'sheet' | null) => {
    if (!next) return;
    setViewMode(next);
    localStorage.setItem('planViewMode', next);
  };

  return (
    <>
      <Box sx={{ p: 1.5, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
            aria-label="plan view mode"
          >
            <ToggleButton value="classic" aria-label="classic view" sx={{ fontSize: '0.7rem', px: 1.5, py: 0.5 }}>
              Classic
            </ToggleButton>
            <ToggleButton value="sheet" aria-label="sheet view" sx={{ fontSize: '0.7rem', px: 1.5, py: 0.5 }}>
              Sheet
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {viewMode === 'sheet' ? (
          <PlanSheetView plan={plan} planId={plan.id} />
        ) : isMobile ? (
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
