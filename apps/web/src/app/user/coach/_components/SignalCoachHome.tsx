import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CoachHomeData } from '@lib/coachService';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';

type Props = {
  coachName: string | null | undefined;
  data: CoachHomeData;
  today: Date;
};

const palette = signalTokens.surface.planning;

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function daysAgoLabel(date: Date, today: Date): string {
  const msPerDay = 24 * 60 * 60 * 1000;
  const todayAtStart = new Date(today);
  todayAtStart.setHours(0, 0, 0, 0);
  const dateAtStart = new Date(date);
  dateAtStart.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((todayAtStart.getTime() - dateAtStart.getTime()) / msPerDay));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function blockEndsLabel(daysUntilBlockEnd: number | null): string {
  if (daysUntilBlockEnd == null) return 'Block end needs review';
  if (daysUntilBlockEnd <= 0) return 'Block ends today';
  if (daysUntilBlockEnd === 1) return 'Block ends tomorrow';
  return `Block ends in ${daysUntilBlockEnd} days`;
}

function stalePlanLabel(staleDays: number | null, lastPlanActivityDate: Date | null): string {
  if (!lastPlanActivityDate) return 'Plan has never been edited';
  if (staleDays == null) return 'Plan activity needs review';
  return `Last plan edit ${staleDays} days ago`;
}

export function SignalCoachHome({ coachName, data, today }: Props) {
  const firstName = coachName?.split(' ')[0] ?? 'Coach';
  const totalTasks = data.summary.submittedCheckInCount + data.summary.maintenanceCount;

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
          [data-signal-coach-home-grid] {
            grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
          }
        }
      `}</style>

      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <span>{formatDateHeader(today)}</span>
        <span>{data.summary.clientCount} clients live</span>
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
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: totalTasks > 0 ? signalTokens.signal.deep : palette.inkLight, marginBottom: 6 }}>
          Coach Home
        </div>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 10 }}>
          {totalTasks > 0 ? `${totalTasks} open tasks` : 'Desk clear'}
        </div>
        <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, maxWidth: 620 }}>
          {totalTasks > 0
            ? `${data.summary.submittedCheckInCount} submitted check-in${data.summary.submittedCheckInCount === 1 ? '' : 's'} waiting on review and ${data.summary.maintenanceCount} plan follow-up${data.summary.maintenanceCount === 1 ? '' : 's'}.`
            : 'No submitted check-ins or plan-maintenance prompts right now.'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 18 }}>
          <MetricPill label="Review" value={data.summary.submittedCheckInCount} />
          <MetricPill label="Maintenance" value={data.summary.maintenanceCount} />
          <MetricPill label="Clients" value={data.summary.clientCount} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          <ActionLink href="/user/coach/check-ins" label="Open check-ins" />
          <ActionLink href="/user/coach/clients" label="View clients" secondary />
        </div>
      </section>

      <div data-signal-coach-home-grid style={{ display: 'grid', gap: 14, marginTop: 18 }}>
        <TaskPanel
          eyebrow="Submitted"
          title="Check-ins waiting on you"
          emptyLabel="Nothing is waiting for review."
          footerHref="/user/coach/check-ins"
          footerLabel="Browse all check-ins"
          items={data.submittedCheckIns.map(item => (
            <Link
              key={item.checkInId}
              href={`/user/coach/check-ins/${item.checkInId}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                textDecoration: 'none',
                color: palette.ink,
                padding: '14px 0',
                borderTop: `1px solid ${palette.border}`,
              }}
            >
              <div>
                <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 4 }}>
                  {item.clientName ?? 'Client'}
                </div>
                <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
                  Week of {formatDate(item.weekStartDate)}
                </div>
                <div style={{ fontSize: 14, color: palette.inkMid }}>
                  Submitted {daysAgoLabel(item.completedAt, new Date(today))}
                </div>
              </div>
              <div style={{ alignSelf: 'center', fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: signalTokens.signal.deep }}>
                Review
              </div>
            </Link>
          ))}
        />

        <TaskPanel
          eyebrow="Maintenance"
          title="Plans that need a touch"
          emptyLabel="All active plans look current."
          footerHref="/user/coach/clients"
          footerLabel="Open client list"
          items={data.planMaintenance.map(item => (
            <Link
              key={`${item.clientId}-${item.kind}`}
              href={item.planId ? `/user/coach/clients/${item.clientId}/plans` : `/user/coach/clients/${item.clientId}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                textDecoration: 'none',
                color: palette.ink,
                padding: '14px 0',
                borderTop: `1px solid ${palette.border}`,
              }}
            >
              <div>
                <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 4 }}>
                  {item.clientName ?? 'Client'}
                </div>
                <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
                  {item.planName ?? 'No active plan'}
                </div>
                <div style={{ fontSize: 14, color: palette.inkMid }}>
                  {item.kind === 'block_ending'
                    ? blockEndsLabel(item.daysUntilBlockEnd)
                    : item.kind === 'plan_stale'
                      ? stalePlanLabel(item.staleDays, item.lastPlanActivityDate)
                      : 'No active plan assigned'}
                </div>
              </div>
              <div style={{ alignSelf: 'center', fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: item.kind === 'no_active_plan' ? signalTokens.status.urgent : palette.inkLight }}>
                {item.kind === 'block_ending' ? 'Refresh' : item.kind === 'plan_stale' ? 'Edit' : 'Assign'}
              </div>
            </Link>
          ))}
        />
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.card,
        padding: '10px 12px',
        background: palette.surfaceAlt,
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function ActionLink({ href, label, secondary = false }: { href: string; label: string; secondary?: boolean }) {
  return (
    <Link
      href={href}
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
        color: secondary ? palette.ink : palette.bg,
        background: secondary ? palette.surfaceAlt : palette.ink,
        border: `1px solid ${secondary ? palette.border : palette.ink}`,
      }}
    >
      {label}
    </Link>
  );
}

function TaskPanel({
  eyebrow,
  title,
  emptyLabel,
  footerHref,
  footerLabel,
  items,
}: {
  eyebrow: string;
  title: string;
  emptyLabel: string;
  footerHref: string;
  footerLabel: string;
  items: ReactNode[];
}) {
  return (
    <section
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        padding: '18px 18px 6px',
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>{eyebrow}</div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 4 }}>
        {title}
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 14, color: palette.inkMid, padding: '18px 0 16px' }}>{emptyLabel}</div>
      ) : (
        items
      )}
      <Link
        href={footerHref}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '10px 0 12px',
          textDecoration: 'none',
          color: palette.ink,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {footerLabel}
      </Link>
    </section>
  );
}
