'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Fab,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Overlay } from '@/components/signal/overlay';
import AddIcon from '@mui/icons-material/Add';
import SchoolIcon from '@mui/icons-material/School';
import { useRouter } from 'next/navigation';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';
import { useApiGet } from '@lib/hooks/api/useApiGet';
import { useApiMutation } from '@lib/hooks/useApiMutation';
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';

interface PlanSummary {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  _count: { steps: number; assignments: number };
}

export default function CoachLearningPlansClient({ signalEnabled = false }: { signalEnabled?: boolean }) {
  const router = useRouter();
  const { data, loading, error } = useApiGet<{ plans: PlanSummary[] }>('/api/coach/learning-plans');
  const { mutate: createPlan, loading: creating } = useApiMutation<{ plan: PlanSummary }>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function handleCreate() {
    if (!title.trim()) return;
    const result = await createPlan('/api/coach/learning-plans', 'POST', {
      title: title.trim(),
      description: description.trim() || null,
    });
    if (result) {
      setDialogOpen(false);
      setTitle('');
      setDescription('');
      router.push(`/user/coach/learning-plans/${result.plan.id}`);
    }
  }

  const plans = data?.plans ?? [];

  if (signalEnabled) {
    return (
      <SignalCoachLearningPlans
        loading={loading}
        error={error}
        plans={plans}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        creating={creating}
        onCreate={handleCreate}
        onOpenPlan={(planId) => router.push(`/user/coach/learning-plans/${planId}`)}
      />
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
        <Typography color="error" sx={{ mt: 2 }}>
          Failed to load learning plans.
        </Typography>
      )}

      {!loading && !error && data && (
        <>
          {data.plans.length === 0 ? (
            <Box sx={{ textAlign: 'center', pt: 8 }}>
              <SchoolIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No learning plans yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create a plan to start delivering structured content to your clients.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                New Plan
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.plans.map(plan => (
                <Card key={plan.id} variant="outlined">
                  <CardActionArea onClick={() => router.push(`/user/coach/learning-plans/${plan.id}`)}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {plan.title}
                      </Typography>
                      {plan.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {plan.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {plan._count.steps} {plan._count.steps === 1 ? 'step' : 'steps'} ·{' '}
                        {plan._count.assignments} {plan._count.assignments === 1 ? 'client' : 'clients'}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
        </>
      )}

      {/* FAB — only shown when there are already plans */}
      {!loading && data && data.plans.length > 0 && (
        <Fab
          color="primary"
          aria-label="new plan"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => setDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Create plan dialog */}
      <Overlay
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="New learning plan"
        size="md"
        dirty={!creating && (title.trim().length > 0 || description.trim().length > 0)}
        primaryAction={{
          label: creating ? 'Creating…' : 'Create',
          onClick: handleCreate,
          disabled: !title.trim() || creating,
        }}
        ghostAction={{ label: 'Cancel', onClick: () => setDialogOpen(false) }}
      >
        <Stack spacing={2} sx={{ pt: 1, pb: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ maxLength: 200 }}
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            inputProps={{ maxLength: 1000 }}
          />
        </Stack>
      </Overlay>

    </Box>
  );
}

const palette = signalTokens.surface.planning;

function SignalCoachLearningPlans({
  loading,
  error,
  plans,
  dialogOpen,
  setDialogOpen,
  title,
  setTitle,
  description,
  setDescription,
  creating,
  onCreate,
  onOpenPlan,
}: {
  loading: boolean;
  error: string | null;
  plans: PlanSummary[];
  dialogOpen: boolean;
  setDialogOpen: (value: boolean) => void;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  creating: boolean;
  onCreate: () => Promise<void>;
  onOpenPlan: (planId: number) => void;
}) {
  const totalSteps = plans.reduce((sum, plan) => sum + plan._count.steps, 0);
  const totalAssignments = plans.reduce((sum, plan) => sum + plan._count.assignments, 0);

  return (
    <div
      className={signalFontVariablesClassName}
      style={{
        minHeight: HEIGHT_EXC_APPBAR,
        background: palette.bg,
        color: palette.ink,
        fontFamily: signalTokens.fontVar.body,
        padding: '14px 16px 28px',
        maxWidth: 1080,
        margin: '0 auto',
      }}
    >
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          Failed to load learning plans.
        </Typography>
      )}

      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <span>Learning library</span>
        <span>{plans.length} plan{plans.length === 1 ? '' : 's'} live</span>
      </div>

      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', color: palette.inkMid, marginBottom: 12 }}>
        Coach curriculum
      </div>

      <section
        style={{
          background: palette.surface,
          border: `1px solid ${palette.borderStrong}`,
          borderRadius: signalTokens.radii.cardLarge,
          padding: '20px 20px 18px',
          marginBottom: 18,
        }}
      >
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: plans.length > 0 ? signalTokens.signal.deep : palette.inkLight, marginBottom: 6 }}>
          Coach Learning Plans
        </div>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 10 }}>
          {plans.length > 0 ? `${plans.length} active learning plans` : 'Library empty'}
        </div>
        <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, maxWidth: 680 }}>
          Build reusable education tracks for onboarding, habits, and client support. Create a plan here, then open it to add steps and assignments in the existing editor flow.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 18 }}>
          <SignalMetricPill label="Plans" value={plans.length} />
          <SignalMetricPill label="Steps" value={totalSteps} />
          <SignalMetricPill label="Assignments" value={totalAssignments} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
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
            New plan
          </button>
          <Link
            href="/user/coach"
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
            Open coach home
          </Link>
        </div>
      </section>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress />
        </Box>
      ) : plans.length === 0 ? (
        <section
          style={{
            textAlign: 'center',
            padding: '52px 18px',
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            borderRadius: signalTokens.radii.cardLarge,
          }}
        >
          <SchoolIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1.05, marginBottom: 8 }}>
            No learning plans yet
          </div>
          <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, marginBottom: 18 }}>
            Create a plan to start delivering structured content to your clients.
          </div>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            New Plan
          </Button>
        </section>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plans.map(plan => (
            <button
              key={plan.id}
              type="button"
              onClick={() => onOpenPlan(plan.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                width: '100%',
                textAlign: 'left',
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: signalTokens.radii.cardLarge,
                padding: '16px 16px 15px',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 4 }}>
                  {plan.title}
                </div>
                {plan.description && (
                  <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, marginBottom: 8 }}>
                    {plan.description}
                  </div>
                )}
                <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
                  {plan._count.steps} {plan._count.steps === 1 ? 'step' : 'steps'} · {plan._count.assignments} {plan._count.assignments === 1 ? 'client' : 'clients'}
                </div>
              </div>
              <div style={{ alignSelf: 'center', fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: signalTokens.signal.deep }}>
                Open
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && plans.length > 0 && (
        <Fab
          color="primary"
          aria-label="new plan"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => setDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

      <Overlay
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="New learning plan"
        size="md"
        dirty={!creating && (title.trim().length > 0 || description.trim().length > 0)}
        primaryAction={{
          label: creating ? 'Creating…' : 'Create',
          onClick: () => void onCreate(),
          disabled: !title.trim() || creating,
        }}
        ghostAction={{ label: 'Cancel', onClick: () => setDialogOpen(false) }}
      >
        <Stack spacing={2} sx={{ pt: 1, pb: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ maxLength: 200 }}
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            inputProps={{ maxLength: 1000 }}
          />
        </Stack>
      </Overlay>
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
