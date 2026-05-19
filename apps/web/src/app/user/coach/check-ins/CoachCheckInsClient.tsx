'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useRouter } from 'next/navigation';
import type { CheckInWithUser } from '@/types/checkInTypes';
import CoachCheckInListItem from './CoachCheckInListItem';
import { listCoachCheckIns } from '@lib/clientApi';
import type { CoachClient } from '@lib/contracts/coach';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';
import { SignalButton } from '@/components/signal/SignalButton';

export default function CoachCheckInsClient({
  lockedClientId,
  signalEnabled = false,
}: {
  lockedClientId?: string;
  signalEnabled?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<0 | 1>(lockedClientId ? 1 : 0); // default Browse when locked to a client
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [newCheckIns, setNewCheckIns] = useState<CheckInWithUser[]>([]);
  const [browseCheckIns, setBrowseCheckIns] = useState<CheckInWithUser[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseOffset, setBrowseOffset] = useState(0);
  const [filterClientId, setFilterClientId] = useState(lockedClientId ?? '');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNew = useCallback(async () => {
    const data = await listCoachCheckIns({ unread: true, limit: 20, offset: 0, clientId: lockedClientId });
    setNewCheckIns(data.checkIns);
    setClients(data.clients);
  }, [lockedClientId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchNew()
      .catch(() => setError('Failed to load client check-ins.'))
      .finally(() => setLoading(false));
  }, [fetchNew]);

  // Auto-run browse when locked to a specific client
  useEffect(() => {
    if (lockedClientId) {
      runBrowse(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedClientId]);

  async function runBrowse(offset: number, append = false) {
    setBrowseLoading(true);
    setError(null);
    try {
      const data = await listCoachCheckIns({
        limit: 20,
        offset,
        clientId: filterClientId || undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
      });
      if (append) {
        setBrowseCheckIns(prev => [...prev, ...data.checkIns]);
      } else {
        setBrowseCheckIns(data.checkIns);
        setBrowseOffset(0);
      }
      setBrowseTotal(data.total);
      setBrowseOffset(offset);
    } catch {
      setError('Failed to load check-ins.');
    } finally {
      setBrowseLoading(false);
    }
  }

  function getCheckInHref(checkIn: CheckInWithUser) {
    return lockedClientId
      ? `/user/coach/clients/${lockedClientId}/check-ins/${checkIn.id}`
      : `/user/coach/check-ins/${checkIn.id}`;
  }

  const browseHasRun = browseLoading || browseCheckIns.length > 0 || browseTotal > 0;

  if (signalEnabled) {
    return (
      <SignalCoachCheckIns
        lockedClientId={lockedClientId}
        tab={tab}
        setTab={setTab}
        loading={loading}
        newCheckIns={newCheckIns}
        clients={clients}
        error={error}
        setError={setError}
        browseLoading={browseLoading}
        browseCheckIns={browseCheckIns}
        browseTotal={browseTotal}
        browseHasRun={browseHasRun}
        filterClientId={filterClientId}
        setFilterClientId={setFilterClientId}
        filterFrom={filterFrom}
        setFilterFrom={setFilterFrom}
        filterTo={filterTo}
        setFilterTo={setFilterTo}
        runBrowse={runBrowse}
        getCheckInHref={getCheckInHref}
        onConfigure={() => router.push('/user/coach/check-in-template')}
      />
    );
  }

  return (
    <Box sx={{ pt: 2, pb: 6, maxWidth: 1040, mx: 'auto' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v as 0 | 1)} sx={{ flex: 1 }}>
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                New
                {!loading && newCheckIns.length > 0 && (
                  <Chip label={newCheckIns.length} size="small" color="warning" />
                )}
              </Box>
            }
          />
          <Tab label="Browse" />
        </Tabs>
        {!lockedClientId && (
          <Button
            size="small"
            startIcon={<EditNoteIcon />}
            onClick={() => router.push('/user/coach/check-in-template')}
            sx={{ ml: 1, flexShrink: 0 }}
          >
            Configure
          </Button>
        )}
      </Box>

      {/* ── New tab ── */}
      {tab === 0 && (
        <>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[0, 1, 2].map(i => <Skeleton key={i} variant="rounded" height={52} />)}
            </Box>
          ) : newCheckIns.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No new unreviewed check-ins.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {newCheckIns.map(c => (
                <CoachCheckInListItem key={c.id} checkIn={c} href={getCheckInHref(c)} />
              ))}
            </Box>
          )}
        </>
      )}

      {/* ── Browse tab ── */}
      {tab === 1 && (
        <>
          {/* Filters */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              mb: 2,
              gridTemplateColumns: { xs: '1fr', md: lockedClientId ? 'repeat(3, minmax(0, 1fr))' : 'minmax(220px, 1fr) repeat(3, minmax(0, 1fr))' },
              alignItems: 'start',
            }}
          >
            {!lockedClientId && (
              <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
                <InputLabel>Client</InputLabel>
                <Select
                  value={filterClientId}
                  label="Client"
                  onChange={e => setFilterClientId(e.target.value)}
                >
                  <MenuItem value="">All clients</MenuItem>
                  {clients.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField
              label="From"
              type="date"
              size="small"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 0 }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 0 }}
            />
            <Button
              variant="outlined"
              onClick={() => runBrowse(0)}
              disabled={browseLoading}
              sx={{ minHeight: 40 }}
            >
              {browseLoading ? <CircularProgress size={18} /> : 'Search'}
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {browseLoading && browseCheckIns.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[0, 1, 2].map(i => <Skeleton key={i} variant="rounded" height={52} />)}
            </Box>
          ) : browseCheckIns.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Use the filters above and tap Search.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {browseCheckIns.map(c => (
                <CoachCheckInListItem key={c.id} checkIn={c} href={getCheckInHref(c)} />
              ))}
              {browseCheckIns.length < browseTotal && (
                <Button
                  variant="text"
                  onClick={() => runBrowse(browseOffset + 20, true)}
                  disabled={browseLoading}
                >
                  Load more
                </Button>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

const palette = signalTokens.surface.planning;

function SignalCoachCheckIns({
  lockedClientId,
  tab,
  setTab,
  loading,
  newCheckIns,
  clients,
  error,
  setError,
  browseLoading,
  browseCheckIns,
  browseTotal,
  browseHasRun,
  filterClientId,
  setFilterClientId,
  filterFrom,
  setFilterFrom,
  filterTo,
  setFilterTo,
  runBrowse,
  getCheckInHref,
  onConfigure,
}: {
  lockedClientId?: string;
  tab: 0 | 1;
  setTab: (value: 0 | 1) => void;
  loading: boolean;
  newCheckIns: CheckInWithUser[];
  clients: CoachClient[];
  error: string | null;
  setError: (value: string | null) => void;
  browseLoading: boolean;
  browseCheckIns: CheckInWithUser[];
  browseTotal: number;
  browseHasRun: boolean;
  filterClientId: string;
  setFilterClientId: (value: string) => void;
  filterFrom: string;
  setFilterFrom: (value: string) => void;
  filterTo: string;
  setFilterTo: (value: string) => void;
  runBrowse: (offset: number, append?: boolean) => Promise<void>;
  getCheckInHref: (checkIn: CheckInWithUser) => string;
  onConfigure: () => void;
}) {
  const browseLabel = browseHasRun ? `${browseTotal} in archive` : 'Archive ready';

  return (
    <div
      className={signalFontVariablesClassName}
      style={{
        minHeight: '100%',
        background: palette.bg,
        color: palette.ink,
        fontFamily: signalTokens.fontVar.body,
        padding: '14px 0 28px',
        maxWidth: 1080,
        margin: '0 auto',
      }}
    >
      <style>{`
        @media (min-width: 960px) {
          [data-signal-checkins-grid] {
            grid-template-columns: minmax(260px, 0.7fr) minmax(0, 1.3fr);
          }
          [data-signal-checkins-filters] {
            grid-template-columns: ${lockedClientId ? 'repeat(3, minmax(0, 1fr))' : 'minmax(180px, 1fr) repeat(3, minmax(0, 1fr))'};
          }
        }
      `}</style>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <span>{lockedClientId ? 'Client review lane' : 'Coach review desk'}</span>
        <span>{newCheckIns.length} waiting now</span>
      </div>

      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', color: palette.inkMid, marginBottom: 12 }}>
        Check-ins desk
      </div>

      <section
        style={{
          background: palette.surface,
          border: `1px solid ${palette.borderStrong}`,
          borderRadius: signalTokens.radii.cardLarge,
          padding: '20px 20px 18px',
        }}
      >
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: newCheckIns.length > 0 ? signalTokens.signal.deep : palette.inkLight, marginBottom: 6 }}>
          Coach Check-ins
        </div>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 10 }}>
          {newCheckIns.length > 0 ? `${newCheckIns.length} waiting on review` : 'Queue clear'}
        </div>
        <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, maxWidth: 620 }}>
          {lockedClientId
            ? 'Review recent submissions for this client or search older weeks in the archive.'
            : 'New submissions stay at the top. Browse lets you reach older weeks, specific clients, and date windows.'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 18 }}>
          <SignalMetricPill label="Needs review" value={newCheckIns.length} />
          <SignalMetricPill label="Clients" value={lockedClientId ? 1 : clients.length} />
          <SignalMetricPill label="Archive" value={browseHasRun ? browseTotal : 0} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          {!lockedClientId && (
            <SignalActionButton onClick={onConfigure} label="Configure template" />
          )}
          <SignalLinkButton href="/user/coach" label="Open coach home" secondary />
        </div>
      </section>

      <div data-signal-checkins-grid style={{ display: 'grid', gap: 14, marginTop: 18 }}>
        <section
          style={{
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            borderRadius: signalTokens.radii.cardLarge,
            padding: '16px 16px 18px',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_event, value) => setTab(value as 0 | 1)}
            variant="fullWidth"
            sx={{
              minHeight: 0,
              '& .MuiTabs-indicator': {
                height: 2,
                backgroundColor: palette.ink,
              },
              '& .MuiTab-root': {
                minHeight: 0,
                px: 0.5,
                py: 1.25,
                textTransform: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: palette.inkLight,
              },
              '& .Mui-selected': {
                color: `${palette.ink} !important`,
              },
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  Needs review
                  {!loading && newCheckIns.length > 0 && (
                    <Chip
                      label={newCheckIns.length}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 11,
                        backgroundColor: signalTokens.signal.dim,
                        color: signalTokens.signal.deep,
                        border: `1px solid ${palette.border}`,
                      }}
                    />
                  )}
                </Box>
              }
            />
            <Tab label="Browse archive" />
          </Tabs>

          <div style={{ marginTop: 14 }}>
            {tab === 0 ? (
              loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[0, 1, 2].map(index => <Skeleton key={index} variant="rounded" height={84} />)}
                </Box>
              ) : newCheckIns.length === 0 ? (
                <SignalEmptyState
                  eyebrow="Needs review"
                  title="Nothing waiting"
                  body="No new unreviewed check-ins are sitting in the queue right now."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {newCheckIns.map(checkIn => (
                    <SignalCheckInRow key={checkIn.id} checkIn={checkIn} href={getCheckInHref(checkIn)} />
                  ))}
                </div>
              )
            ) : (
              <div>
                <div data-signal-checkins-filters style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                  {!lockedClientId && (
                    <FormControl size="small" fullWidth>
                      <InputLabel>Client</InputLabel>
                      <Select
                        value={filterClientId}
                        label="Client"
                        onChange={(event) => setFilterClientId(event.target.value)}
                      >
                        <MenuItem value="">All clients</MenuItem>
                        {clients.map(client => (
                          <MenuItem key={client.id} value={client.id}>{client.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  <TextField
                    label="From"
                    type="date"
                    size="small"
                    value={filterFrom}
                    onChange={(event) => setFilterFrom(event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label="To"
                    type="date"
                    size="small"
                    value={filterTo}
                    onChange={(event) => setFilterTo(event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <SignalButton
                    intent="outlined"
                    onClick={() => void runBrowse(0)}
                    disabled={browseLoading}
                    startIcon={browseLoading ? <CircularProgress size={14} /> : undefined}
                  >
                    {browseLoading ? 'Searching…' : 'Search'}
                  </SignalButton>
                </div>

                {browseLoading && browseCheckIns.length === 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[0, 1, 2].map(index => <Skeleton key={index} variant="rounded" height={84} />)}
                  </Box>
                ) : browseCheckIns.length === 0 ? (
                  <SignalEmptyState
                    eyebrow="Archive"
                    title={browseHasRun ? 'No results' : 'Archive ready'}
                    body={browseHasRun ? 'No check-ins matched the current filters.' : 'Set a date window or client filter, then run a search.'}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {browseCheckIns.map(checkIn => (
                      <SignalCheckInRow key={checkIn.id} checkIn={checkIn} href={getCheckInHref(checkIn)} />
                    ))}
                    {browseCheckIns.length < browseTotal && (
                      <SignalButton
                        intent="ghost"
                        onClick={() => void runBrowse(browseCheckIns.length, true)}
                        disabled={browseLoading}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        Load more
                      </SignalButton>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section
          style={{
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            borderRadius: signalTokens.radii.cardLarge,
            padding: '18px 16px',
          }}
        >
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 8 }}>
            Queue summary
          </div>
          <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 10 }}>
            {tab === 0 ? 'Needs review' : 'Browse archive'}
          </div>
          <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, marginBottom: 16 }}>
            {tab === 0
              ? 'Open a submission, send feedback, and keep the coach desk moving.'
              : 'Search older weeks when you need context before replying or planning the next block.'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SignalSummaryCard
              label="Waiting now"
              value={loading ? '…' : String(newCheckIns.length)}
              detail={loading ? 'Loading queue' : newCheckIns.length > 0 ? 'Unreviewed submissions' : 'No unreviewed submissions'}
            />
            <SignalSummaryCard
              label="Browse archive"
              value={browseLoading ? '…' : browseHasRun ? String(browseTotal) : '—'}
              detail={browseLabel}
            />
            <SignalSummaryCard
              label="Scope"
              value={lockedClientId ? 'Client' : 'All'}
              detail={lockedClientId ? 'Focused to this client' : `${clients.length} linked client${clients.length === 1 ? '' : 's'}`}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function SignalMetricPill({ label, value }: { label: string; value: number }) {
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

function SignalActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 40,
        padding: '0 14px',
        borderRadius: signalTokens.radii.card,
        fontSize: 14,
        fontWeight: 600,
        color: palette.bg,
        background: palette.ink,
        border: `1px solid ${palette.ink}`,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function SignalLinkButton({ href, label, secondary = false }: { href: string; label: string; secondary?: boolean }) {
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

function SignalCheckInRow({ checkIn, href }: { checkIn: CheckInWithUser; href: string }) {
  const isReviewed = Boolean(checkIn.coachReviewedAt);
  const weekLabel = new Date(checkIn.weekStartDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  const submittedLabel = new Date(checkIn.completedAt ?? checkIn.weekStartDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <Link
      href={href}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        textDecoration: 'none',
        color: palette.ink,
        padding: '14px 14px 13px',
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        background: palette.surfaceAlt,
      }}
    >
      <div>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 4 }}>
          {checkIn.user.name}
        </div>
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
          Week of {weekLabel}
        </div>
        <div style={{ fontSize: 14, color: palette.inkMid }}>
          Submitted {submittedLabel}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 28,
            padding: '0 10px',
            borderRadius: 999,
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 11,
            color: isReviewed ? signalTokens.status.ok : signalTokens.signal.deep,
            background: isReviewed ? 'rgba(90, 140, 79, 0.08)' : signalTokens.signal.dim,
            border: `1px solid ${palette.border}`,
          }}
        >
          {isReviewed ? 'Reviewed' : 'Needs review'}
        </span>
        <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: isReviewed ? palette.inkLight : signalTokens.signal.deep }}>
          Open
        </span>
      </div>
    </Link>
  );
}

function SignalSummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.card,
        padding: '12px 12px 11px',
        background: palette.surfaceAlt,
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 13, color: palette.inkMid, lineHeight: 1.4 }}>{detail}</div>
    </div>
  );
}

function SignalEmptyState({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        padding: '18px 16px',
        background: palette.surfaceAlt,
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>{eyebrow}</div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}
