'use client'

import React, { useCallback, useState } from "react";
import { redirect } from "next/navigation";
import { useWorkoutEditorContext } from "@/context/WorkoutEditorContext";
import { saveUserWorkoutData } from "@lib/clientApi";
import { Alert, Box, Button, CircularProgress, IconButton, Snackbar, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import GridOnIcon from '@mui/icons-material/GridOn';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useAppBar } from '@lib/providers/AppBarProvider';
import PlanWeekView from "./PlanWeekView";
import PlanMultiWeekTable from "./PlanMultiWeekTable";
import PlanSheetView from "./PlanSheetView";

function readZoom(): number {
  if (typeof window === 'undefined') return 1;
  const v = parseFloat(localStorage.getItem('sheetZoom') ?? '');
  return isNaN(v) ? 1 : Math.max(0.25, Math.min(1, v));
}

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
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'classic' | 'sheet'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('planViewMode');
      if (stored === 'classic' || stored === 'sheet') return stored;
    }
    return 'classic';
  });
  const [zoom, setZoom] = useState(readZoom);
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
    setSaving(true);
    saveUserWorkoutData(userDataState)
      .then(() => setSnackbar({ open: true, message: 'Saved successfully', severity: 'success' }))
      .catch(() => setSnackbar({ open: true, message: 'Failed to save', severity: 'error' }))
      .finally(() => setSaving(false));
  };

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, next: 'classic' | 'sheet' | null) => {
    if (!next) return;
    setViewMode(next);
    localStorage.setItem('planViewMode', next);
  };

  const handleZoomChange = useCallback((newZoom: number) => {
    const rounded = Math.round(newZoom * 100) / 100;
    setZoom(rounded);
    localStorage.setItem('sheetZoom', String(rounded));
  }, []);

  const adjustZoom = (delta: number) => {
    setZoom(prev => {
      const next = Math.round(Math.max(0.25, Math.min(1, prev + delta)) * 100) / 100;
      localStorage.setItem('sheetZoom', String(next));
      return next;
    });
  };

  return (
    <>
      <Box sx={{ p: 1.5, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mb: 1.5 }}>
          {/* Zoom controls — only visible in sheet mode */}
          {viewMode === 'sheet' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <IconButton size="small" onClick={() => adjustZoom(-0.1)} sx={{ p: 0.25 }} aria-label="Zoom out">
                <Typography sx={{ fontSize: '0.85rem', lineHeight: 1, color: 'text.secondary', userSelect: 'none' }}>−</Typography>
              </IconButton>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', minWidth: '2.5em', textAlign: 'center', userSelect: 'none' }}>
                {Math.round(zoom * 100)}%
              </Typography>
              <IconButton size="small" onClick={() => adjustZoom(0.1)} disabled={zoom >= 1} sx={{ p: 0.25 }} aria-label="Zoom in">
                <Typography sx={{ fontSize: '0.85rem', lineHeight: 1, color: zoom >= 1 ? 'text.disabled' : 'text.secondary', userSelect: 'none' }}>+</Typography>
              </IconButton>
            </Box>
          )}

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
            aria-label="plan view mode"
          >
            <Tooltip title="Classic view">
              <ToggleButton value="classic" aria-label="classic view" sx={{ px: 1, py: 0.5 }}>
                <ViewListIcon fontSize="small" />
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.75, fontSize: '0.7rem' }}>Classic</Box>
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Sheet view">
              <ToggleButton value="sheet" aria-label="sheet view" sx={{ px: 1, py: 0.5 }}>
                <GridOnIcon fontSize="small" />
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.75, fontSize: '0.7rem' }}>Sheet</Box>
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Box>

        {viewMode === 'sheet' ? (
          <PlanSheetView plan={plan} planId={plan.id} zoom={zoom} onZoomChange={handleZoomChange} />
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
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ minWidth: 160 }}
        >
          {saving ? 'Saving…' : 'Save'}
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
