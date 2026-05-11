import Link from 'next/link';
import type { Metric, Event as PrismaEvent } from '@/generated/prisma/browser';
import { signalTokens } from '@lib/signal/tokens';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import type { ActivePlanWithStats, ActivePlanTree } from '@lib/userService';
import type { Settings } from '@/types/settingsTypes';
import { kgToBodyweightDisplay } from '@/lib/units';
import { CompleteWeekButton } from './CompleteWeekButton';

type Props = {
  userName: string | null | undefined;
  activePlanData: ActivePlanWithStats | null;
  metrics: Metric[];
  events: PrismaEvent[];
  settings: Settings;
  today: Date;
  checkInPending?: boolean;
};

type WorkoutState = 'done' | 'today' | 'planned' | 'inProgress';

type WeekWorkout = {
  id: number;
  name: string;
  state: WorkoutState;
  order: number;
};

type ResolvedHome = {
  hero: HeroState;
  weekIndex: number | null;
  weekTotal: number;
  weekWorkouts: WeekWorkout[];
  blockProgress: { weekIndex: number; weekTotal: number } | null;
  planName: string | null;
};

type HeroState =
  | { kind: 'no-plan' }
  | { kind: 'all-done'; planName: string; weekIndex: number; weekTotal: number }
  | {
      kind: 'resume' | 'start';
      planName: string;
      weekIndex: number;
      weekTotal: number;
      workoutId: number;
      workoutName: string;
      exerciseCount: number;
      setCount: number;
    };

const palette = signalTokens.surface.gym;

function workoutHasAnyLoggedSet(workout: ActivePlanTree['weeks'][number]['workouts'][number]): boolean {
  return workout.exercises.some((ex) => ex.sets.some((s) => s.weight != null || s.reps != null));
}

function totalSetsFor(workout: ActivePlanTree['weeks'][number]['workouts'][number]): number {
  return workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}

function resolve(activePlan: ActivePlanTree | null): Pick<ResolvedHome, 'hero' | 'weekIndex' | 'weekTotal' | 'weekWorkouts' | 'planName' | 'blockProgress'> {
  if (!activePlan) {
    return { hero: { kind: 'no-plan' }, weekIndex: null, weekTotal: 0, weekWorkouts: [], planName: null, blockProgress: null };
  }
  const weeks = activePlan.weeks;
  const weekTotal = weeks.length;

  let activeWeekIdx = weeks.findIndex((wk) => wk.workouts.some((w) => !w.dateCompleted));
  if (activeWeekIdx === -1) activeWeekIdx = weeks.length - 1;
  const activeWeek = weeks[activeWeekIdx] ?? null;

  const inProgress = activeWeek?.workouts.find((w) => !w.dateCompleted && workoutHasAnyLoggedSet(w)) ?? null;
  const nextPlanned = activeWeek?.workouts.find((w) => !w.dateCompleted && !workoutHasAnyLoggedSet(w)) ?? null;
  const focusWorkout = inProgress ?? nextPlanned;

  const weekWorkouts: WeekWorkout[] = (activeWeek?.workouts ?? []).map((w) => {
    let state: WorkoutState = 'planned';
    if (w.dateCompleted) state = 'done';
    else if (focusWorkout && w.id === focusWorkout.id) state = inProgress ? 'inProgress' : 'today';
    return { id: w.id, name: w.name, state, order: w.order };
  });

  if (!focusWorkout) {
    return {
      hero: { kind: 'all-done', planName: activePlan.name, weekIndex: activeWeekIdx + 1, weekTotal },
      weekIndex: activeWeekIdx + 1,
      weekTotal,
      weekWorkouts,
      planName: activePlan.name,
      blockProgress: { weekIndex: activeWeekIdx + 1, weekTotal },
    };
  }

  return {
    hero: {
      kind: inProgress ? 'resume' : 'start',
      planName: activePlan.name,
      weekIndex: activeWeekIdx + 1,
      weekTotal,
      workoutId: focusWorkout.id,
      workoutName: focusWorkout.name,
      exerciseCount: focusWorkout.exercises.length,
      setCount: totalSetsFor(focusWorkout),
    },
    weekIndex: activeWeekIdx + 1,
    weekTotal,
    weekWorkouts,
    planName: activePlan.name,
    blockProgress: { weekIndex: activeWeekIdx + 1, weekTotal },
  };
}

function todayMetricsRow(metrics: Metric[], today: Date, settings: Settings) {
  const isoToday = today.toISOString().slice(0, 10);
  const todayMetric = metrics.find((m) => m.date.toISOString().slice(0, 10) === isoToday) ?? metrics[metrics.length - 1] ?? null;
  const bw = todayMetric?.weight ?? null;
  const sleepMins = todayMetric?.sleepMins ?? null;
  const steps = todayMetric?.steps ?? null;
  const calories = todayMetric?.calories ?? null;

  const bwUnit = settings.bodyweightUnit;
  const bwDisplay = kgToBodyweightDisplay(bw, bwUnit);

  return [
    { label: 'Weight', value: bwDisplay == null ? null : bwDisplay.toFixed(1), unit: bwUnit },
    { label: 'Sleep', value: sleepMins == null ? null : (sleepMins / 60).toFixed(1), unit: 'h' },
    { label: 'Steps', value: steps == null ? null : steps.toLocaleString(), unit: '' },
    { label: 'Cals', value: calories == null ? null : String(calories), unit: 'kcal' },
  ];
}

function formatDateHeader(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function SignalHome({ userName, activePlanData, metrics, settings, today, checkInPending }: Props) {
  const resolved = resolve(activePlanData?.activePlan ?? null);
  const tiles = todayMetricsRow(metrics, today, settings);
  const firstName = userName?.split(' ')[0] ?? null;

  return (
    <div
      className={signalFontVariablesClassName}
      style={{
        background: palette.bg,
        color: palette.ink,
        fontFamily: signalTokens.fontVar.body,
        minHeight: '100%',
        padding: '14px 16px 28px',
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>{formatDateHeader(today)}</span>
        {resolved.planName && resolved.weekIndex != null && (
          <span>{resolved.planName} · wk {resolved.weekIndex} / {resolved.weekTotal}</span>
        )}
      </div>

      {firstName && (
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', color: palette.inkMid, marginBottom: 12 }}>
          {firstName}
        </div>
      )}

      {checkInPending && <CheckInPrompt />}

      <Hero hero={resolved.hero} />

      {resolved.weekWorkouts.length > 0 && (
        <section style={{ marginTop: 18 }}>
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 8 }}>This week</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(resolved.weekWorkouts.length, 4)}, 1fr)`,
              gap: 4,
            }}
          >
            {resolved.weekWorkouts.slice(0, 4).map((w) => (
              <WeekCell key={w.id} workout={w} />
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 18 }}>
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 8 }}>Today&apos;s metrics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {tiles.map((tile) => (
            <MetricTile key={tile.label} {...tile} />
          ))}
        </div>
      </section>

      {resolved.blockProgress && (
        <section style={{ marginTop: 18 }}>
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>Block progress</span>
            <span>
              week {resolved.blockProgress.weekIndex} of {resolved.blockProgress.weekTotal}
            </span>
          </div>
          <div style={{ height: 2, background: palette.inkGhost, borderRadius: 1 }}>
            <div
              style={{
                width: `${Math.min(100, (resolved.blockProgress.weekIndex / Math.max(resolved.blockProgress.weekTotal, 1)) * 100)}%`,
                height: '100%',
                background: palette.ink,
                borderRadius: 1,
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function Hero({ hero }: { hero: HeroState }) {
  if (hero.kind === 'no-plan') {
    return (
      <Link
        href="/user/plan/create"
        style={{
          display: 'block',
          background: palette.surface,
          border: `1px dashed ${palette.borderStrong}`,
          borderRadius: signalTokens.radii.cardLarge,
          padding: '20px 20px 18px',
          textDecoration: 'none',
          color: palette.ink,
        }}
      >
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>No active plan</div>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 28, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 12 }}>
          Build your first plan
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
          <span>Create a plan</span>
          <ArrowRight />
        </div>
      </Link>
    );
  }

  if (hero.kind === 'all-done') {
    return (
      <div
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 20px 18px' }}>
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.base, marginBottom: 6 }}>
            Week complete
          </div>
          <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 28, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 10 }}>
            Nothing left to log this week
          </div>
          <div style={{ fontSize: 13, color: palette.inkMid, lineHeight: 1.5 }}>
            {hero.planName} · week {hero.weekIndex} of {hero.weekTotal} done. Take the win.
          </div>
        </div>
        <CompleteWeekButton />
      </div>
    );
  }

  const isResume = hero.kind === 'resume';
  return (
    <div>
      <Link
        href={`/user/workout?workoutId=${hero.workoutId}`}
        aria-label={`${isResume ? 'Resume' : 'Start'} workout: ${hero.workoutName}`}
        style={{
          display: 'block',
          background: palette.ink,
          color: palette.bg,
          borderRadius: signalTokens.radii.cardLarge,
          textDecoration: 'none',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 20px 18px' }}>
          <div
            style={{
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 11,
              color: signalTokens.signal.base,
              marginBottom: 6,
            }}
          >
            {isResume ? 'In progress' : `Next planned · ${hero.planName} · wk ${hero.weekIndex}`}
          </div>
          <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 14, color: palette.bg }}>
            {hero.workoutName}
          </div>
          <div style={{ display: 'flex', gap: 14, fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: 'rgba(243,239,231,0.6)', marginBottom: 0 }}>
            <span><span style={{ color: palette.bg, fontWeight: 600 }}>{hero.exerciseCount}</span> exercises</span>
            <span><span style={{ color: palette.bg, fontWeight: 600 }}>{hero.setCount}</span> sets</span>
          </div>
        </div>
        <div
          style={{
            background: signalTokens.signal.base,
            color: palette.ink,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          <span>{isResume ? 'Resume workout' : 'Start workout'}</span>
          <ArrowRight stroke={palette.ink} strokeWidth={2.4} />
        </div>
      </Link>
      <div style={{ marginTop: 10, textAlign: 'center' }}>
        <Link
          href="/user/workout"
          style={{
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 11,
            color: palette.inkMid,
            textDecoration: 'none',
          }}
        >
          Choose another workout
        </Link>
      </div>
    </div>
  );
}

function WeekCell({ workout }: { workout: WeekWorkout }) {
  const isToday = workout.state === 'today' || workout.state === 'inProgress';
  const isDone = workout.state === 'done';
  return (
    <div
      style={{
        background: isToday ? palette.surfaceAlt : 'transparent',
        border: `1px solid ${isToday ? palette.borderStrong : palette.border}`,
        borderTop: isToday ? `2px solid ${signalTokens.signal.base}` : `1px solid ${palette.border}`,
        padding: '8px 8px 9px',
        borderRadius: signalTokens.radii.cell,
        opacity: isDone ? 0.7 : 1,
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight, marginBottom: 3 }}>
        {workout.order + 1}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: workout.state === 'planned' ? palette.inkMid : palette.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {workout.name}
      </div>
      {workout.state === 'inProgress' && (
        <div style={{ marginTop: 5, fontFamily: signalTokens.fontVar.mono, fontSize: 9, color: signalTokens.signal.base, fontWeight: 600 }}>NOW</div>
      )}
      {workout.state === 'today' && (
        <div style={{ marginTop: 5, fontFamily: signalTokens.fontVar.mono, fontSize: 9, color: signalTokens.signal.base, fontWeight: 600 }}>TODAY</div>
      )}
      {workout.state === 'done' && (
        <div style={{ marginTop: 5, fontFamily: signalTokens.fontVar.mono, fontSize: 9, color: palette.inkLight }}>logged</div>
      )}
    </div>
  );
}

function MetricTile({ label, value, unit }: { label: string; value: string | null; unit: string }) {
  const isEmpty = value == null;
  return (
    <Link
      href="/user/check-in"
      style={{
        display: 'block',
        textDecoration: 'none',
        border: `1px ${isEmpty ? 'dashed' : 'solid'} ${palette.border}`,
        background: isEmpty ? 'transparent' : palette.surface,
        borderRadius: signalTokens.radii.cell,
        padding: '8px 6px 9px',
        textAlign: 'center',
        color: palette.ink,
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 18, fontWeight: 700, color: isEmpty ? palette.inkGhost : palette.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value ?? '—'}
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight, marginTop: 3 }}>
        {isEmpty ? 'tap to log' : unit}
      </div>
    </Link>
  );
}

function CheckInPrompt() {
  return (
    <Link
      href="/user/check-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        background: palette.surface,
        border: `1px solid ${palette.borderStrong}`,
        borderLeft: `3px solid ${signalTokens.signal.base}`,
        borderRadius: signalTokens.radii.card,
        padding: '12px 14px',
        textDecoration: 'none',
        color: palette.ink,
        marginBottom: 12,
      }}
    >
      <div>
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.base, marginBottom: 2 }}>
          Check-in due
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: palette.ink }}>
          Submit this week&apos;s check-in
        </div>
      </div>
      <ArrowRight stroke={palette.inkMid} strokeWidth={1.8} />
    </Link>
  );
}

function ArrowRight({ stroke = palette.bg, strokeWidth = 2.2 }: { stroke?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
