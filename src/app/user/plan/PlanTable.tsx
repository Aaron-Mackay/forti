'use client'

import React, { useCallback, useMemo, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { useWorkoutEditorContext } from "@/context/WorkoutEditorContext";
import { saveUserWorkoutData } from "@lib/clientApi";
import { Alert, Box, Button, CircularProgress, Snackbar, ToggleButton, ToggleButtonGroup, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import GridOnIcon from '@mui/icons-material/GridOn';
import ViewListIcon from '@mui/icons-material/ViewList';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import { useAppBar } from '@lib/providers/AppBarProvider';
import PlanWeekView from "./PlanWeekView";
import PlanMultiWeekTable from "./PlanMultiWeekTable";
import PlanSheetView from "./PlanSheetView";
import { isValidPlanRepRangeInput } from "@lib/repRange";

function readZoom(): number {
  if (typeof window === 'undefined') return 1;
  const v = parseFloat(localStorage.getItem('sheetZoom') ?? '');
  return isNaN(v) ? 1 : Math.max(0.25, Math.min(1, v));
}

export const PlanTable: React.FC<{
  lockedInEditMode: boolean;
  categories: string[];
  planId?: string;
  backHref?: string;
}> = ({ lockedInEditMode: _lockedInEditMode, categories: _categories, planId, backHref }) => {
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [saving, setSaving] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [repRangeTouchedIds, setRepRangeTouchedIds] = useState<Set<number>>(new Set());
  const [focusedRepRangeId, setFocusedRepRangeId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'classic' | 'sheet'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('planViewMode');
      if (stored === 'classic' || stored === 'sheet') return stored;
    }
    return 'classic';
  });
  const [zoom, setZoom] = useState(readZoom);
  const [arrangeMode, setArrangeMode] = useState(false);
  const { state: userDataState } = useWorkoutEditorContext();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const plan = planId
    ? userDataState.plans.find(p => p.id === parseInt(planId))
    : userDataState.plans[0];

  useAppBar({
    title: plan?.name ?? 'Plan',
    showBack: !!backHref,
    onBack: backHref ? () => router.push(backHref) : undefined,
  });

  if (!plan) {
    redirect('/user/plan/create');
  }

  const invalidRepRangeIds = useMemo(() => {
    const ids = new Set<number>();
    for (const week of plan.weeks) {
      for (const workout of week.workouts) {
        for (const exercise of workout.exercises) {
          if (!isValidPlanRepRangeInput(exercise.repRange)) ids.add(exercise.id);
        }
      }
    }
    return ids;
  }, [plan]);

  const visibleInvalidRepRangeIds = useMemo(() => {
    if (saveAttempted) return invalidRepRangeIds;
    const ids = new Set<number>();
    for (const id of invalidRepRangeIds) {
      if (repRangeTouchedIds.has(id) && id !== focusedRepRangeId) ids.add(id);
    }
    return ids;
  }, [focusedRepRangeId, invalidRepRangeIds, repRangeTouchedIds, saveAttempted]);

  const markRepRangeTouched = (exerciseId: number) => {
    setRepRangeTouchedIds((prev) => {
      if (prev.has(exerciseId)) return prev;
      const next = new Set(prev);
      next.add(exerciseId);
      return next;
    });
  };

  const handleSave = () => {
    setSaveAttempted(true);
    if (invalidRepRangeIds.size > 0) {
      setSnackbar({
        open: true,
        severity: 'error',
        message: invalidRepRangeIds.size === 1
          ? 'Can’t save yet: 1 rep range is invalid. Use 10, 5-10, 5+, AMRAP, or leave blank.'
          : `Can’t save yet: ${invalidRepRangeIds.size} rep ranges are invalid. Use 10, 5-10, 5+, AMRAP, or leave blank.`,
      });
      return;
    }
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

  return (
    <>
      <Box sx={{ p: 1.5, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mb: 1.5 }}>
          {/* Arrange mode toggle — only visible in sheet mode on non-mobile */}
          {viewMode === 'sheet' && (
            <Tooltip title={arrangeMode ? 'Exit arrange mode' : 'Arrange mode'}>
              <ToggleButton
                value="arrange"
                selected={arrangeMode}
                onChange={() => setArrangeMode(v => !v)}
                size="small"
                sx={{ px: 1, py: 0.5, border: '1px solid', borderColor: 'divider', display: { xs: 'none', sm: 'flex' } }}
                aria-label={arrangeMode ? 'Exit arrange mode' : 'Arrange mode'}
              >
                <OpenWithIcon fontSize="small" />
              </ToggleButton>
            </Tooltip>
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
        {visibleInvalidRepRangeIds.size > 0 && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {visibleInvalidRepRangeIds.size === 1
              ? '1 rep range is currently invalid.'
              : `${visibleInvalidRepRangeIds.size} rep ranges are currently invalid.`} Save is disabled until fixed.
          </Alert>
        )}

        {viewMode === 'sheet' ? (
          <PlanSheetView
            plan={plan}
            planId={plan.id}
            zoom={zoom}
            onZoomChange={handleZoomChange}
            arrangeMode={arrangeMode}
            invalidRepRangeIds={visibleInvalidRepRangeIds}
            onRepRangeFocus={setFocusedRepRangeId}
            onRepRangeBlur={(exerciseId) => {
              setFocusedRepRangeId((prev) => (prev === exerciseId ? null : prev));
              markRepRangeTouched(exerciseId);
            }}
          />
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
          disabled={saving || visibleInvalidRepRangeIds.size > 0}
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
