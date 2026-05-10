'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
  Box,
  Button,
  Card,
  CardHeader,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Snackbar,
  Alert,
  Tooltip,
  Typography,
  Stack,
} from '@mui/material';
import { setActivePlan } from '@lib/clientApi';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';

type PlanListItem = {
  id: number;
  name: string;
  order: number;
  weekCount: number;
  lastActivityDate: Date | string | null;
  isActive: boolean;
};

function formatLastActivity(value: Date | string | null) {
  if (!value) return 'No activity yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No activity yet';

  return `Last activity ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function SignalSummaryCell({ label, value, detail }: { label: string; value: string; detail: string }) {
  const palette = signalTokens.surface.planning;
  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.card,
        padding: '12px 12px 11px',
        background: palette.surface,
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: palette.inkMid, lineHeight: 1.45 }}>
        {detail}
      </div>
    </div>
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
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    setPlanItems(plans);
  }, [plans]);

  const activeCount = useMemo(() => planItems.filter((plan) => plan.isActive).length, [planItems]);
  const totalWeeks = useMemo(() => planItems.reduce((sum, plan) => sum + plan.weekCount, 0), [planItems]);
  const latestActivityLabel = useMemo(() => {
    const latestDate = planItems
      .map((plan) => plan.lastActivityDate)
      .filter((value): value is Date | string => value !== null)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return latestDate
      ? latestDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : 'No activity yet';
  }, [planItems]);

  async function handleSetActive(planId: number | null) {
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
        message: planId === null ? 'Active plan cleared' : 'Active plan updated',
        severity: 'success',
      });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setPlanItems(plans);
      setSnackbar({
        open: true,
        message: 'Failed to update active plan',
        severity: 'error',
      });
    }
  }

  if (signalEnabled) {
    const palette = signalTokens.surface.planning;

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
            [data-signal-plan-list-shell] {
              max-width: 1080px;
              margin: 0 auto;
            }
            [data-signal-plan-list-summary] {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
        `}</style>

        <div data-signal-plan-list-shell>
          <section
            style={{
              background: palette.surface,
              border: `1px solid ${palette.borderStrong}`,
              borderRadius: signalTokens.radii.cardLarge,
              padding: '20px 20px 18px',
            }}
          >
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
              Plans
            </div>
            <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 10 }}>
              {title}
            </div>
            <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, maxWidth: 700 }}>
              Keep the client&apos;s active training plan in reach, jump into an editor from any row, and set the active plan without losing the list view.
            </div>

            <div
              data-signal-plan-list-summary
              style={{
                display: 'grid',
                gap: 8,
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                marginTop: 18,
              }}
            >
              <SignalSummaryCell
                label="Active"
                value={String(activeCount)}
                detail={activeCount > 0 ? 'Plan(s) currently marked active for this client.' : 'No active plan is set.'}
              />
              <SignalSummaryCell
                label="Weeks"
                value={String(totalWeeks)}
                detail="Total weeks across the visible plan list."
              />
              <SignalSummaryCell
                label="Latest activity"
                value={latestActivityLabel}
                detail="Most recent activity across the client&apos;s plans."
              />
            </div>
          </section>

          <section
            style={{
              marginTop: 18,
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: signalTokens.radii.cardLarge,
              padding: '18px 16px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
                  Plan list
                </div>
                <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 26, fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.01em' }}>
                  Open an existing plan
                </div>
              </div>
              <Button
                component={Link}
                href={createHref}
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
              >
                New plan
              </Button>
            </div>

            {plans.length === 0 ? (
              <Box
                sx={{
                  border: `1px solid ${palette.border}`,
                  borderRadius: signalTokens.radii.card,
                  background: palette.surfaceAlt,
                  p: 2,
                }}
              >
                <Typography variant="body2" sx={{ color: palette.inkMid, mb: 1.5 }}>
                  {emptyMessage}
                </Typography>
                <Button variant="contained" component={Link} href={createHref}>
                  Create your first plan
                </Button>
              </Box>
            ) : (
              <Stack spacing={1}>
                {planItems.map((plan) => (
                  <Box
                    key={plan.id}
                    sx={{
                      border: `1px solid ${plan.isActive ? palette.borderStrong : palette.border}`,
                      borderRadius: signalTokens.radii.card,
                      background: plan.isActive ? palette.surfaceAlt : palette.surface,
                      p: 1.5,
                    }}
                  >
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      justifyContent="space-between"
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          component={Link}
                          href={`${planHrefBase}/${plan.id}`}
                          sx={{
                            display: 'inline-block',
                            fontFamily: signalTokens.fontVar.cond,
                            fontSize: 22,
                            fontWeight: 700,
                            lineHeight: 1.08,
                            letterSpacing: '-0.01em',
                            color: palette.ink,
                            textDecoration: 'none',
                            mb: 0.75,
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          {plan.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: palette.inkMid }}>
                          {plan.weekCount} {plan.weekCount === 1 ? 'week' : 'weeks'} · {formatLastActivity(plan.lastActivityDate)}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                        {plan.isActive && (
                          <Chip
                            label="Active"
                            size="small"
                            sx={{
                              borderRadius: 999,
                              backgroundColor: signalTokens.signal.dim,
                              color: palette.ink,
                              border: `1px solid ${signalTokens.signal.deep}`,
                            }}
                          />
                        )}
                        <Tooltip title={plan.isActive ? 'Clear active plan' : 'Set as active plan'}>
                          <IconButton
                            onClick={() => void handleSetActive(plan.isActive ? null : plan.id)}
                            aria-label={plan.isActive ? `Clear active plan for ${plan.name}` : `Set ${plan.name} as active plan`}
                            color={plan.isActive ? 'primary' : 'default'}
                            disabled={isPending}
                            sx={{
                              width: 44,
                              height: 44,
                              border: `1px solid ${palette.border}`,
                              backgroundColor: palette.surface,
                              transition: 'transform 120ms ease, opacity 120ms ease, border-color 120ms ease',
                              opacity: isPending ? 0.85 : 1,
                            }}
                          >
                            <Box sx={{ position: 'relative', width: 28, height: 28, display: 'grid', placeItems: 'center' }}>
                              <RadioButtonUncheckedIcon sx={{ fontSize: 28, position: 'absolute', inset: 0 }} />
                              <RadioButtonCheckedIcon
                                sx={{
                                  fontSize: 28,
                                  position: 'absolute',
                                  inset: 0,
                                  opacity: plan.isActive ? 1 : 0,
                                  transform: plan.isActive ? 'scale(1)' : 'scale(0.82)',
                                  transition: 'opacity 140ms ease, transform 140ms ease',
                                }}
                              />
                              {isPending && (
                                <CircularProgress
                                  size={16}
                                  sx={{
                                    position: 'absolute',
                                    color: 'currentColor',
                                  }}
                                />
                              )}
                            </Box>
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </section>
        </div>

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

  return (
    <>
      <Card sx={{ display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title={title}
          action={
            <IconButton
              component={Link}
              href={createHref}
              aria-label="Add plan"
              size="small"
            >
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
            {planItems.map((plan) => {
              return (
                <ListItem
                  key={plan.id}
                  disablePadding
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Tooltip title={plan.isActive ? 'Clear active plan' : 'Set as active plan'}>
                        <IconButton
                          edge="end"
                          onClick={() => void handleSetActive(plan.isActive ? null : plan.id)}
                          aria-label={plan.isActive ? `Clear active plan for ${plan.name}` : `Set ${plan.name} as active plan`}
                          color={plan.isActive ? 'primary' : 'default'}
                          disabled={isPending}
                          sx={{
                            width: 44,
                            height: 44,
                            transition: 'transform 120ms ease, opacity 120ms ease',
                            opacity: isPending ? 0.85 : 1,
                          }}
                        >
                          <Box sx={{ position: 'relative', width: 28, height: 28, display: 'grid', placeItems: 'center' }}>
                            <RadioButtonUncheckedIcon sx={{ fontSize: 28, position: 'absolute', inset: 0 }} />
                            <RadioButtonCheckedIcon
                              sx={{
                                fontSize: 28,
                                position: 'absolute',
                                inset: 0,
                                opacity: plan.isActive ? 1 : 0,
                                transform: plan.isActive ? 'scale(1)' : 'scale(0.82)',
                                transition: 'opacity 140ms ease, transform 140ms ease',
                              }}
                            />
                            {isPending && (
                              <CircularProgress
                                size={16}
                                sx={{
                                  position: 'absolute',
                                  color: 'currentColor',
                                }}
                              />
                            )}
                          </Box>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemButton component={Link} href={`${planHrefBase}/${plan.id}`} sx={{ pr: 22 }}>
                    <ListItemText
                      primary={plan.name}
                      secondary={`${plan.weekCount} ${plan.weekCount === 1 ? 'week' : 'weeks'} · ${formatLastActivity(plan.lastActivityDate)}`}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Card>

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
