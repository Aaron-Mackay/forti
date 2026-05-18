'use client'

import React, { useCallback, useMemo, useRef, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { WorkoutEditorContext, useWorkoutEditorContext } from "@/context/WorkoutEditorContext";
import { saveUserWorkoutData } from "@lib/clientApi";
import { Alert, Box, Button, Chip, CircularProgress, FormControlLabel, Snackbar, Switch, ToggleButton, ToggleButtonGroup, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import GridOnIcon from '@mui/icons-material/GridOn';
import ViewListIcon from '@mui/icons-material/ViewList';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import { useAppBar } from '@lib/providers/AppBarProvider';
import PlanWeekView from "./PlanWeekView";
import PlanMultiWeekTable from "./PlanMultiWeekTable";
import PlanSheetView from "./PlanSheetView";
import { usePlanViewControls } from "./usePlanViewControls";
import { usePlanRepRangeValidation } from "./usePlanRepRangeValidation";
import { signalTokens } from "@lib/signal/tokens";
import { computeForwardSyncActions, countSyncedWeeks } from "@/utils/planForwardSync";
import useDebouncedDispatch from "@/utils/useDebouncedDispatch";

const planningPalette = signalTokens.surface.planning;

export const PlanTable: React.FC<{
  planId?: string;
  backHref?: string;
  signalEnabled?: boolean;
  canManageClientEditing?: boolean;
  highlightCheckInWeekStart?: string;
}> = ({ planId, backHref, signalEnabled = false, canManageClientEditing = false, highlightCheckInWeekStart }) => {
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [saving, setSaving] = useState(false);
  const [forwardSyncEnabled, setForwardSyncEnabled] = useState(false);
  const contextValue = useWorkoutEditorContext();
  const { state: userDataState, dispatch } = contextValue;

  const syncWeekCountRef = useRef(0);
  const syncToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSyncToast = useCallback((weekCount: number) => {
    syncWeekCountRef.current = Math.max(syncWeekCountRef.current, weekCount);
    if (syncToastTimerRef.current) clearTimeout(syncToastTimerRef.current);
    syncToastTimerRef.current = setTimeout(() => {
      const count = syncWeekCountRef.current;
      syncWeekCountRef.current = 0;
      setSnackbar({
        open: true,
        severity: 'success',
        message: `Synced to ${count} future ${count === 1 ? 'week' : 'weeks'}`,
      });
    }, 800);
  }, []);
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const {
    arrangeMode,
    handleZoomChange,
    setViewMode,
    toggleArrangeMode,
    viewMode,
    zoom,
  } = usePlanViewControls({
    defaultViewMode: isMobile ? 'classic' : 'sheet',
    persistViewMode: true,
    viewModeStorageKey: isMobile ? 'planViewModeMobile' : 'planViewModeDesktop',
    zoomStorageKey: isMobile ? 'sheetZoomMobile' : 'sheetZoomDesktop',
  });

  const plan = planId
    ? userDataState.plans.find(p => p.id === parseInt(planId))
    : userDataState.plans[0];
  const clientEditingLocked = signalEnabled && plan?.clientCanEdit === false && !canManageClientEditing;

  const highlightedWorkoutIds = useMemo(() => {
    if (!plan || !highlightCheckInWeekStart) return new Set<number>();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(highlightCheckInWeekStart);
    if (!m) return new Set<number>();
    const from = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    const ids = new Set<number>();
    for (const week of plan.weeks) {
      for (const workout of week.workouts) {
        if (!workout.dateCompleted) continue;
        const completed = new Date(workout.dateCompleted);
        if (completed >= from && completed < to) ids.add(workout.id);
      }
    }
    return ids;
  }, [plan, highlightCheckInWeekStart]);

  useAppBar({
    title: plan?.name ?? 'Plan',
    showBack: !!backHref,
    onBack: backHref ? () => router.push(backHref) : undefined,
  });

  const syncAwareDispatch = useCallback(
    (action: Parameters<typeof dispatch>[0]) => {
      dispatch(action);
      if (!forwardSyncEnabled || !plan) return;
      const extras = computeForwardSyncActions(plan, action);
      extras.forEach(dispatch);
      if (extras.length > 0) triggerSyncToast(countSyncedWeeks(extras));
    },
    [dispatch, forwardSyncEnabled, plan, triggerSyncToast],
  );
  const syncAwareDebouncedDispatch = useDebouncedDispatch(syncAwareDispatch, 250);
  const syncAwareContextValue = { ...contextValue, dispatch: syncAwareDispatch, debouncedDispatch: syncAwareDebouncedDispatch };

  if (!plan) {
    redirect('/user/plan/create');
  }
  const {
    handleRepRangeBlur,
    handleRepRangeFocus,
    invalidRepRangeIds,
    setSaveAttempted,
    visibleInvalidRepRangeIds,
  } = usePlanRepRangeValidation(plan, { hideFocused: true });

  const handleSave = () => {
    setSaveAttempted(true);
    if (clientEditingLocked) {
      setSnackbar({
        open: true,
        severity: 'error',
        message: 'This plan is locked for client editing.',
      });
      return;
    }
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

  const weekCount = plan.weeks.length;
  const workoutCount = plan.weeks.reduce((sum, week) => sum + week.workouts.length, 0);
  const exerciseSlotCount = plan.weeks.reduce(
    (sum, week) => sum + week.workouts.reduce((wSum, workout) => wSum + workout.exercises.length, 0),
    0,
  );

  return (
    <>
      {signalEnabled && (
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            pt: 2,
            pb: 0,
            maxWidth: 1280,
            mx: 'auto',
          }}
        >
          <Box
            sx={{
              background: planningPalette.surface,
              border: `1px solid ${planningPalette.borderStrong}`,
              borderRadius: `${signalTokens.radii.cardLarge}px`,
              p: { xs: 2, sm: '20px 20px 18px' },
            }}
          >
            <Box
              sx={{
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 11,
                color: signalTokens.signal.deep,
                mb: 0.75,
              }}
            >
              Plan editor
            </Box>
            <Box
              sx={{
                fontFamily: signalTokens.fontVar.cond,
                fontSize: { xs: 26, sm: 32 },
                fontWeight: 700,
                letterSpacing: '-0.015em',
                lineHeight: 1,
                mb: 1.25,
                color: planningPalette.ink,
              }}
            >
              {plan.name}
            </Box>
            <Box
              sx={{
                fontSize: 14,
                color: planningPalette.inkMid,
                lineHeight: 1.55,
                maxWidth: 680,
              }}
            >
              Adjust weeks, workouts, and sets in the existing editor. Switch between sheet and classic views as the
              shape of the plan changes.
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: 1,
                mt: 2,
              }}
            >
              <SignalPlanMetric label="Weeks" value={weekCount} />
              <SignalPlanMetric label="Workouts" value={workoutCount} />
              <SignalPlanMetric label="Exercise slots" value={exerciseSlotCount} />
            </Box>
            <Box
              sx={{
                mt: 1.75,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: planningPalette.inkLight, mb: 0.4 }}>
                  Client editing
                </Box>
                <Box sx={{ fontSize: 13, color: planningPalette.inkMid, lineHeight: 1.45 }}>
                  {canManageClientEditing
                    ? 'Toggle whether the client can edit this plan.'
                    : plan.clientCanEdit
                      ? 'Clients can edit this plan.'
                      : 'Clients cannot edit this plan right now.'}
                </Box>
              </Box>
              {canManageClientEditing ? (
                <FormControlLabel
                  control={
                    <Switch
                      checked={plan.clientCanEdit}
                      onChange={(_, enabled) => dispatch({ type: 'UPDATE_PLAN_CLIENT_CAN_EDIT', planId: plan.id, enabled })}
                    />
                  }
                  label={plan.clientCanEdit ? 'Allow editing' : 'Editing locked'}
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': {
                      fontSize: 13,
                      color: planningPalette.ink,
                    },
                  }}
                />
              ) : (
                <Chip
                  label={plan.clientCanEdit ? 'Editing allowed' : 'Editing locked'}
                  size="small"
                  sx={{
                    fontFamily: signalTokens.fontVar.mono,
                    backgroundColor: plan.clientCanEdit ? planningPalette.surfaceAlt : 'rgba(231, 104, 84, 0.12)',
                    color: plan.clientCanEdit ? planningPalette.ink : '#8a352a',
                    borderColor: plan.clientCanEdit ? planningPalette.border : '#e3b2a8',
                  }}
                  variant="outlined"
                />
              )}
            </Box>
            {clientEditingLocked && (
              <Alert severity="warning" sx={{ mt: 1.75 }}>
                Your coach has locked this plan for editing. You can still review it here, but saving changes is disabled.
              </Alert>
            )}
            {highlightCheckInWeekStart && highlightedWorkoutIds.size > 0 && (
              <Box
                role="status"
                sx={{
                  mt: 1.75,
                  px: 1.25,
                  py: 0.75,
                  backgroundColor: signalTokens.signal.dim,
                  border: `1px solid ${signalTokens.signal.deep}`,
                  borderRadius: `${signalTokens.radii.card}px`,
                  color: planningPalette.ink,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                Showing sessions completed during this check-in week ·{' '}
                {highlightedWorkoutIds.size} session{highlightedWorkoutIds.size === 1 ? '' : 's'}
              </Box>
            )}
          </Box>
        </Box>
      )}
      <Box
        sx={{
          p: 1.5,
          overflow: 'auto',
          ...(signalEnabled
            ? {
                maxWidth: 1280,
                mx: 'auto',
                px: { xs: 2, sm: 3 },
                pt: 1.5,
              }
            : null),
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mb: 1.5 }}>
          {/* Forward sync toggle — only shown when plan has more than one week */}
          {plan.weeks.length > 1 && (
            <Tooltip title={forwardSyncEnabled ? 'Forward sync on — changes copy to future weeks' : 'Forward sync off'}>
              <ToggleButton
                value="forwardSync"
                selected={forwardSyncEnabled}
                onChange={() => setForwardSyncEnabled(v => !v)}
                size="small"
                sx={{ px: 1, py: 0.5, border: '1px solid', borderColor: 'divider' }}
                aria-label="Toggle forward sync"
              >
                <SyncAltIcon fontSize="small" />
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.75, fontSize: '0.7rem' }}>Sync fwd</Box>
              </ToggleButton>
            </Tooltip>
          )}

          {/* Arrange mode toggle — only visible in sheet mode on non-mobile */}
          {viewMode === 'sheet' && (
            <Tooltip title={arrangeMode ? 'Exit arrange mode' : 'Arrange mode'}>
              <ToggleButton
                value="arrange"
                selected={arrangeMode}
                onChange={toggleArrangeMode}
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
            onChange={(_, next) => {
              if (next) setViewMode(next)
            }}
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

        <WorkoutEditorContext.Provider value={syncAwareContextValue}>
          {viewMode === 'sheet' ? (
            <PlanSheetView
              plan={plan}
              planId={plan.id}
              zoom={zoom}
              onZoomChange={handleZoomChange}
              arrangeMode={arrangeMode}
              invalidRepRangeIds={visibleInvalidRepRangeIds}
              onRepRangeFocus={handleRepRangeFocus}
              onRepRangeBlur={handleRepRangeBlur}
              highlightedWorkoutIds={highlightedWorkoutIds}
            />
          ) : isMobile ? (
            <PlanWeekView plan={plan} planId={plan.id} highlightedWorkoutIds={highlightedWorkoutIds} />
          ) : (
            <PlanMultiWeekTable plan={plan} planId={plan.id} highlightedWorkoutIds={highlightedWorkoutIds} />
          )}
        </WorkoutEditorContext.Provider>
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
          disabled={saving || visibleInvalidRepRangeIds.size > 0 || clientEditingLocked}
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

const SignalPlanMetric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <Box
    sx={{
      border: `1px solid ${planningPalette.border}`,
      borderRadius: `${signalTokens.radii.card}px`,
      px: 1.25,
      py: 1,
      background: planningPalette.surfaceAlt,
    }}
  >
    <Box
      sx={{
        fontFamily: signalTokens.fontVar.mono,
        fontSize: 11,
        color: planningPalette.inkLight,
        mb: 0.5,
      }}
    >
      {label}
    </Box>
    <Box
      sx={{
        fontFamily: signalTokens.fontVar.cond,
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 1,
        color: planningPalette.ink,
      }}
    >
      {value}
    </Box>
  </Box>
);
