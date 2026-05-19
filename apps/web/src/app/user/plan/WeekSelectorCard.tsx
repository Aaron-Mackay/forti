'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Container, List, ListItem, ListItemButton, ListItemText, Snackbar, Stack } from '@mui/material';
import { useAppBar } from '@lib/providers/AppBarProvider';
import { setActivePlan } from '@lib/clientApi';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';
import { getWeekStatus, getWorkoutStatus, type ProgressStatus } from '@/lib/workoutProgress';
import ProgressIcon from '@/lib/ProgressIcon';
import type { PlanPrisma, WeekPrisma } from '@/types/dataTypes';
import { CompleteWeekModal } from './CompleteWeekModal';

export interface WeekSelectorCardProps {
  plan: PlanPrisma;
  activePlanId: number | null;
  targetUserId?: string;
  coach?: { name: string; firstName: string };
  client?: { name: string; firstName: string };
  signalEnabled: boolean;
}

const palette = signalTokens.surface.planning;
const desktopBp = signalTokens.space.desktopBreakpointPx;

function formatLastActivity(value: Date | string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return 'Today';
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function lastLogForWeek(week: WeekPrisma) {
  return week.workouts
    .map((workout) => workout.dateCompleted)
    .filter((value): value is Date => value != null)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
}

function statusLabel(status: ProgressStatus, isActivePlan: boolean, week: WeekPrisma, activeWeekId: number | null) {
  if (isActivePlan && week.id === activeWeekId) return 'ACTIVE';
  if (status === 'completed') return 'COMPLETED';
  if (status === 'in_progress') return 'ACTIVE';
  return 'INACTIVE';
}

function StatusPill({ label, compact = false }: { label: string; compact?: boolean }) {
  const isActive = label === 'ACTIVE';
  const isCompleted = label === 'COMPLETED';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: compact ? 74 : 82,
        border: `1px solid ${isActive ? signalTokens.signal.deep : palette.border}`,
        borderRadius: signalTokens.radii.pill,
        background: isActive ? signalTokens.signal.dim : isCompleted ? palette.surfaceAlt : 'transparent',
        color: isActive ? palette.ink : isCompleted ? palette.inkMid : palette.inkLight,
        fontFamily: signalTokens.fontVar.mono,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        padding: compact ? '4px 6px' : '4px 7px',
      }}
    >
      {label}
    </span>
  );
}

function countCompletedWorkouts(week: WeekPrisma) {
  return week.workouts.filter((workout) => getWorkoutStatus(workout) === 'completed').length;
}

export default function WeekSelectorCard({
  plan,
  activePlanId,
  targetUserId,
  client,
  signalEnabled,
}: WeekSelectorCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [completeWeekOpen, setCompleteWeekOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const sortedWeeks = useMemo(() => [...plan.weeks].sort((a, b) => a.order - b.order), [plan.weeks]);
  const isActivePlan = plan.id === activePlanId;
  const isCoach = Boolean(targetUserId);
  const activeWeek = useMemo(
    () => sortedWeeks.find((week) => getWeekStatus(week) !== 'completed') ?? null,
    [sortedWeeks],
  );
  const nextUnfinishedWorkout = useMemo(
    () => (activeWeek?.workouts ?? []).find((workout) => !workout.dateCompleted) ?? null,
    [activeWeek],
  );
  const daysPerWeek = sortedWeeks[0]?.workouts.length ?? 0;
  const weeksDone = sortedWeeks.filter((week) => getWeekStatus(week) === 'completed').length;
  const activeWeekId = activeWeek?.id ?? null;
  const editHref = `/user/plan/${plan.id}`;
  const planListHref = isCoach && targetUserId ? `/user/coach/clients/${targetUserId}/plans` : '/user/plan';
  const canShowResume = !isCoach && isActivePlan && nextUnfinishedWorkout != null;
  const canShowCompleteWeek = !isCoach && isActivePlan && activeWeek != null && activeWeek.workouts.some((workout) => !workout.dateCompleted);
  const canShowActivate = !isCoach && !isActivePlan;
  const canShowEditPlan = isCoach || plan.clientCanEdit;
  const completedInActiveWeek = activeWeek ? countCompletedWorkouts(activeWeek) : 0;
  const activeWeekTotal = activeWeek?.workouts.length ?? 0;
  const incompleteWorkoutNames = activeWeek?.workouts.filter((workout) => !workout.dateCompleted).map((workout) => workout.name) ?? [];

  async function handleActivate() {
    try {
      await setActivePlan(plan.id);
      setSnackbar({ open: true, message: `Switched to "${plan.name}"`, severity: 'success' });
      startTransition(() => router.refresh());
    } catch {
      setSnackbar({ open: true, message: 'Failed to update active plan', severity: 'error' });
    }
  }

  useAppBar({
    title: 'Weeks',
    showBack: true,
    onBack: () => router.push(planListHref),
  });

  if (!signalEnabled) {
    return (
      <>
        <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary' }}>
          <Container maxWidth="sm" sx={{ py: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 1 }}>
              <Box sx={{ typography: 'body2', color: 'text.secondary' }}>{plan.name}</Box>
              <Button component={Link} href={planListHref} size="small" variant="text">
                Change plan
              </Button>
            </Stack>
            <List>
              {sortedWeeks.map((week) => (
                <ListItem key={week.id} disablePadding secondaryAction={<ProgressIcon status={getWeekStatus(week)} />}>
                  <ListItemButton onClick={() => router.push(isCoach ? editHref : `/user/workout?weekId=${week.id}`)}>
                    <ListItemText primary={`Week ${week.order}`} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Container>
        </Box>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar((current) => ({ ...current, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }

  const eyebrowPrefix = isCoach && client
    ? `CLIENTS · ${client.name.toUpperCase()} · PLANS`
    : 'PLANS';
  const activeStatusText = isActivePlan ? 'Active' : 'Inactive';

  return (
    <div
      className={signalFontVariablesClassName}
      style={{
        minHeight: '100%',
        background: palette.bg,
        color: palette.ink,
        fontFamily: signalTokens.fontVar.body,
        padding: '14px 16px 28px',
      }}
    >
        <style>{`
        [data-week-actions] { display: none; }
        [data-week-desktop] { display: none; }
        [data-week-mobile] { display: block; }
        @media (min-width: ${desktopBp}px) {
          [data-week-shell] { max-width: 1080px; margin: 0 auto; padding: 24px 32px 28px; }
          [data-week-header] { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
          [data-week-actions] { display: flex; }
          [data-week-desktop] { display: block; }
          [data-week-mobile] { display: none !important; }
        }
      `}</style>

      <div data-week-shell>
        <div data-week-header style={{ marginBottom: 18 }}>
          <div style={{ minWidth: 0 }}>
            <Link
              href={planListHref}
              style={{
                display: 'inline-flex',
                marginBottom: 8,
                color: palette.inkLight,
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 10,
                letterSpacing: '0.14em',
                textDecoration: 'none',
              }}
            >
              &lt; {eyebrowPrefix}
            </Link>
            <h1
              style={{
                margin: 0,
                fontFamily: signalTokens.fontVar.cond,
                fontSize: 30,
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: '-0.015em',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
              }}
            >
              {plan.name}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8, color: palette.inkMid, fontSize: 12 }}>
              <span>{weeksDone} of {sortedWeeks.length} weeks done</span>
              <span>·</span>
              <span>{daysPerWeek || '?'} days/wk</span>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 6,
                    height: 6,
                    background: isActivePlan ? signalTokens.signal.deep : palette.inkLight,
                    display: 'inline-block',
                  }}
                />
                {activeStatusText}
              </span>
            </div>
          </div>
          <div data-week-actions style={{ gap: 8, flexShrink: 0 }}>
            {canShowEditPlan && <ActionLink href={editHref}>Edit plan</ActionLink>}
            {canShowCompleteWeek && <ActionButton onClick={() => setCompleteWeekOpen(true)}>Complete week</ActionButton>}
            {canShowActivate && <ActionButton primary disabled={isPending} onClick={() => void handleActivate()}>Activate this plan</ActionButton>}
            {canShowResume && (
              <ActionLink primary href={`/user/workout?workoutId=${nextUnfinishedWorkout.id}`}>
                Resume {nextUnfinishedWorkout.name} →
              </ActionLink>
            )}
          </div>
        </div>

        {canShowResume && (
          <button
            type="button"
            data-week-mobile
            onClick={() => router.push(`/user/workout?workoutId=${nextUnfinishedWorkout.id}`)}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: signalTokens.radii.card,
              background: signalTokens.signal.base,
              color: palette.ink,
              padding: '12px 14px',
              textAlign: 'left',
              marginBottom: 10,
              cursor: 'pointer',
            }}
          >
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.72, marginBottom: 3 }}>
              WEEK {activeWeek?.order ?? 0} · NEXT WORKOUT
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: signalTokens.fontVar.cond, fontSize: 19, fontWeight: 700 }}>
              <span>{nextUnfinishedWorkout.name}</span>
              <span aria-hidden="true">→</span>
            </div>
          </button>
        )}

        {canShowCompleteWeek && (
          <button
            type="button"
            data-week-mobile
            onClick={() => setCompleteWeekOpen(true)}
            style={{
              width: '100%',
              border: `1.5px solid ${palette.borderStrong}`,
              borderRadius: signalTokens.radii.card,
              background: palette.surface,
              color: palette.ink,
              padding: '12px 14px',
              textAlign: 'left',
              marginBottom: 14,
              cursor: 'pointer',
            }}
          >
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 3 }}>
              COMPLETE WEEK
            </div>
            <div style={{ fontSize: 13, color: palette.inkMid }}>Mark unfinished workouts as complete</div>
          </button>
        )}

        <div
          data-week-desktop
          style={{
            border: `1.5px solid ${palette.borderStrong}`,
            borderRadius: signalTokens.radii.cardLarge,
            background: palette.surface,
            overflow: 'hidden',
          }}
        >
          <div
            role="row"
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 1.4fr 1fr 1fr 110px 100px',
              gap: 12,
              padding: '9px 16px',
              background: palette.surfaceAlt,
              color: palette.inkMid,
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.16em',
            }}
          >
            <span>#</span>
            <span>WEEK</span>
            <span>SESSIONS</span>
            <span>LAST LOG</span>
            <span>STATUS</span>
            <span>ACTION</span>
          </div>
          {sortedWeeks.map((week) => {
            const status = getWeekStatus(week);
            const label = statusLabel(status, isActivePlan, week, activeWeekId);
            const done = countCompletedWorkouts(week);
            const isActiveRow = label === 'ACTIVE';
            return (
              <button
                type="button"
                key={week.id}
                onClick={() => router.push(isCoach ? editHref : `/user/workout?weekId=${week.id}`)}
                aria-current={isActiveRow ? 'true' : undefined}
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '36px 1.4fr 1fr 1fr 110px 100px',
                  gap: 12,
                  width: '100%',
                  border: 'none',
                  borderBottom: `1px solid ${palette.border}`,
                  background: isActiveRow ? signalTokens.signal.dim : palette.surface,
                  color: palette.ink,
                  padding: '12px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  alignItems: 'center',
                }}
              >
                {isActiveRow && <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: signalTokens.signal.deep }} />}
                <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {String(week.order).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: label === 'INACTIVE' ? palette.inkMid : palette.ink }}>
                  Week {week.order}
                </span>
                <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 12, fontVariantNumeric: 'tabular-nums', color: palette.inkMid }}>
                  {done === 0 ? '—' : done} / {week.workouts.length}
                </span>
                <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: palette.inkMid }}>
                  {formatLastActivity(lastLogForWeek(week))}
                </span>
                <StatusPill label={label} />
                <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, fontWeight: label === 'ACTIVE' ? 700 : 600, color: label === 'ACTIVE' ? palette.ink : palette.inkLight }}>
                  {label === 'ACTIVE' ? 'Open →' : label === 'COMPLETED' ? 'VIEW LOGS' : 'PREVIEW'}
                </span>
              </button>
            );
          })}
        </div>

        <div data-week-mobile style={{ display: 'grid', gap: 2 }}>
          {sortedWeeks.map((week) => {
            const status = getWeekStatus(week);
            const label = statusLabel(status, isActivePlan, week, activeWeekId);
            const done = countCompletedWorkouts(week);
            const isActiveRow = label === 'ACTIVE';
            return (
              <button
                key={week.id}
                type="button"
                aria-current={isActiveRow ? 'true' : undefined}
                onClick={() => router.push(isCoach ? editHref : `/user/workout?weekId=${week.id}`)}
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '30px minmax(0, 1fr) 48px 84px',
                  gap: 6,
                  alignItems: 'center',
                  border: `1px solid ${isActiveRow ? palette.borderStrong : palette.border}`,
                  borderRadius: signalTokens.radii.card,
                  background: isActiveRow ? signalTokens.signal.dim : palette.surface,
                  color: palette.ink,
                  padding: '11px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {isActiveRow && <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: signalTokens.signal.deep }} />}
                <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, fontWeight: 700 }}>W{week.order}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Week {week.order}</span>
                <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkMid }}>{done || '—'} / {week.workouts.length}</span>
                <StatusPill label={label} compact />
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 14, fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          Weeks don&apos;t auto-advance — Complete week confirms what&apos;s done and lets you choose the next.
        </div>
      </div>

      <CompleteWeekModal
        open={completeWeekOpen}
        weekNumber={activeWeek?.order ?? 0}
        done={completedInActiveWeek}
        total={activeWeekTotal}
        incompleteWorkoutNames={incompleteWorkoutNames}
        onClose={() => setCompleteWeekOpen(false)}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((current) => ({ ...current, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

function ActionButton({
  children,
  primary = false,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        border: `1px solid ${primary ? signalTokens.signal.base : palette.borderStrong}`,
        borderRadius: signalTokens.radii.card,
        background: primary ? signalTokens.signal.base : 'transparent',
        color: palette.ink,
        padding: '8px 12px',
        fontFamily: signalTokens.fontVar.body,
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function ActionLink({
  children,
  href,
  primary = false,
}: {
  children: ReactNode;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${primary ? signalTokens.signal.base : palette.borderStrong}`,
        borderRadius: signalTokens.radii.card,
        background: primary ? signalTokens.signal.base : 'transparent',
        color: palette.ink,
        padding: '8px 12px',
        fontFamily: signalTokens.fontVar.body,
        fontSize: 12,
        fontWeight: 700,
        textDecoration: 'none',
      }}
    >
      {children}
    </Link>
  );
}
