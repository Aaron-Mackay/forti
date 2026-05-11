'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardChart from '@/app/user/(dashboard)/DashboardChart';
import E1rmProgressCard from '@/app/user/(dashboard)/E1rmProgressCard';
import { ExerciseBrowseSheet } from './ExerciseBrowseSheet';
import { EventType } from '@/generated/prisma/browser';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';
import type { MetricPrisma, EventPrisma } from '@/types/dataTypes';
import type { Settings } from '@/types/settingsTypes';
import type { ActivePlanWithStats } from '@lib/userService';
import { kgToBodyweightDisplay } from '@/lib/units';

type Props = {
  userName: string | null | undefined;
  metrics: MetricPrisma[];
  events: EventPrisma[];
  activePlanData: ActivePlanWithStats | null;
  settings: Settings;
  today: Date;
};

const palette = signalTokens.surface.planning;

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function latestWeight(metrics: MetricPrisma[], settings: Settings): string {
  const latest = [...metrics].reverse().find((metric) => metric.weight != null)?.weight ?? null;
  if (latest == null) return 'No entries';
  const converted = kgToBodyweightDisplay(latest, settings.bodyweightUnit);
  if (converted == null) return 'No entries';
  return `${converted.toFixed(1)} ${settings.bodyweightUnit}`;
}

function weightTrend(metrics: MetricPrisma[], settings: Settings): string {
  const weightPoints = metrics.filter((metric) => metric.weight != null);
  if (weightPoints.length < 2) return 'Need more weigh-ins';
  const recent = weightPoints.slice(-7);
  const start = recent[0]?.weight ?? null;
  const end = recent[recent.length - 1]?.weight ?? null;
  if (start == null || end == null) return 'Need more weigh-ins';
  const delta = kgToBodyweightDisplay(end - start, settings.bodyweightUnit);
  if (delta == null) return 'Need more weigh-ins';
  if (Math.abs(delta) < 0.05) return 'Holding steady';
  const direction = delta > 0 ? '+' : '';
  return `${direction}${delta.toFixed(1)} ${settings.bodyweightUnit} over recent entries`;
}

function activeBlock(events: EventPrisma[], today: Date): { name: string; daysRemaining: number } | null {
  const match = events.find((event) => {
    if (event.eventType !== EventType.BlockEvent) return false;
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return start <= today && end >= today;
  });

  if (!match) return null;
  const end = new Date(match.endDate);
  end.setHours(0, 0, 0, 0);
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { name: match.name, daysRemaining };
}

function cardNoteForBlock(block: { name: string; daysRemaining: number } | null): string {
  if (!block) return 'No active block on the calendar.';
  if (block.daysRemaining <= 0) return 'Block ends today.';
  if (block.daysRemaining === 1) return 'Block ends tomorrow.';
  return `${block.daysRemaining} days remaining.`;
}

function StatCell({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div
      style={{
        background: palette.surfaceAlt,
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.card,
        padding: '12px 14px',
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 26, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.01em' }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: palette.inkMid, lineHeight: 1.5, marginTop: 8 }}>
        {note}
      </div>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  action,
  onDismiss,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        padding: '18px 18px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          {eyebrow}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Hide panel"
            style={{
              appearance: 'none',
              background: 'none',
              border: 'none',
              padding: '2px 6px',
              cursor: 'pointer',
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 11,
              color: palette.inkLight,
              borderRadius: signalTokens.radii.card,
            }}
          >
            hide
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 28, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.015em' }}>
          {title}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function HiddenPanelNotice({ label }: { label: string }) {
  return (
    <div
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
        {label} panel hidden
      </span>
      <Link
        href="/user/settings"
        style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.deep, textDecoration: 'none' }}
      >
        Re-enable in Settings →
      </Link>
    </div>
  );
}

export function SignalProgress({ userName, metrics, events, activePlanData, settings, today }: Props) {
  const firstName = userName?.split(' ')[0] ?? 'You';
  const blockEvents = events.filter((event) => event.eventType === EventType.BlockEvent);
  const currentBlock = activeBlock(events, today);

  const [metricsVisible, setMetricsVisible] = useState(true);
  const [strengthVisible, setStrengthVisible] = useState(true);
  const [browseOpen, setBrowseOpen] = useState(false);

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
          [data-signal-progress-grid] {
            grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
          }
        }
      `}</style>

      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <span>{formatDateHeader(today)}</span>
        <span>{metrics.length} metric entries logged</span>
      </div>

      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', color: palette.inkMid, marginBottom: 12 }}>
        {firstName}
      </div>

      <section
        style={{
          background: palette.surface,
          border: `1px solid ${palette.borderStrong}`,
          borderRadius: signalTokens.radii.cardLarge,
          padding: '20px 20px 18px',
        }}
      >
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.deep, marginBottom: 6 }}>
          Progress
        </div>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 10 }}>
          Review your trend lines
        </div>
        <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, maxWidth: 680 }}>
          Daily metrics and tracked lifting history now have a dedicated route instead of living only on the dashboard.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 18 }}>
          <StatCell label="Latest weight" value={latestWeight(metrics, settings)} note={weightTrend(metrics, settings)} />
          <StatCell
            label="Training this week"
            value={String(activePlanData?.weeklyTrainingCount ?? 0)}
            note={currentBlock ? `${currentBlock.name}. ${cardNoteForBlock(currentBlock)}` : 'No active block on the calendar.'}
          />
          <StatCell
            label="Focus exercises"
            value={String(settings.trackedE1rmExercises.length)}
            note={settings.trackedE1rmExercises.length > 0 ? 'Using the current tracked-exercise setting.' : 'Add tracked lifts in settings.'}
          />
          <StatCell
            label="Chart status"
            value={settings.showMetricsChart ? 'Live' : 'Hidden'}
            note={settings.showMetricsChart ? 'Weight, calories, and steps stay on the shared chart component.' : 'Turn metrics charts back on in settings.'}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          <Link
            href="/user/settings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 40,
              padding: '0 14px',
              borderRadius: signalTokens.radii.card,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: palette.bg,
              background: palette.ink,
              border: `1px solid ${palette.ink}`,
            }}
          >
            Edit focus exercises
          </Link>
          <Link
            href="/user"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 40,
              padding: '0 14px',
              borderRadius: signalTokens.radii.card,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: palette.ink,
              background: palette.surfaceAlt,
              border: `1px solid ${palette.border}`,
            }}
          >
            Back to home
          </Link>
        </div>
      </section>

      <div data-signal-progress-grid style={{ display: 'grid', gap: 14, marginTop: 18 }}>
        {metricsVisible ? (
          <Panel
            eyebrow="Metrics"
            title="Bodyweight, calories, and steps"
            onDismiss={() => setMetricsVisible(false)}
          >
            {settings.showMetricsChart && metrics.length > 0 ? (
              <div style={{ background: palette.bg, borderRadius: signalTokens.radii.card, padding: 12 }}>
                <DashboardChart
                  metrics={metrics}
                  blocks={blockEvents}
                  bodyweightUnit={settings.bodyweightUnit}
                />
              </div>
            ) : (
              <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.6 }}>
                No chart to show yet. Log daily metrics or re-enable charts in settings.
              </div>
            )}
          </Panel>
        ) : (
          <HiddenPanelNotice label="Metrics" />
        )}

        {strengthVisible ? (
          <Panel
            eyebrow="Strength"
            title="Focus exercises"
            action={
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setBrowseOpen(true)}
                  style={{ appearance: 'none', background: 'none', border: 'none', cursor: 'pointer', fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.deep, padding: 0, whiteSpace: 'nowrap' }}
                >
                  Browse all →
                </button>
                <Link
                  href="/user/settings"
                  style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  Edit in Settings →
                </Link>
              </div>
            }
            onDismiss={() => setStrengthVisible(false)}
          >
            {settings.showE1rmProgress && settings.trackedE1rmExercises.length > 0 ? (
              <div style={{ background: palette.bg, borderRadius: signalTokens.radii.card, padding: 12 }}>
                <E1rmProgressCard
                  exercises={settings.trackedE1rmExercises}
                  weightUnit={settings.weightUnit}
                />
              </div>
            ) : (
              <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.6 }}>
                Add up to five tracked lifts in <Link href="/user/settings">settings</Link> to surface e1RM history here.
              </div>
            )}
          </Panel>
        ) : (
          <HiddenPanelNotice label="Strength" />
        )}
      </div>

      <ExerciseBrowseSheet
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        weightUnit={settings.weightUnit}
      />
    </div>
  );
}
