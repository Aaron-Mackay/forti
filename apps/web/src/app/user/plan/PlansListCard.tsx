'use client';

import { useEffect, useMemo, useState, useTransition, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  Card,
  CardHeader,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { fetchJson } from '@lib/fetchWrapper';
import { setActivePlan } from '@lib/clientApi';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';
import { DeletePlanModal } from './DeletePlanModal';

export type PlanListItem = {
  id: number;
  name: string;
  order: number;
  weekCount: number;
  lastActivityDate: Date | string | null;
  isActive: boolean;
  daysPerWeek?: number;
  weeksDone?: number;
  isCompleted?: boolean;
  nextWorkoutId?: number | null;
  nextWorkoutName?: string | null;
  activeWeekOrder?: number | null;
};

type PlanFilter = 'all' | 'active' | 'inactive' | 'completed';
type PlanSort = 'lastActivity' | 'name' | 'weeksDone';

const palette = signalTokens.surface.planning;
const desktopBp = signalTokens.space.desktopBreakpointPx;

function formatLastActivity(value: Date | string | null, verbose = false) {
  if (!value) return verbose ? 'No activity yet' : '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return verbose ? 'No activity yet' : '—';
  const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return verbose ? `Last activity ${formatted}` : formatted;
}

function usePersistedState<T extends string>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored) setValue(stored as T);
  }, [key]);

  useEffect(() => {
    window.localStorage.setItem(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}

function isPlanCompleted(plan: PlanListItem) {
  return plan.isCompleted ?? (plan.weekCount > 0 && (plan.weeksDone ?? 0) >= plan.weekCount);
}

function filterPlans(plans: PlanListItem[], filter: PlanFilter) {
  if (filter === 'active') return plans.filter((plan) => plan.isActive);
  if (filter === 'inactive') return plans.filter((plan) => !plan.isActive && !isPlanCompleted(plan));
  if (filter === 'completed') return plans.filter(isPlanCompleted);
  return plans;
}

function sortPlans(plans: PlanListItem[], sort: PlanSort) {
  return [...plans].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'weeksDone') return (b.weeksDone ?? 0) - (a.weeksDone ?? 0) || a.order - b.order;
    const aTime = a.lastActivityDate ? new Date(a.lastActivityDate).getTime() : 0;
    const bTime = b.lastActivityDate ? new Date(b.lastActivityDate).getTime() : 0;
    return bTime - aTime || a.order - b.order;
  });
}

function statusForPlan(plan: PlanListItem) {
  if (plan.isActive) return 'ACTIVE';
  if (isPlanCompleted(plan)) return 'COMPLETED';
  return 'INACTIVE';
}

function StatusPill({ label }: { label: string }) {
  const active = label === 'ACTIVE';
  const completed = label === 'COMPLETED';
  return (
    <span
      style={{
        display: 'inline-flex',
        minWidth: 86,
        justifyContent: 'center',
        border: `1px solid ${active ? signalTokens.signal.deep : palette.border}`,
        borderRadius: signalTokens.radii.pill,
        background: active ? signalTokens.signal.dim : completed ? palette.surfaceAlt : 'transparent',
        color: active ? palette.ink : completed ? palette.inkMid : palette.inkLight,
        fontFamily: signalTokens.fontVar.mono,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        padding: '4px 7px',
      }}
    >
      {label}
    </span>
  );
}

export default function PlansListCard({
  title,
  emptyMessage,
  createHref,
  planHrefBase,
  plans,
  targetUserId,
  signalEnabled = false,
}: {
  title: string;
  emptyMessage: string;
  createHref: string;
  planHrefBase: string;
  plans: PlanListItem[];
  targetUserId?: string;
  signalEnabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [planItems, setPlanItems] = useState(plans);
  const [deleteTarget, setDeleteTarget] = useState<PlanListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
    undoPlanId?: number | null;
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    setPlanItems(plans);
  }, [plans]);

  const isCoach = Boolean(targetUserId);
  const [filter, setFilter] = usePersistedState<PlanFilter>(
    isCoach ? 'signal.plans.coach.filter' : 'signal.plans.filter',
    'all',
  );
  const [sort, setSort] = usePersistedState<PlanSort>(
    isCoach ? 'signal.plans.coach.sort' : 'signal.plans.sort',
    'lastActivity',
  );
  const filtered = useMemo(() => filterPlans(planItems, filter), [filter, planItems]);
  const sorted = useMemo(() => sortPlans(filtered, sort), [filtered, sort]);
  const activePlan = planItems.find((plan) => plan.isActive);
  const counts = {
    all: planItems.length,
    active: planItems.filter((plan) => plan.isActive).length,
    inactive: planItems.filter((plan) => !plan.isActive && !isPlanCompleted(plan)).length,
    completed: planItems.filter(isPlanCompleted).length,
  };

  async function handleSetActive(planId: number | null, planName?: string, undoPlanId?: number | null) {
    const previous = planItems;
    setPlanItems((currentPlans) =>
      currentPlans.map((plan) => ({
        ...plan,
        isActive: planId === null ? false : plan.id === planId,
      })),
    );

    try {
      await setActivePlan(planId, targetUserId);
      setSnackbar({
        open: true,
        message: planId === null ? 'Active plan cleared' : `Switched to "${planName ?? 'plan'}"`,
        severity: 'success',
        undoPlanId,
      });
      startTransition(() => router.refresh());
    } catch {
      setPlanItems(previous);
      setSnackbar({ open: true, message: 'Failed to update active plan', severity: 'error' });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteLoading(true);
    setDeleteTarget(null);
    setPlanItems((items) => items.filter((plan) => plan.id !== target.id));
    try {
      await fetchJson(`/api/plan/${target.id}`, { method: 'DELETE' });
      setSnackbar({ open: true, message: `"${target.name}" deleted`, severity: 'success' });
      startTransition(() => router.refresh());
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete plan', severity: 'error' });
      startTransition(() => router.refresh());
    } finally {
      setDeleteLoading(false);
    }
  }

  if (signalEnabled) {
    const previousActiveId = activePlan?.id ?? null;

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
          [data-plans-desktop] { display: none; }
          [data-plans-mobile] { display: grid; }
          @media (min-width: ${desktopBp}px) {
            [data-plans-shell] { max-width: 1080px; margin: 0 auto; padding: 24px 32px 28px; }
            [data-plans-header] { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
            [data-plans-desktop] { display: block; }
            [data-plans-mobile] { display: none; }
          }
        `}</style>

        <div data-plans-shell>
          <header data-plans-header style={{ marginBottom: 14 }}>
            <div>
              {isCoach ? (
                <Link
                  href="/user/coach/clients"
                  style={{
                    display: 'inline-flex',
                    marginBottom: 7,
                    color: palette.inkLight,
                    fontFamily: signalTokens.fontVar.mono,
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textDecoration: 'none',
                  }}
                >
                  &lt; CLIENTS
                </Link>
              ) : (
                <div
                  style={{
                    marginBottom: 7,
                    color: palette.inkLight,
                    fontFamily: signalTokens.fontVar.mono,
                    fontSize: 10,
                    letterSpacing: '0.14em',
                  }}
                >
                  MY TRAINING · PLANS
                </div>
              )}
              <h1 style={{ margin: 0, fontFamily: signalTokens.fontVar.cond, fontSize: 30, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.015em', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {title}
              </h1>
              <div style={{ marginTop: 8, fontSize: 12, color: palette.inkMid, lineHeight: 1.5 }}>
                {isCoach ? 'Manage client plans.' : 'One active at a time · pick another to switch.'}
              </div>
            </div>
            <ActionLink href={createHref} primary>
              {isCoach ? '+ Plan' : '+ New plan'}
            </ActionLink>
          </header>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              overflowX: 'auto',
              borderTop: `1px solid ${palette.border}`,
              borderBottom: `1px solid ${palette.border}`,
              padding: '10px 0',
              marginBottom: 14,
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 10,
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ display: 'flex', gap: 14 }}>
              {(['all', 'active', 'inactive', 'completed'] as const).map((nextFilter) => (
                <button
                  key={nextFilter}
                  type="button"
                  onClick={() => setFilter(nextFilter)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: filter === nextFilter ? palette.ink : palette.inkLight,
                    font: 'inherit',
                    fontWeight: filter === nextFilter ? 700 : 500,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {nextFilter.toUpperCase()} · {counts[nextFilter]}
                </button>
              ))}
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: palette.inkLight }}>
              SORT:
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as PlanSort)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: palette.ink,
                  fontFamily: signalTokens.fontVar.mono,
                  fontSize: 10,
                  letterSpacing: '0.08em',
                }}
              >
                <option value="lastActivity">LAST ACT</option>
                <option value="name">NAME</option>
                <option value="weeksDone">WEEKS DONE</option>
              </select>
            </label>
          </div>

          {planItems.length === 0 ? (
            <EmptyState emptyMessage={emptyMessage} createHref={createHref} />
          ) : (
            <>
              <div
                data-plans-desktop
                style={{
                  border: `1.5px solid ${palette.borderStrong}`,
                  borderRadius: signalTokens.radii.cardLarge,
                  background: palette.surface,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '20px 2.2fr 1fr 0.9fr 1.2fr 1fr 110px 140px',
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
                  <span />
                  <span>PLAN</span>
                  <span>SCHEDULE</span>
                  <span>WEEKS</span>
                  <span>NEXT</span>
                  <span>LAST</span>
                  <span>STATUS</span>
                  <span>ACTIONS</span>
                </div>
                {sorted.map((plan) => (
                  <PlanDesktopRow
                    key={plan.id}
                    plan={plan}
                    href={`${planHrefBase}/${plan.id}`}
                    onActivate={() => void handleSetActive(plan.id, plan.name, previousActiveId)}
                    onDelete={() => setDeleteTarget(plan)}
                    disabled={isPending}
                  />
                ))}
              </div>

              <div data-plans-mobile style={{ gap: 10 }}>
                {sorted.map((plan) => (
                  <PlanMobileCard
                    key={plan.id}
                    plan={plan}
                    href={`${planHrefBase}/${plan.id}`}
                    onActivate={() => void handleSetActive(plan.id, plan.name, previousActiveId)}
                    onDelete={() => setDeleteTarget(plan)}
                    disabled={isPending}
                  />
                ))}
              </div>

              <ResumeRail plan={activePlan} targetUserId={targetUserId} />
              <div style={{ marginTop: 14, fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
                Switching plans does not delete progress — past weeks stay logged under each plan.
              </div>
            </>
          )}
        </div>

        <DeletePlanModal
          open={deleteTarget !== null || deleteLoading}
          plan={deleteTarget}
          isActive={deleteTarget?.isActive ?? false}
          loading={deleteLoading}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
        <PlanSnackbar
          snackbar={snackbar}
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          onUndo={snackbar.undoPlanId !== undefined
            ? () => void handleSetActive(snackbar.undoPlanId ?? null, 'previous plan')
            : undefined}
        />
      </div>
    );
  }

  return (
    <>
      <Card sx={{ display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title={title}
          action={
            <IconButton component={Link} href={createHref} aria-label="Add plan" size="small">
              <AddIcon />
            </IconButton>
          }
        />
        {plans.length === 0 ? (
          <Box sx={{ px: 2, pb: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {emptyMessage}
            </Typography>
            <Button variant="contained" component={Link} href={createHref}>
              Create your first plan
            </Button>
          </Box>
        ) : (
          <List disablePadding>
            {planItems.map((plan) => (
              <ListItem
                key={plan.id}
                disablePadding
                secondaryAction={
                  <Tooltip title={plan.isActive ? 'Clear active plan' : 'Set as active plan'}>
                    <IconButton
                      edge="end"
                      onClick={() => void handleSetActive(plan.isActive ? null : plan.id, plan.name)}
                      aria-label={plan.isActive ? `Clear active plan for ${plan.name}` : `Set ${plan.name} as active plan`}
                      color={plan.isActive ? 'primary' : 'default'}
                      disabled={isPending}
                    >
                      {plan.isActive ? '●' : '○'}
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemButton component={Link} href={`${planHrefBase}/${plan.id}`} sx={{ pr: 12 }}>
                  <ListItemText
                    primary={plan.name}
                    secondary={`${plan.weekCount} ${plan.weekCount === 1 ? 'week' : 'weeks'} · ${formatLastActivity(plan.lastActivityDate, true)}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Card>

      <PlanSnackbar
        snackbar={snackbar}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
      />
    </>
  );
}

function EmptyState({ emptyMessage, createHref }: { emptyMessage: string; createHref: string }) {
  return (
    <div style={{ border: `1px solid ${palette.border}`, borderRadius: signalTokens.radii.card, background: palette.surfaceAlt, padding: 18 }}>
      <p style={{ margin: '0 0 14px', color: palette.inkMid }}>{emptyMessage}</p>
      <ActionLink href={createHref} primary>Create your first plan</ActionLink>
    </div>
  );
}

function PlanDesktopRow({
  plan,
  href,
  onActivate,
  onDelete,
  disabled,
}: {
  plan: PlanListItem;
  href: string;
  onActivate: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const status = statusForPlan(plan);
  return (
    <Link
      href={href}
      aria-current={plan.isActive ? 'true' : undefined}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '20px 2.2fr 1fr 0.9fr 1.2fr 1fr 110px 140px',
        gap: 12,
        alignItems: 'center',
        padding: '14px 16px',
        borderBottom: `1px solid ${palette.border}`,
        background: plan.isActive ? palette.surfaceAlt : palette.surface,
        color: palette.ink,
        textDecoration: 'none',
      }}
    >
      {plan.isActive && <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: signalTokens.signal.deep }} />}
      <span aria-hidden="true" style={{ color: plan.isActive ? signalTokens.signal.deep : palette.inkGhost }}>{plan.isActive ? '●' : '◇'}</span>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{plan.name}</span>
      <Mono>{plan.daysPerWeek ? `${plan.daysPerWeek} days/wk` : '—'}</Mono>
      <Mono>{plan.weeksDone ?? 0} of {plan.weekCount}</Mono>
      <span style={{ color: plan.isActive ? palette.ink : palette.inkLight, fontSize: 13 }}>{plan.isActive && plan.nextWorkoutName ? plan.nextWorkoutName : '—'}</span>
      <Mono>{formatLastActivity(plan.lastActivityDate)}</Mono>
      <StatusPill label={status} />
      <span onClick={(event) => event.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
        {!plan.isActive && (
          <SmallButton disabled={disabled} onClick={(event) => { event.preventDefault(); onActivate(); }}>
            Activate
          </SmallButton>
        )}
        <SmallButton onClick={(event) => { event.preventDefault(); onDelete(); }}>Delete</SmallButton>
      </span>
    </Link>
  );
}

function PlanMobileCard({
  plan,
  href,
  onActivate,
  onDelete,
  disabled,
}: {
  plan: PlanListItem;
  href: string;
  onActivate: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const status = statusForPlan(plan);
  return (
    <article
      style={{
        position: 'relative',
        border: `1.5px solid ${plan.isActive ? palette.borderStrong : palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        background: palette.surface,
        padding: 14,
      }}
    >
      {plan.isActive && <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: signalTokens.signal.deep }} />}
      <Link href={href} style={{ display: 'block', color: palette.ink, textDecoration: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <strong style={{ fontSize: 15, letterSpacing: '-0.005em' }}>{plan.name}</strong>
          <StatusPill label={status} />
        </div>
        <div style={{ marginTop: 8, color: palette.inkMid, fontFamily: signalTokens.fontVar.mono, fontSize: 11 }}>
          {plan.daysPerWeek || '?'} days/wk · {plan.weeksDone ?? 0} of {plan.weekCount} weeks
        </div>
      </Link>
      <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px dashed ${palette.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ color: palette.inkLight, fontFamily: signalTokens.fontVar.mono, fontSize: 10 }}>
          Last · {formatLastActivity(plan.lastActivityDate)}
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          {!plan.isActive && <SmallButton disabled={disabled} onClick={onActivate}>Activate</SmallButton>}
          <SmallButton onClick={onDelete}>Delete</SmallButton>
        </span>
      </div>
    </article>
  );
}

function ResumeRail({ plan, targetUserId }: { plan?: PlanListItem; targetUserId?: string }) {
  if (!plan) return null;
  const weeksHref = targetUserId
    ? `/user/coach/clients/${targetUserId}/plans/${plan.id}/weeks`
    : `/user/plan/${plan.id}/weeks`;
  return (
    <div
      data-plans-desktop
      style={{
        marginTop: 16,
        border: `1.5px solid ${palette.borderStrong}`,
        borderRadius: signalTokens.radii.cardLarge,
        padding: '14px 18px',
        background: palette.surface,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden="true" style={{ width: 6, height: 36, background: signalTokens.signal.deep }} />
          <div>
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight, letterSpacing: '0.1em' }}>
              {plan.name.toUpperCase()} · WEEK {plan.activeWeekOrder ?? 1}
            </div>
            <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 20, fontWeight: 700 }}>Open active plan</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ActionLink href={weeksHref}>View weeks</ActionLink>
          {!targetUserId && plan.nextWorkoutId && (
            <ActionLink href={`/user/workout?workoutId=${plan.nextWorkoutId}`} primary>
              Resume {plan.nextWorkoutName} →
            </ActionLink>
          )}
        </div>
      </div>
    </div>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: palette.inkMid, fontVariantNumeric: 'tabular-nums' }}>
      {children}
    </span>
  );
}

function SmallButton({
  children,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.card,
        background: palette.surface,
        color: palette.ink,
        fontFamily: signalTokens.fontVar.body,
        fontSize: 12,
        fontWeight: 700,
        padding: '6px 9px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function ActionLink({ children, href, primary = false }: { children: ReactNode; href: string; primary?: boolean }) {
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
        fontSize: 12,
        fontWeight: 700,
        textDecoration: 'none',
      }}
    >
      {children}
    </Link>
  );
}

function PlanSnackbar({
  snackbar,
  onClose,
  onUndo,
}: {
  snackbar: { open: boolean; message: string; severity: 'success' | 'error' };
  onClose: () => void;
  onUndo?: () => void;
}) {
  return (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity={snackbar.severity}
        onClose={onClose}
        action={onUndo ? <Button color="inherit" size="small" onClick={onUndo}>Undo</Button> : undefined}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  );
}
