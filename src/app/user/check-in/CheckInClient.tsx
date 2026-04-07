'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
import type { WeeklyCheckIn } from '@/generated/prisma/browser';
import CheckInForm from './CheckInForm';
import CheckInHistoryCard, { CheckInDetails } from './CheckInHistoryCard';
import { usePushSubscription } from '@lib/usePushSubscription';
import type { CurrentCheckInResponse } from '@/types/checkInTypes';

type CurrentData = CurrentCheckInResponse;

export default function CheckInClient() {
  const [currentData, setCurrentData] = useState<CurrentData | null>(null);
  const [history, setHistory] = useState<WeeklyCheckIn[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [editingCurrent, setEditingCurrent] = useState(false);

  const { permission, subscribing, subscribe } = usePushSubscription();

  const loadCurrent = useCallback(async () => {
    const res = await fetch('/api/check-in/current');
    if (!res.ok) throw new Error('Failed to load check-in');
    return res.json() as Promise<CurrentCheckInResponse>;
  }, []);

  const loadHistory = useCallback(async (offset: number) => {
    // Fetch past check-ins only; current week is excluded server-side
    const res = await fetch(`/api/check-in?limit=10&offset=${offset}&excludeCurrent=true`);
    if (!res.ok) throw new Error('Failed to load history');
    return res.json() as Promise<{ checkIns: WeeklyCheckIn[]; total: number }>;
  }, []);

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
  }, [loadCurrent, loadHistory, submitted]);

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
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  return (
    <Box sx={{ pt: 2, pb: 6, maxWidth: 600 }}>
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
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        {loading ? (
          <Skeleton variant="rounded" height={120} />
        ) : editingCurrent && currentData ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body1" fontWeight={600}>
                Edit submitted check-in
              </Typography>
              <Button size="small" onClick={() => setEditingCurrent(false)}>
                Cancel
              </Button>
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
            {currentData && <CheckInDetails checkIn={currentData.checkIn} />}
          </Box>
        ) : (
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
                onSubmitted={() => setSubmitted(s => !s)}
              />
            )}
          </Box>
        )}
      </Paper>

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
