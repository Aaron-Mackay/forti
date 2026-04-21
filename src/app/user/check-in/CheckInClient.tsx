'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CloseIcon from '@mui/icons-material/Close';
import type { WeeklyCheckIn } from '@/generated/prisma/browser';
import CheckInForm from './CheckInForm';
import CheckInHistoryCard, { CheckInDetails } from './CheckInHistoryCard';
import { usePushSubscription } from '@lib/usePushSubscription';
import type { CurrentCheckInResponse } from '@/types/checkInTypes';
import { useSettings } from '@lib/providers/SettingsProvider';
import MetricsSystemCard from '@/components/MetricsSystemCard';

type CurrentData = CurrentCheckInResponse;

function normalizeCurrentCheckInResponse(data: CurrentCheckInResponse): CurrentData {
  return {
    ...data,
    previousPhotos: data.previousPhotos ?? null,
    weekTargets: data.weekTargets ?? null,
    completedWorkoutsCount: data.completedWorkoutsCount ?? data.checkIn.completedWorkouts ?? 0,
    plannedWorkoutsCount: data.plannedWorkoutsCount ?? data.checkIn.plannedWorkouts ?? 0,
    activePlanId: data.activePlanId ?? null,
    template: data.template ?? null,
  };
}

export default function CheckInClient() {
  const { settings } = useSettings();
  const [currentData, setCurrentData] = useState<CurrentData | null>(null);
  const [history, setHistory] = useState<WeeklyCheckIn[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [editingCurrent, setEditingCurrent] = useState(false);

  const { permission, subscribing, subscribe } = usePushSubscription();

  const loadCurrent = async () => {
    const res = await fetch('/api/check-in/current');
    if (!res.ok) throw new Error('Failed to load check-in');
    const data = await res.json() as CurrentCheckInResponse;
    return normalizeCurrentCheckInResponse(data);
  };

  const loadHistory = async (offset: number) => {
    // Fetch past check-ins only; current week is excluded server-side
    const res = await fetch(`/api/check-in?limit=10&offset=${offset}&excludeCurrent=true`);
    if (!res.ok) throw new Error('Failed to load history');
    return res.json() as Promise<{ checkIns: WeeklyCheckIn[]; total: number }>;
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [curr, hist] = await Promise.all([loadCurrent(), loadHistory(0)]);
        setCurrentData(curr);
        setEditingCurrent(false);
        setHistory(hist.checkIns);
        setHistoryTotal(hist.total);
        setHistoryOffset(0);
      } catch {
        setError('Failed to load your check-in data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMoreHistory() {
    const newOffset = historyOffset + 10;
    try {
      const hist = await loadHistory(newOffset);
      setHistory(prev => [...prev, ...hist.checkIns]);
      setHistoryOffset(newOffset);
    } catch {
      setError('Failed to load more history.');
    }
  }

  const isCompleted = !!currentData?.checkIn.completedAt;

  const weekLabel = currentData
    ? new Date(currentData.checkIn.weekStartDate).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  return (
    <Box sx={{ pt: 2, pb: 6 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      {/* Push notification prompt */}
      {permission === 'default' && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              disabled={subscribing}
              onClick={subscribe}
              startIcon={subscribing ? <CircularProgress size={14} color="inherit" /> : <NotificationsActiveIcon />}
            >
              Enable
            </Button>
          }
        >
          Get reminded on your check-in day
        </Alert>
      )}

      {/* This week's check-in */}
      <Typography variant="overline" color="text.secondary">This Week</Typography>

      {/* Template mode active form — no outer Paper; cards render their own surfaces */}
      {!loading && !editingCurrent && !isCompleted && currentData?.template != null ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
            Week of {weekLabel}
          </Typography>
          <CheckInForm
            currentWeek={currentData.currentWeek}
            weekPrior={currentData.weekPrior}
            checkIn={currentData.checkIn}
            previousPhotos={currentData.previousPhotos}
            weekTargets={currentData.weekTargets}
            completedWorkoutsCount={currentData.completedWorkoutsCount}
            plannedWorkoutsCount={currentData.plannedWorkoutsCount}
            activePlanId={currentData.activePlanId}
            template={currentData.template}
            onSubmitted={() => setSubmitted(s => !s)}
          />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          {loading ? (
            <Skeleton variant="rounded" height={120} />
          ) : editingCurrent && currentData ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1" fontWeight={600}>
                  Edit submitted check-in
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Close edit mode"
                  onClick={() => {
                    setEditingCurrent(false);
                    setSubmitted(s => !s);
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
              <CheckInForm
                currentWeek={currentData.currentWeek}
                weekPrior={currentData.weekPrior}
                checkIn={currentData.checkIn}
                previousPhotos={currentData.previousPhotos}
                weekTargets={currentData.weekTargets}
                completedWorkoutsCount={currentData.completedWorkoutsCount}
                plannedWorkoutsCount={currentData.plannedWorkoutsCount}
                activePlanId={currentData.activePlanId}
                template={currentData.template}
                onSubmitted={() => setSubmitted(s => !s)}
              />
            </Box>
          ) : isCompleted ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CheckCircleIcon color="success" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight={600}>Check-in complete</Typography>
                  <Typography variant="body2" color="text.secondary">Week of {weekLabel}</Typography>
                </Box>
                <IconButton
                  size="small"
                  aria-label="Edit current check-in"
                  onClick={() => setEditingCurrent(true)}
                  sx={{ color: 'text.secondary' }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Box>
              {currentData && (
                <>
                  <CheckInDetails checkIn={currentData.checkIn} />
                  <Divider sx={{ my: 1.5 }} />
                  <MetricsSystemCard
                    currentWeek={currentData.currentWeek}
                    weekPrior={currentData.weekPrior}
                    weekTargets={currentData.weekTargets}
                    customMetricDefs={settings.customMetrics ?? []}
                    weekStartDate={currentData.checkIn.weekStartDate}
                    defaultExpanded={false}
                  />
                </>
              )}
            </Box>
          ) : (
            // Legacy mode (no template) — form inside the Paper
            <Box>
              <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                Week of {weekLabel}
              </Typography>
              {currentData && (
                <CheckInForm
                  currentWeek={currentData.currentWeek}
                  weekPrior={currentData.weekPrior}
                  checkIn={currentData.checkIn}
                  previousPhotos={currentData.previousPhotos}
                  weekTargets={currentData.weekTargets}
                  completedWorkoutsCount={currentData.completedWorkoutsCount}
                  plannedWorkoutsCount={currentData.plannedWorkoutsCount}
                  activePlanId={currentData.activePlanId}
                  template={currentData.template}
                  onSubmitted={() => setSubmitted(s => !s)}
                />
              )}
            </Box>
          )}
        </Paper>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* History */}
      <Typography variant="overline" color="text.secondary">Previous Check-ins</Typography>
      {loading ? (
        <Box sx={{ mt: 1 }}>
          {[0, 1, 2].map(i => <Skeleton key={i} variant="rounded" height={52} sx={{ mb: 1 }} />)}
        </Box>
      ) : history.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No previous check-ins yet.
        </Typography>
      ) : (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {history.map(c => (
            <CheckInHistoryCard key={c.id} checkIn={c} />
          ))}
          {history.length < historyTotal && (
            <Button variant="text" onClick={loadMoreHistory} sx={{ mt: 1 }}>
              Load more
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}
