import Link from 'next/link';
import type { Metric } from '@/generated/prisma/browser';
import { signalTokens } from '@lib/signal/tokens';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import type { ActivePlanWithStats, ActivePlanTree } from '@lib/userService';
import { estimateWorkoutMinutes, estimateWorkoutRemainingSeconds } from '@lib/workoutDurationEstimate';
import type { Settings } from '@/types/settingsTypes';
import { CompleteWeekButton } from './CompleteWeekButton';
import { SignalHomeMetricsCard } from './SignalHomeMetricsCard';

type Props = {
  userId: string;
  activePlanData: ActivePlanWithStats | null;
  metrics: Metric[];
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
  weekCompletedCount: number;
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
      exerciseNames: string[];
      estimatedDurationSeconds: number;
      estimatedRemainingSeconds: number;
      setCount: number;
    };

const pagePalette = signalTokens.surface.planning;
const heroPalette = signalTokens.surface.gym;

function workoutHasAnyLoggedSet(workout: ActivePlanTree['weeks'][number]['workouts'][number]): boolean {
  return workout.exercises.some((ex) => ex.sets.some((s) => s.weight != null || s.reps != null));
}

function totalSetsFor(workout: ActivePlanTree['weeks'][number]['workouts'][number]): number {
  return workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}

function resolve(activePlan: ActivePlanTree | null): Pick<ResolvedHome, 'hero' | 'weekIndex' | 'weekTotal' | 'weekCompletedCount' | 'weekWorkouts' | 'planName' | 'blockProgress'> {
  if (!activePlan) {
    return { hero: { kind: 'no-plan' }, weekIndex: null, weekTotal: 0, weekCompletedCount: 0, weekWorkouts: [], planName: null, blockProgress: null };
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
  const weekCompletedCount = weekWorkouts.filter((workout) => workout.state === 'done').length;

  if (!focusWorkout) {
    return {
      hero: { kind: 'all-done', planName: activePlan.name, weekIndex: activeWeekIdx + 1, weekTotal },
      weekIndex: activeWeekIdx + 1,
      weekTotal,
      weekCompletedCount,
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
      exerciseNames: focusWorkout.exercises.map((exercise) => exercise.exercise.name),
      estimatedDurationSeconds: estimateWorkoutMinutes(focusWorkout),
      setCount: totalSetsFor(focusWorkout),
      estimatedRemainingSeconds: estimateWorkoutRemainingSeconds(focusWorkout),
    },
    weekIndex: activeWeekIdx + 1,
    weekTotal,
    weekCompletedCount,
    weekWorkouts,
    planName: activePlan.name,
    blockProgress: { weekIndex: activeWeekIdx + 1, weekTotal },
  };
}

export function SignalHome({ userId, activePlanData, metrics, settings, today, checkInPending }: Props) {
  const resolved = resolve(activePlanData?.activePlan ?? null);
  const dateLabel = today.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <div
      className={signalFontVariablesClassName}
      style={{
        background: pagePalette.bg,
        color: pagePalette.ink,
        fontFamily: signalTokens.fontVar.body,
        minHeight: '100%',
        padding: '18px 16px 32px',
      }}
    >
      <style>{`
        @media (min-width: 1024px) {
          [data-signal-home-header] {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
          }
          [data-signal-home-grid] {
            display: grid;
            grid-template-columns: minmax(0, 1.9fr) minmax(280px, 0.95fr);
            gap: 26px;
            align-items: start;
          }
        }
      `}</style>

      <header data-signal-home-header style={{ marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: pagePalette.inkLight, marginBottom: 8 }}>
            My training · {dateLabel}
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: signalTokens.fontVar.cond,
              fontSize: 52,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: pagePalette.ink,
            }}
          >
            Today&apos;s session
          </h1>
        </div>
        {resolved.planName && resolved.weekIndex != null && (
          <div style={{ marginTop: 8, fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: pagePalette.inkMid, whiteSpace: 'nowrap' }}>
            {resolved.planName} · wk {resolved.weekIndex} / {resolved.weekTotal}
          </div>
        )}
      </header>

      <div data-signal-home-grid style={{ display: 'grid', gap: 20 }}>
        <div>
          {checkInPending && <CheckInPrompt />}
          <Hero hero={resolved.hero} />

          {resolved.weekWorkouts.length > 0 && (
            <section style={{ marginTop: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 18, fontWeight: 700, color: pagePalette.ink }}>
                  Week {resolved.weekIndex} progress
                </div>
                <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: pagePalette.inkMid }}>
                  {resolved.weekCompletedCount} of {resolved.weekWorkouts.length} done
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(resolved.weekWorkouts.length, 4)}, 1fr)`,
                  gap: 6,
                  background: pagePalette.surface,
                  border: `1px solid ${pagePalette.border}`,
                  borderRadius: signalTokens.radii.cardLarge,
                  padding: 10,
                }}
              >
                {resolved.weekWorkouts.slice(0, 4).map((workout) => (
                  <WeekCell key={workout.id} workout={workout} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <SignalHomeMetricsCard
            userId={userId}
            metrics={metrics}
            today={today}
            bodyweightUnit={settings.bodyweightUnit}
          />

          {resolved.blockProgress && (
            <section
              style={{
                background: pagePalette.surface,
                border: `1px solid ${pagePalette.border}`,
                borderRadius: signalTokens.radii.cardLarge,
                padding: '18px 18px 20px',
              }}
            >
              <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: pagePalette.inkLight, marginBottom: 10 }}>
                Block progress
              </div>
              {resolved.planName && (
                <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, color: pagePalette.ink, lineHeight: 1, marginBottom: 6 }}>
                  {resolved.planName}
                </div>
              )}
              <div style={{ fontSize: 14, color: pagePalette.inkMid, marginBottom: 14 }}>
                Week {resolved.blockProgress.weekIndex} of {resolved.blockProgress.weekTotal}
              </div>
              <div style={{ height: 2, background: pagePalette.inkGhost, borderRadius: 1 }}>
                <div
                  style={{
                    width: `${Math.min(100, (resolved.blockProgress.weekIndex / Math.max(resolved.blockProgress.weekTotal, 1)) * 100)}%`,
                    height: '100%',
                    background: pagePalette.ink,
                    borderRadius: 1,
                  }}
                />
              </div>
            </section>
          )}
        </div>
      </div>
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
          background: pagePalette.surface,
          border: `1px dashed ${pagePalette.borderStrong}`,
          borderRadius: signalTokens.radii.cardLarge,
          padding: '20px 20px 18px',
          textDecoration: 'none',
          color: pagePalette.ink,
        }}
      >
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: pagePalette.inkLight, marginBottom: 6 }}>No active plan</div>
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
          background: pagePalette.surface,
          border: `1px solid ${pagePalette.border}`,
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
          <div style={{ fontSize: 13, color: pagePalette.inkMid, lineHeight: 1.5 }}>
            {hero.planName} · week {hero.weekIndex} of {hero.weekTotal} done. Take the win.
          </div>
        </div>
        <CompleteWeekButton />
      </div>
    );
  }

  const isResume = hero.kind === 'resume';
  const exerciseLine = hero.exerciseNames.slice(0, 6).join(' · ');
  const estimatedMinutes = Math.round(hero.estimatedDurationSeconds / 60);
  const estimatedRemainingMinutes = Math.max(1, Math.round(hero.estimatedRemainingSeconds / 60));
  return (
    <div
      style={{
        background: heroPalette.surface,
        color: heroPalette.ink,
        border: `1px solid ${heroPalette.borderStrong}`,
        borderRadius: signalTokens.radii.cardLarge,
        overflow: 'hidden',
      }}
    >
      <div>
        <div style={{ padding: '24px 20px 20px' }}>
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
          <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 14, color: heroPalette.ink }}>
            {hero.workoutName}
          </div>
          {exerciseLine && (
            <div style={{ fontSize: 14, lineHeight: 1.45, color: heroPalette.inkMid, marginBottom: 18 }}>
              {exerciseLine}
            </div>
          )}
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: heroPalette.inkMid, marginBottom: 0 }}>
            <span><span style={{ color: heroPalette.ink, fontWeight: 600 }}>{hero.exerciseCount}</span> exercises</span>
            <span><span style={{ color: heroPalette.ink, fontWeight: 600 }}>{hero.setCount}</span> sets</span>
            <span><span style={{ color: heroPalette.ink, fontWeight: 600 }}>~{isResume ? estimatedRemainingMinutes : estimatedMinutes}</span> {isResume ? 'm left' : 'min'}</span>
          </div>
        </div>
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href={`/user/workout?workoutId=${hero.workoutId}`}
            aria-label={`${isResume ? 'Resume' : 'Start'} workout: ${hero.workoutName}`}
            style={{
              background: signalTokens.signal.base,
              color: heroPalette.bg,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 16,
              fontWeight: 600,
              flex: '1 1 220px',
              textDecoration: 'none',
            }}
          >
            <span>{isResume ? 'Resume workout' : 'Start workout'}</span>
            <ArrowRight stroke={heroPalette.bg} strokeWidth={2.4} />
          </Link>
          <Link
            href="/user/workout"
            style={{
              border: `1px solid ${heroPalette.borderStrong}`,
              color: heroPalette.ink,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              fontSize: 16,
              flex: '0 1 auto',
              minWidth: 160,
              textDecoration: 'none',
            }}
          >
            Choose another
          </Link>
        </div>
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
        background: pagePalette.surface,
        border: `1px solid ${isToday ? pagePalette.borderStrong : pagePalette.border}`,
        borderTop: isToday ? `2px solid ${signalTokens.signal.base}` : `1px solid ${pagePalette.border}`,
        padding: '10px 10px 11px',
        borderRadius: signalTokens.radii.cell,
        opacity: isDone ? 0.7 : 1,
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: pagePalette.inkLight, marginBottom: 3 }}>
        {workout.order + 1}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: workout.state === 'planned' ? pagePalette.inkMid : pagePalette.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {workout.name}
      </div>
      {workout.state === 'inProgress' && (
        <div style={{ marginTop: 5, fontFamily: signalTokens.fontVar.mono, fontSize: 9, color: signalTokens.signal.base, fontWeight: 600 }}>NOW</div>
      )}
      {workout.state === 'today' && (
        <div style={{ marginTop: 5, fontFamily: signalTokens.fontVar.mono, fontSize: 9, color: signalTokens.signal.base, fontWeight: 600 }}>TODAY</div>
      )}
      {workout.state === 'done' && (
        <div style={{ marginTop: 5, fontFamily: signalTokens.fontVar.mono, fontSize: 9, color: pagePalette.inkLight }}>logged</div>
      )}
    </div>
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
        background: pagePalette.surface,
        border: `1px solid ${pagePalette.border}`,
        borderLeft: `3px solid ${signalTokens.signal.base}`,
        borderRadius: signalTokens.radii.card,
        padding: '12px 14px',
        textDecoration: 'none',
        color: pagePalette.ink,
        marginBottom: 12,
      }}
    >
      <div>
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.base, marginBottom: 2 }}>
          Check-in due
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: pagePalette.ink }}>
          Submit this week&apos;s check-in
        </div>
      </div>
      <ArrowRight stroke={pagePalette.inkMid} strokeWidth={1.8} />
    </Link>
  );
}

function ArrowRight({ stroke = pagePalette.ink, strokeWidth = 2.2 }: { stroke?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
