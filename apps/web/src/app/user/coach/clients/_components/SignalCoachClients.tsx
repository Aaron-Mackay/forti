import Link from 'next/link';
import type { CoachClientHealthSummary } from '@lib/coachService';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';

type Props = {
  coachName: string | null | undefined;
  clients: CoachClientHealthSummary[];
};

const palette = signalTokens.surface.planning;

function formatDate(date: Date | null): string {
  if (!date) return 'No recent activity';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function reviewLabel(client: CoachClientHealthSummary): string {
  if (client.latestCoachReviewStatus === 'reviewed') {
    return client.latestCoachReviewAt
      ? `Reviewed ${formatDate(client.latestCoachReviewAt)}`
      : 'Reviewed';
  }
  if (client.latestCoachReviewStatus === 'awaiting_review') return 'Needs review';
  return 'No check-ins yet';
}

function rosterSummary(clients: CoachClientHealthSummary[]) {
  return {
    awaitingReview: clients.filter(client => client.latestCoachReviewStatus === 'awaiting_review').length,
    submitted: clients.filter(client => client.currentWeekCheckInStatus === 'submitted').length,
    flagged: clients.filter(client => client.riskFlags.length > 0).length,
  };
}

export function SignalCoachClients({ coachName, clients }: Props) {
  const firstName = coachName?.split(' ')[0] ?? 'Coach';
  const summary = rosterSummary(clients);

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
          [data-signal-coach-clients-grid] {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>

      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <span>Client roster</span>
        <span>{clients.length} active links</span>
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
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: summary.awaitingReview > 0 ? signalTokens.signal.deep : palette.inkLight, marginBottom: 6 }}>
          Coach Clients
        </div>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 10 }}>
          {clients.length > 0 ? `${clients.length} clients in motion` : 'Roster empty'}
        </div>
        <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, maxWidth: 620 }}>
          {clients.length > 0
            ? `${summary.awaitingReview} client${summary.awaitingReview === 1 ? '' : 's'} need review, ${summary.submitted} submitted this week, and ${summary.flagged} show follow-up risk cues.`
            : 'No clients are linked yet. Share your coach code from Settings to bring someone into the roster.'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 18 }}>
          <MetricPill label="Needs review" value={summary.awaitingReview} />
          <MetricPill label="Submitted" value={summary.submitted} />
          <MetricPill label="Flagged" value={summary.flagged} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          <ActionLink href="/user/coach" label="Open coach home" />
        </div>
      </section>

      {clients.length === 0 ? (
        <section
          style={{
            marginTop: 18,
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            borderRadius: signalTokens.radii.cardLarge,
            padding: '22px 20px',
          }}
        >
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
            Empty state
          </div>
          <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1.05, marginBottom: 8 }}>
            No clients yet
          </div>
          <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5 }}>
            Share your invite code from Settings to start building a roster.
          </div>
        </section>
      ) : (
        <div data-signal-coach-clients-grid style={{ display: 'grid', gap: 14, marginTop: 18 }}>
          {clients.map(client => (
            <section
              key={client.clientId}
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: signalTokens.radii.cardLarge,
                padding: '18px 18px 16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 4 }}>
                    {client.clientName ?? client.clientId}
                  </div>
                  <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
                    {client.activePlan?.name ?? 'No active plan'}
                  </div>
                </div>
                <StateTag tone={client.latestCoachReviewStatus === 'awaiting_review' ? 'signal' : 'muted'}>
                  {reviewLabel(client)}
                </StateTag>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
                <DetailTile label="Last workout" value={formatDate(client.lastWorkoutDate)} />
                <DetailTile label="Last metric" value={formatDate(client.lastMetricEntryDate)} />
                <DetailTile
                  label="Check-in"
                  value={client.currentWeekCheckInStatus === 'submitted' ? 'Submitted' : 'Pending'}
                />
                <DetailTile
                  label="Unread"
                  value={`${client.unreadClientNotifications} notification${client.unreadClientNotifications === 1 ? '' : 's'}`}
                />
              </div>

              {client.riskFlags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {client.riskFlags.map(flag => (
                    <StateTag key={flag} tone="urgent">{flag}</StateTag>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <ActionLink href={`/user/coach/clients/${client.clientId}`} label="Open overview" />
                <ActionLink
                  href={client.pendingCheckInId
                    ? `/user/coach/clients/${client.clientId}/check-ins/${client.pendingCheckInId}`
                    : `/user/coach/clients/${client.clientId}/check-ins`}
                  label="Check-ins"
                  secondary
                />
                <ActionLink href={`/user/coach/clients/${client.clientId}/plans`} label="Plans" secondary />
              </div>
            </section>
          ))}
        </div>
      )}
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

function DetailTile({ label, value }: { label: string; value: string }) {
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
      <div style={{ fontSize: 14, color: palette.ink }}>{value}</div>
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

function StateTag({
  children,
  tone,
}: {
  children: string;
  tone: 'muted' | 'signal' | 'urgent';
}) {
  const color = tone === 'signal' ? signalTokens.signal.deep : tone === 'urgent' ? signalTokens.status.urgent : palette.inkLight;
  const background = tone === 'signal' ? signalTokens.signal.dim : tone === 'urgent' ? 'rgba(177, 74, 53, 0.12)' : palette.surfaceAlt;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 30,
        padding: '0 10px',
        borderRadius: 999,
        fontFamily: signalTokens.fontVar.mono,
        fontSize: 11,
        color,
        background,
        border: `1px solid ${tone === 'urgent' ? 'rgba(177, 74, 53, 0.28)' : palette.border}`,
      }}
    >
      {children}
    </span>
  );
}
