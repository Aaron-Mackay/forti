'use client';

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  LinearProgress,
  Link as MuiLink,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SchoolIcon from '@mui/icons-material/School';
import LockIcon from '@mui/icons-material/Lock';
import { useApiGet } from '@lib/hooks/api/useApiGet';
import { useApiMutation } from '@lib/hooks/useApiMutation';
import type { LibraryAssetType } from '@/generated/prisma/browser';
import type { StepProgressMap } from '@lib/contracts/learningPlans';
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';

interface AssetSummary {
  id: string;
  title: string;
  type: LibraryAssetType;
  url: string | null;
}

interface Step {
  id: number;
  order: number;
  dayOffset: number;
  title: string;
  body: string;
  assetId: string | null;
  asset: AssetSummary | null;
}

interface Assignment {
  id: number;
  startDate: string;
  stepProgress: StepProgressMap | null;
  plan: {
    id: number;
    title: string;
    description: string | null;
    steps: Step[];
  };
}

const palette = signalTokens.surface.planning;

function stepAvailabilityLabel(dayOffset: number): string {
  if (dayOffset <= 1) return 'Available now';
  return `Day ${dayOffset} release`;
}

function countCompletedSteps(assignments: Assignment[]): number {
  return assignments.reduce((total, assignment) => (
    total + assignment.plan.steps.filter((step) => assignment.stepProgress?.[String(step.id)]?.completedAt).length
  ), 0);
}

function countLockedSteps(assignments: Assignment[]): number {
  return assignments.reduce((total, assignment) => (
    total + assignment.plan.steps.filter((step) => !assignment.stepProgress?.[String(step.id)]?.notifiedAt).length
  ), 0);
}

function AssignmentCard({
  assignment,
  onToggleStep,
  signalEnabled = false,
}: {
  assignment: Assignment;
  onToggleStep: (assignmentId: number, stepId: number, completed: boolean) => void;
  signalEnabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const { plan, stepProgress: rawProgress } = assignment;
  const progress = rawProgress ?? {};
  const completedCount = plan.steps.filter(s => progress[String(s.id)]?.completedAt).length;
  const startDate = new Date(assignment.startDate);

  if (signalEnabled) {
    return (
      <div
        data-signal-learning-plan-card
        style={{
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          overflow: 'hidden',
          background: palette.surface,
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '18px 16px 16px',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            color: palette.ink,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 5 }}>
                Started {startDate.toLocaleDateString()}
              </div>
              <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 26, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.01em', marginBottom: 8 }}>
                {plan.title}
              </div>
              <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.45 }}>
                {completedCount}/{plan.steps.length} steps complete
              </div>
            </div>
            <div
              aria-hidden="true"
              style={{
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 11,
                color: expanded ? signalTokens.signal.deep : palette.inkLight,
                flexShrink: 0,
                paddingTop: 4,
              }}
            >
              {expanded ? 'Close' : 'Open'}
            </div>
          </div>
          {plan.steps.length > 0 ? (
            <div
              style={{
                marginTop: 14,
                height: 6,
                borderRadius: 999,
                overflow: 'hidden',
                background: palette.bg,
                border: `1px solid ${palette.border}`,
              }}
            >
              <div
                style={{
                  width: `${(completedCount / plan.steps.length) * 100}%`,
                  height: '100%',
                  background: signalTokens.signal.base,
                }}
              />
            </div>
          ) : null}
        </button>

        <Collapse in={expanded}>
          <div style={{ borderTop: `1px solid ${palette.border}` }}>
            {plan.steps.length > 0 ? (
              <div style={{ display: 'grid' }}>
                {plan.steps.map((step, index) => {
                  const stepProg = progress[String(step.id)];
                  const notified = !!stepProg?.notifiedAt;
                  const completed = !!stepProg?.completedAt;

                  const deliverOn = new Date(startDate);
                  deliverOn.setDate(deliverOn.getDate() + step.dayOffset - 1);

                  return (
                    <div
                      key={step.id}
                      style={{
                        padding: '14px 16px 13px',
                        borderTop: index > 0 ? `1px solid ${palette.border}` : 'none',
                        background: notified ? palette.surfaceAlt : palette.bg,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        {notified ? (
                          <Checkbox
                            checked={completed}
                            onChange={(event) => onToggleStep(assignment.id, step.id, event.target.checked)}
                            size="small"
                            sx={{ mt: -0.5, flexShrink: 0, color: signalTokens.signal.deep }}
                            inputProps={{ 'aria-label': `Mark "${step.title}" complete` }}
                          />
                        ) : (
                          <LockIcon
                            fontSize="small"
                            sx={{ color: palette.inkLight, mt: 0.4, flexShrink: 0, ml: 1 }}
                          />
                        )}

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                minHeight: 24,
                                padding: '0 9px',
                                borderRadius: 999,
                                fontFamily: signalTokens.fontVar.mono,
                                fontSize: 11,
                                color: notified ? palette.inkMid : palette.inkLight,
                                background: palette.surface,
                                border: `1px solid ${palette.border}`,
                              }}
                            >
                              Day {step.dayOffset}
                            </span>
                            {!notified ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  minHeight: 24,
                                  padding: '0 9px',
                                  borderRadius: 999,
                                  fontFamily: signalTokens.fontVar.mono,
                                  fontSize: 11,
                                  color: palette.inkLight,
                                  background: palette.bg,
                                  border: `1px solid ${palette.border}`,
                                }}
                              >
                                {stepAvailabilityLabel(step.dayOffset)}
                              </span>
                            ) : null}
                          </div>

                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              lineHeight: 1.35,
                              textDecoration: completed ? 'line-through' : undefined,
                              color: notified ? palette.ink : palette.inkMid,
                              marginBottom: 6,
                            }}
                          >
                            {step.title}
                          </div>

                          {notified ? (
                            <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                              {step.body}
                            </div>
                          ) : (
                            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
                              Available {deliverOn.toLocaleDateString()}
                            </div>
                          )}

                          {step.asset && notified ? (
                            <div style={{ marginTop: 10 }}>
                              {step.asset.url ? (
                                <MuiLink href={step.asset.url} target="_blank" rel="noopener" variant="body2">
                                  {step.asset.title}
                                </MuiLink>
                              ) : (
                                <Chip label={step.asset.title} size="small" />
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '18px 16px', fontSize: 14, color: palette.inkMid, lineHeight: 1.55 }}>
                No steps yet.
              </div>
            )}
          </div>
        </Collapse>
      </div>
    );
  }

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
        onClick={() => setExpanded(e => !e)}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>{plan.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              Started {startDate.toLocaleDateString()} · {completedCount}/{plan.steps.length} done
            </Typography>
          </Box>
          {expanded ? <ExpandLessIcon color="action" /> : <ExpandMoreIcon color="action" />}
        </Stack>
        {plan.steps.length > 0 && (
          <LinearProgress
            variant="determinate"
            value={plan.steps.length > 0 ? (completedCount / plan.steps.length) * 100 : 0}
            sx={{ mt: 1, borderRadius: 1, height: 6 }}
          />
        )}
      </Box>

      <Collapse in={expanded}>
        <Divider />
        <Stack spacing={0} divider={<Divider />}>
          {plan.steps.map(step => {
            const stepProg = progress[String(step.id)];
            const notified = !!stepProg?.notifiedAt;
            const completed = !!stepProg?.completedAt;

            const deliverOn = new Date(startDate);
            deliverOn.setDate(deliverOn.getDate() + step.dayOffset - 1);

            return (
              <Box
                key={step.id}
                sx={{ p: 1.5, bgcolor: !notified ? 'action.disabledBackground' : undefined }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  {notified ? (
                    <Checkbox
                      checked={completed}
                      onChange={e => onToggleStep(assignment.id, step.id, e.target.checked)}
                      size="small"
                      sx={{ mt: -0.5, flexShrink: 0 }}
                      inputProps={{ 'aria-label': `Mark "${step.title}" complete` }}
                    />
                  ) : (
                    <LockIcon
                      fontSize="small"
                      sx={{ color: 'text.disabled', mt: 0.4, flexShrink: 0, ml: 1 }}
                    />
                  )}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                      <Chip label={`Day ${step.dayOffset}`} size="small" variant="outlined" />
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{ textDecoration: completed ? 'line-through' : undefined, color: !notified ? 'text.disabled' : undefined }}
                      >
                        {step.title}
                      </Typography>
                    </Stack>
                    {notified && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                        {step.body}
                      </Typography>
                    )}
                    {!notified && (
                      <Typography variant="caption" color="text.disabled">
                        Available {deliverOn.toLocaleDateString()}
                      </Typography>
                    )}
                    {step.asset && notified && (
                      <Box sx={{ mt: 1 }}>
                        {step.asset.url ? (
                          <MuiLink href={step.asset.url} target="_blank" rel="noopener" variant="body2">
                            {step.asset.title}
                          </MuiLink>
                        ) : (
                          <Chip label={step.asset.title} size="small" />
                        )}
                      </Box>
                    )}
                  </Box>
                </Stack>
              </Box>
            );
          })}
          {plan.steps.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">No steps yet.</Typography>
            </Box>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}

export default function LearningPlansClient({ signalEnabled = false }: { signalEnabled?: boolean }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useApiGet<{ assignments: Assignment[] }>(
    `/api/learning-plan-assignments?r=${refreshKey}`
  );
  const { mutate } = useApiMutation<{ stepProgress: StepProgressMap }>();

  async function handleToggleStep(assignmentId: number, stepId: number, completed: boolean) {
    await mutate(
      `/api/learning-plan-assignments/${assignmentId}/steps/${stepId}/complete`,
      'PATCH',
      { completed },
    );
    setRefreshKey(k => k + 1);
  }

  const assignments = data?.assignments ?? [];

  if (signalEnabled) {
    const completedSteps = countCompletedSteps(assignments);
    const lockedSteps = countLockedSteps(assignments);

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
            [data-signal-learning-plans-shell] {
              max-width: 900px;
              margin: 0 auto;
            }
            [data-signal-learning-plans-summary] {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
        `}</style>

        <div data-signal-learning-plans-shell>
          <section
            style={{
              background: palette.surface,
              border: `1px solid ${palette.borderStrong}`,
              borderRadius: signalTokens.radii.cardLarge,
              padding: '20px 20px 18px',
            }}
          >
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.deep, marginBottom: 6 }}>
              Learning plans
            </div>
            <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 10 }}>
              Assigned coaching
            </div>
            <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, maxWidth: 640 }}>
              Work through the lessons your coach assigns over time. New steps unlock on their release day, and completed work stays tracked here.
            </div>

            <div
              data-signal-learning-plans-summary
              style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginTop: 18 }}
            >
              <SignalSummaryCard
                label="Assigned"
                value={String(assignments.length)}
                detail={assignments.length === 1 ? 'One active curriculum is in motion.' : 'Current curricula assigned to you.'}
              />
              <SignalSummaryCard
                label="Completed"
                value={String(completedSteps)}
                detail={completedSteps > 0 ? 'Steps you have already ticked off.' : 'Completed steps will accumulate here.'}
              />
              <SignalSummaryCard
                label="Locked"
                value={String(lockedSteps)}
                detail={lockedSteps > 0 ? 'Upcoming releases still waiting on their day.' : 'Nothing is waiting in the queue right now.'}
              />
            </div>
          </section>

          {loading ? (
            <section
              data-signal-learning-plans-loading
              style={{
                marginTop: 16,
                border: `1px solid ${palette.border}`,
                borderRadius: signalTokens.radii.cardLarge,
                padding: '22px 18px 20px',
                background: palette.surfaceAlt,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <CircularProgress size={24} />
                <div>
                  <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
                    Curriculum
                  </div>
                  <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.01em', marginBottom: 6 }}>
                    Loading assigned steps
                  </div>
                  <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.55 }}>
                    Pulling your latest learning-plan progress from the coaching library.
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to load learning plans.
            </Alert>
          ) : null}

          {!loading && !error ? (
            assignments.length === 0 ? (
              <section
                data-signal-learning-plans-empty
                style={{
                  marginTop: 16,
                  border: `1px solid ${palette.border}`,
                  borderRadius: signalTokens.radii.cardLarge,
                  padding: '22px 18px 20px',
                  background: palette.surfaceAlt,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: palette.surface,
                    border: `1px solid ${palette.border}`,
                    marginBottom: 16,
                  }}
                >
                  <SchoolIcon sx={{ fontSize: 22, color: palette.inkMid }} />
                </div>
                <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
                  Library
                </div>
                <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 26, fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.01em', marginBottom: 8 }}>
                  No learning plans yet
                </div>
                <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.6, maxWidth: 520 }}>
                  Your coach will assign a learning plan when you&apos;re ready.
                </div>
              </section>
            ) : (
              <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                {assignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onToggleStep={handleToggleStep}
                    signalEnabled
                  />
                ))}
              </div>
            )
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Box sx={{ p: 2, minHeight: HEIGHT_EXC_APPBAR }}>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>Failed to load learning plans.</Alert>
      )}

      {!loading && !error && data && (
        <>
          {data.assignments.length === 0 ? (
            <Box sx={{ textAlign: 'center', pt: 8 }}>
              <SchoolIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No learning plans yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your coach will assign a learning plan when you&apos;re ready.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {data.assignments.map(assignment => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onToggleStep={handleToggleStep}
                />
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
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
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: palette.inkMid, lineHeight: 1.4 }}>
        {detail}
      </div>
    </div>
  );
}
