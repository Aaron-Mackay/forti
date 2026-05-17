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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { WeeklyCheckIn } from '@/generated/prisma/browser';
import CheckInForm from './CheckInForm';
import CheckInHistoryCard, { CheckInDetails } from './CheckInHistoryCard';
import PhotoViewerDialog from '@/components/checkin/PhotoViewerDialog';
import { usePushSubscription } from '@lib/usePushSubscription';
import type { CurrentCheckInResponse } from '@lib/contracts/checkIn';
import { useSettings } from '@lib/providers/SettingsProvider';
import MetricsSystemCard from '@/components/checkin/MetricsSystemCard';
import { checkInHasCustomResponses } from '@/lib/checkInUtils';
import { getAllTemplateCards, parseCheckInTemplate } from '@/types/checkInTemplateTypes';
import { getCheckInHistory, getCurrentCheckIn } from '@lib/clientApi';
import { signalTokens } from '@lib/signal/tokens';

const palette = signalTokens.surface.planning;

type CurrentData = CurrentCheckInResponse;

function normalizeCurrentCheckInResponse(data: CurrentCheckInResponse): CurrentData {
  return {
    ...data,
    previousPhotos: data.previousPhotos ?? null,
    weekTargets: data.weekTargets ?? null,
    completedWorkoutsCount: data.completedWorkoutsCount ?? data.checkIn.completedWorkouts ?? 0,
    plannedWorkoutsCount: data.plannedWorkoutsCount ?? data.checkIn.plannedWorkouts ?? 0,
    workoutSummaries: data.workoutSummaries ?? [],
    activePlanId: data.activePlanId ?? null,
    template: data.template ?? null,
  };
}

function SignalHistoryRow({ checkIn }: { checkIn: WeeklyCheckIn }) {
  const [expanded, setExpanded] = useState(false);
  const [activePhoto, setActivePhoto] = useState<{ src: string; alt: string } | null>(null);

  const weekLabel = new Date(checkIn.weekStartDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const submittedLabel = checkIn.completedAt
    ? new Date(checkIn.completedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null;

  return (
    <div style={{ border: `1px solid ${palette.border}`, borderRadius: signalTokens.radii.card, overflow: 'hidden', background: palette.surface }}>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', width: '100%',
          background: 'transparent', border: 'none', padding: '12px 16px',
          cursor: 'pointer', gap: 8, color: palette.ink, textAlign: 'left',
        }}
      >
        {checkIn.completedAt && (
          <CheckCircleIcon style={{ fontSize: 18, color: signalTokens.signal.deep, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: signalTokens.fontVar.body, fontSize: 14, fontWeight: 500 }}>
            Week of {weekLabel}
          </div>
          {submittedLabel && (
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
              Submitted {submittedLabel}
            </div>
          )}
        </div>
        <ExpandMoreIcon style={{
          fontSize: 20, color: palette.inkLight, flexShrink: 0,
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 200ms ease',
        }} />
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${palette.border}` }}>
          <CheckInDetails checkIn={checkIn} onPhotoOpen={(src, alt) => setActivePhoto({ src, alt })} />
        </div>
      )}
      <PhotoViewerDialog photo={activePhoto} onClose={() => setActivePhoto(null)} />
    </div>
  );
}

export default function CheckInClient({ signalEnabled = false }: { signalEnabled?: boolean }) {
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
    const data = await getCurrentCheckIn();
    return normalizeCurrentCheckInResponse(data);
  };

  const loadHistory = async (offset: number) => {
    // Fetch past check-ins only; current week is excluded server-side
    return getCheckInHistory({ limit: 10, offset, excludeCurrent: true });
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
  const completedCheckInTemplateSnapshot = currentData && checkInHasCustomResponses(currentData.checkIn)
    ? parseCheckInTemplate(currentData.checkIn.templateSnapshot)
    : null;
  const completedMetricsCardConfig = completedCheckInTemplateSnapshot
    ? getAllTemplateCards(completedCheckInTemplateSnapshot).find(
    card => card.kind === 'system' && card.systemType === 'metrics',
    )?.metricConfig
    : undefined;

  const weekLabel = currentData
    ? new Date(currentData.checkIn.weekStartDate).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  if (signalEnabled) {
    return (
      <div
        style={{
          minHeight: '100%',
          background: palette.bg,
          color: palette.ink,
          fontFamily: signalTokens.fontVar.body,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* White header: kicker + title + week date */}
        <div
          style={{
            background: palette.surface,
            borderBottom: `1px solid ${palette.border}`,
            padding: '16px 20px',
            flexShrink: 0,
          }}
        >
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 4 }}>
            Check-in
          </div>
          <div
            style={{
              fontFamily: signalTokens.fontVar.cond,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              lineHeight: 1,
              marginBottom: !loading && currentData ? 6 : 0,
            }}
          >
            Weekly check-in
          </div>
          {!loading && currentData && (
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkMid }}>
              {weekLabel}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 16px 48px' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
          )}

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

          <div style={{ marginBottom: 28 }}>
          {loading ? (
            <Skeleton variant="rounded" height={120} />
          ) : !editingCurrent && !isCompleted && currentData?.template != null ? (
            <CheckInForm
              currentWeek={currentData.currentWeek}
              weekPrior={currentData.weekPrior}
              checkIn={currentData.checkIn}
              previousPhotos={currentData.previousPhotos}
              weekTargets={currentData.weekTargets}
              completedWorkoutsCount={currentData.completedWorkoutsCount}
              plannedWorkoutsCount={currentData.plannedWorkoutsCount}
              workoutSummaries={currentData.workoutSummaries}
              activePlanId={currentData.activePlanId}
              template={currentData.template}
              onSubmitted={() => setSubmitted(s => !s)}
            />
          ) : editingCurrent && currentData ? (
            <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: signalTokens.radii.card, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontFamily: signalTokens.fontVar.body, fontSize: 15, fontWeight: 600 }}>Edit submitted check-in</span>
                <IconButton
                  size="small"
                  aria-label="Close edit mode"
                  onClick={() => { setEditingCurrent(false); setSubmitted(s => !s); }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>
              <CheckInForm
                currentWeek={currentData.currentWeek}
                weekPrior={currentData.weekPrior}
                checkIn={currentData.checkIn}
                previousPhotos={currentData.previousPhotos}
                weekTargets={currentData.weekTargets}
                completedWorkoutsCount={currentData.completedWorkoutsCount}
                plannedWorkoutsCount={currentData.plannedWorkoutsCount}
                workoutSummaries={currentData.workoutSummaries}
                activePlanId={currentData.activePlanId}
                template={currentData.template}
                onSubmitted={() => setSubmitted(s => !s)}
              />
            </div>
          ) : isCompleted && currentData ? (
            <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: signalTokens.radii.card, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <CheckCircleIcon style={{ color: signalTokens.signal.deep }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Check-in complete</div>
                  <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: palette.inkMid }}>Week of {weekLabel}</div>
                </div>
                <IconButton
                  size="small"
                  aria-label="Edit current check-in"
                  onClick={() => setEditingCurrent(true)}
                  sx={{ color: 'text.secondary' }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </div>
              <CheckInDetails checkIn={currentData.checkIn} />
              <div style={{ height: 1, background: palette.border, margin: '12px 0' }} />
              <MetricsSystemCard
                currentWeek={currentData.currentWeek}
                weekPrior={currentData.weekPrior}
                weekTargets={currentData.weekTargets}
                customMetricDefs={settings.customMetrics ?? []}
                bodyweightUnit={settings.bodyweightUnit}
                weekStartDate={currentData.checkIn.weekStartDate}
                defaultExpanded={false}
                metricConfig={completedMetricsCardConfig}
              />
            </div>
          ) : currentData ? (
            <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: signalTokens.radii.card, padding: 16 }}>
              <CheckInForm
                currentWeek={currentData.currentWeek}
                weekPrior={currentData.weekPrior}
                checkIn={currentData.checkIn}
                previousPhotos={currentData.previousPhotos}
                weekTargets={currentData.weekTargets}
                completedWorkoutsCount={currentData.completedWorkoutsCount}
                plannedWorkoutsCount={currentData.plannedWorkoutsCount}
                workoutSummaries={currentData.workoutSummaries}
                activePlanId={currentData.activePlanId}
                template={currentData.template}
                onSubmitted={() => setSubmitted(s => !s)}
              />
            </div>
          ) : null}
        </div>

        <div style={{ height: 1, background: palette.border, marginBottom: 24 }} />

        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Previous Check-ins
        </div>

        {loading ? (
          <div>
            {[0, 1, 2].map(i => <Skeleton key={i} variant="rounded" height={52} sx={{ mb: 1 }} />)}
          </div>
        ) : history.length === 0 ? (
          <div style={{ fontSize: 14, color: palette.inkLight }}>No previous check-ins yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {history.map(c => <SignalHistoryRow key={c.id} checkIn={c} />)}
            {history.length < historyTotal && (
              <button
                type="button"
                onClick={loadMoreHistory}
                style={{
                  display: 'block', width: '100%', padding: '12px 16px',
                  background: 'transparent', border: `1px solid ${palette.border}`,
                  borderRadius: signalTokens.radii.card, color: palette.inkMid,
                  fontFamily: signalTokens.fontVar.body, fontSize: 14, cursor: 'pointer',
                  marginTop: 4,
                }}
              >
                Load more
              </button>
            )}
          </div>
        )}
        </div>
      </div>
    );
  }

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
            workoutSummaries={currentData.workoutSummaries}
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
                workoutSummaries={currentData.workoutSummaries}
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
                    bodyweightUnit={settings.bodyweightUnit}
                    weekStartDate={currentData.checkIn.weekStartDate}
                    defaultExpanded={false}
                    metricConfig={completedMetricsCardConfig}
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
                  workoutSummaries={currentData.workoutSummaries}
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
