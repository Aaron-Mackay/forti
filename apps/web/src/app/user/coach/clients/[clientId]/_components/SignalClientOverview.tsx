import Link from 'next/link';
import type { Metric, Event as PrismaEvent, WeeklyCheckIn } from '@/generated/prisma/browser';
import type { ActivePlanWithStats, ActivePlanTree } from '@lib/userService';
import { kgToBodyweightDisplay, type BodyweightUnit } from '@/lib/units';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';
import { CoachNotesPanel } from './CoachNotesPanel';

type OverviewCheckIn = Pick<WeeklyCheckIn, 'id' | 'weekStartDate' | 'completedAt' | 'coachReviewedAt'> | null;

type TargetsSummary = {
  caloriesTarget: number | null;
  proteinTarget: number | null;
  stepsTarget: number | null;
  sleepMinsTarget: number | null;
} | null;

type Props = {
  clientId: string;
  clientName: string | null;
  activePlanData: ActivePlanWithStats | null;
  latestMetric: Metric | null;
  activeBlock: PrismaEvent | null;
  latestCheckIn: OverviewCheckIn;
  pendingReviewCheckIn: OverviewCheckIn;
  targetsSummary: TargetsSummary;
  coachClientNotes: string | null;
  bodyweightUnit: BodyweightUnit;
  today: Date;
};

const palette = signalTokens.surface.planning;

function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatShortDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function resolveActiveWeek(activePlan: ActivePlanTree | null) {
  if (!activePlan) return null;
  return activePlan.weeks.find((week) => week.workouts.some((workout) => !workout.dateCompleted))
    ?? activePlan.weeks[activePlan.weeks.length - 1]
    ?? null;
}

function activeWeekSummary(activePlanData: ActivePlanWithStats | null) {
  const activeWeek = resolveActiveWeek(activePlanData?.activePlan ?? null);
  if (!activeWeek) {
    return {
      title: 'No active week',
      detail: 'Assign a plan to see the training week.',
    };
  }

  const totalWorkouts = activeWeek.workouts.length;
  const completedWorkouts = activeWeek.workouts.filter((workout) => workout.dateCompleted).length;
  return {
    title: `${completedWorkouts} / ${totalWorkouts}`,
    detail: `workouts logged in week ${activeWeek.order}`,
  };
}

function checkInSummary(latestCheckIn: OverviewCheckIn, pendingReviewCheckIn: OverviewCheckIn) {
  if (pendingReviewCheckIn?.completedAt) {
    return {
      title: 'Needs review',
      detail: `Submitted ${formatShortDate(pendingReviewCheckIn.completedAt)}`,
      tone: 'signal' as const,
    };
  }

  if (latestCheckIn?.completedAt && latestCheckIn.coachReviewedAt) {
    return {
      title: 'Reviewed',
      detail: `Last review ${formatShortDate(latestCheckIn.coachReviewedAt)}`,
      tone: 'default' as const,
    };
  }

  if (latestCheckIn?.completedAt) {
    return {
      title: 'Submitted',
      detail: `Last check-in ${formatShortDate(latestCheckIn.completedAt)}`,
      tone: 'default' as const,
    };
  }

  return {
    title: 'No check-ins',
    detail: 'No submitted check-ins yet.',
    tone: 'muted' as const,
  };
}

function metricValue(metric: Metric | null, key: 'weight' | 'sleepMins' | 'steps', bodyweightUnit: BodyweightUnit) {
  if (!metric) return '—';
  if (key === 'weight') {
    const converted = kgToBodyweightDisplay(metric.weight ?? null, bodyweightUnit);
    return converted == null ? '—' : `${converted.toFixed(1)} ${bodyweightUnit}`;
  }
  if (key === 'sleepMins') {
    return metric.sleepMins == null ? '—' : `${(metric.sleepMins / 60).toFixed(1)} h`;
  }
  return metric.steps == null ? '—' : metric.steps.toLocaleString();
}

function blockSummary(activeBlock: PrismaEvent | null, today: Date) {
  if (!activeBlock) return null;
  const end = new Date(activeBlock.endDate);
  end.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  return {
    name: activeBlock.name,
    detail: days === 0 ? 'Block ends today' : days === 1 ? 'Block ends tomorrow' : `${days} days left in block`,
  };
}

export function SignalClientOverview({
  clientId,
  clientName,
  activePlanData,
  latestMetric,
  activeBlock,
  latestCheckIn,
  pendingReviewCheckIn,
  targetsSummary,
  coachClientNotes,
  bodyweightUnit,
  today,
}: Props) {
  const activePlan = activePlanData?.activePlan ?? null;
  const weekSnapshot = activeWeekSummary(activePlanData);
  const checkInSnapshot = checkInSummary(latestCheckIn, pendingReviewCheckIn);
  const block = blockSummary(activeBlock, today);
  const displayName = clientName ?? 'Client';

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
        @media (min-width: 960px) {
          [data-signal-client-overview-grid] {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          [data-signal-client-metrics] {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>

      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>Clients / Overview</span>
        <span>{formatHeaderDate(today)}</span>
      </div>

      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 30, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 8 }}>
        {displayName}
      </div>

      <div style={{ fontSize: 14, color: palette.inkMid, marginBottom: 14 }}>
        {activePlan ? `${activePlan.name} active` : 'No active plan assigned'}
      </div>

      {pendingReviewCheckIn?.id && (
        <Link
          href={`/user/coach/clients/${clientId}/check-ins/${pendingReviewCheckIn.id}`}
          style={{
            display: 'block',
            textDecoration: 'none',
            color: palette.ink,
            background: palette.surface,
            border: `1px solid ${signalTokens.signal.deep}`,
            borderRadius: signalTokens.radii.cardLarge,
            padding: '16px 18px',
            marginBottom: 14,
          }}
        >
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.deep, marginBottom: 6 }}>
            Pending check-in
          </div>
          <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 6 }}>
            Review week of {formatShortDate(pendingReviewCheckIn.weekStartDate)}
          </div>
          <div style={{ fontSize: 14, color: palette.inkMid }}>
            Submitted {formatShortDate(pendingReviewCheckIn.completedAt ?? pendingReviewCheckIn.weekStartDate)}. Open the review surface.
          </div>
        </Link>
      )}

      <div data-signal-client-overview-grid style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
        <SnapshotCard
          label="Plan"
          title={activePlan?.name ?? 'No active plan'}
          detail={
            block
              ? block.detail
              : activePlan
                ? `${activePlan.weeks.length} week block`
                : 'Assign a plan to start coaching.'
          }
        />
        <SnapshotCard label="This week" title={weekSnapshot.title} detail={weekSnapshot.detail} />
        <SnapshotCard
          label="Check-in"
          title={checkInSnapshot.title}
          detail={checkInSnapshot.detail}
          accent={checkInSnapshot.tone === 'signal'}
          muted={checkInSnapshot.tone === 'muted'}
        />
      </div>

      <section
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          padding: '18px',
        }}
      >
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 8 }}>
          Latest metrics
        </div>
        <div data-signal-client-metrics style={{ display: 'grid', gap: 8 }}>
          <MetricStrip label="Weight" value={metricValue(latestMetric, 'weight', bodyweightUnit)} />
          <MetricStrip label="Sleep" value={metricValue(latestMetric, 'sleepMins', bodyweightUnit)} />
          <MetricStrip label="Steps" value={metricValue(latestMetric, 'steps', bodyweightUnit)} />
        </div>
      </section>

      {block && (
        <section
          style={{
            background: palette.surfaceAlt,
            border: `1px solid ${palette.border}`,
            borderRadius: signalTokens.radii.cardLarge,
            padding: '16px 18px',
            marginTop: 14,
          }}
        >
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
            Active block
          </div>
          <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 4 }}>
            {block.name}
          </div>
          <div style={{ fontSize: 14, color: palette.inkMid }}>{block.detail}</div>
        </section>
      )}

      <section
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          padding: '18px',
          marginTop: 14,
        }}
      >
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 8 }}>
          Targets
        </div>
        {targetsSummary ? (
          <div data-signal-client-metrics style={{ display: 'grid', gap: 8 }}>
            <MetricStrip label="Calories" value={targetsSummary.caloriesTarget != null ? `${targetsSummary.caloriesTarget} kcal` : '—'} />
            <MetricStrip label="Protein" value={targetsSummary.proteinTarget != null ? `${targetsSummary.proteinTarget} g` : '—'} />
            <MetricStrip label="Steps" value={targetsSummary.stepsTarget != null ? targetsSummary.stepsTarget.toLocaleString() : '—'} />
            <MetricStrip label="Sleep" value={targetsSummary.sleepMinsTarget != null ? `${(targetsSummary.sleepMinsTarget / 60).toFixed(1)} h` : '—'} />
          </div>
        ) : (
          <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5 }}>
            No targets set. Set targets on the{' '}
            <Link href={`/user/coach/clients/${clientId}/nutrition`} style={{ color: signalTokens.signal.deep, textDecoration: 'none' }}>
              nutrition tab
            </Link>.
          </div>
        )}
      </section>

      <CoachNotesPanel clientId={clientId} initialNotes={coachClientNotes} />
    </div>
  );
}

function SnapshotCard({
  label,
  title,
  detail,
  accent = false,
  muted = false,
}: {
  label: string;
  title: string;
  detail: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <section
      style={{
        background: palette.surface,
        border: `1px solid ${accent ? signalTokens.signal.deep : palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        padding: '16px 18px',
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: accent ? signalTokens.signal.deep : palette.inkLight, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: muted ? palette.inkLight : palette.inkMid }}>
        {detail}
      </div>
    </section>
  );
}

function MetricStrip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.card,
        background: palette.surfaceAlt,
        padding: '14px 16px',
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
