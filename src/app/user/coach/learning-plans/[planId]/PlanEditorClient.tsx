'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LockIcon from '@mui/icons-material/Lock';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { useParams } from 'next/navigation';
import { useApiGet } from '@lib/hooks/api/useApiGet';
import { useApiMutation } from '@lib/hooks/useApiMutation';
import type { LibraryAssetType } from '@prisma/client';
import type { StepProgressMap } from '@lib/learningPlanSchemas';

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

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Assignment {
  id: number;
  clientId: string;
  startDate: string;
  stepProgress: StepProgressMap | null;
  client: Client;
}

interface PlanDetail {
  id: number;
  title: string;
  description: string | null;
  steps: Step[];
  assignments: Assignment[];
}

interface LibraryAssetListItem {
  id: string;
  title: string;
  type: LibraryAssetType;
}

// ─── Step form dialog ────────────────────────────────────────────────────────

function StepFormDialog({
  open,
  initial,
  assets,
  onSave,
  onClose,
  saving,
}: {
  open: boolean;
  initial: Step | null;
  assets: LibraryAssetListItem[];
  onSave: (data: { dayOffset: number; title: string; body: string; assetId: string | null }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [dayOffset, setDayOffset] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [assetId, setAssetId] = useState('');

  useEffect(() => {
    if (open) {
      setDayOffset(initial?.dayOffset ?? 0);
      setTitle(initial?.title ?? '');
      setBody(initial?.body ?? '');
      setAssetId(initial?.assetId ?? '');
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial?.id ? 'Edit Step' : 'Add Step'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField
          label="Day offset"
          type="number"
          value={dayOffset}
          onChange={e => setDayOffset(Math.max(0, parseInt(e.target.value) || 0))}
          helperText="Days after the client's start date to deliver this step"
          inputProps={{ min: 0 }}
          fullWidth
        />
        <TextField
          label="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          fullWidth
          autoFocus
          inputProps={{ maxLength: 200 }}
        />
        <TextField
          label="Body"
          value={body}
          onChange={e => setBody(e.target.value)}
          fullWidth
          multiline
          rows={5}
          placeholder="What should the client read or do on this day?"
        />
        <FormControl fullWidth>
          <InputLabel id="asset-label">Attach asset (optional)</InputLabel>
          <Select
            labelId="asset-label"
            value={assetId}
            label="Attach asset (optional)"
            onChange={e => setAssetId(e.target.value as string)}
          >
            <MenuItem value=""><em>None</em></MenuItem>
            {assets.map(a => (
              <MenuItem key={a.id} value={a.id}>{a.title}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSave({ dayOffset, title: title.trim(), body: body.trim(), assetId: assetId || null })}
          disabled={!title.trim() || !body.trim() || saving}
        >
          {saving ? <CircularProgress size={20} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Assignment accordion ─────────────────────────────────────────────────────

function AssignmentAccordion({
  assignment,
  steps,
  onUnassign,
}: {
  assignment: Assignment;
  steps: Step[];
  onUnassign: (assignmentId: number) => void;
}) {
  const progress = assignment.stepProgress ?? {};
  const completedCount = steps.filter(s => progress[String(s.id)]?.completedAt).length;
  const startDate = new Date(assignment.startDate);

  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ flexGrow: 1, pr: 1 }}>
          <Typography variant="subtitle2">{assignment.client.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {completedCount}/{steps.length} steps completed
          </Typography>
          {steps.length > 0 && (
            <LinearProgress
              variant="determinate"
              value={(completedCount / steps.length) * 100}
              sx={{ mt: 0.5, borderRadius: 1, height: 4 }}
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Stack spacing={0.5} sx={{ mb: 1.5 }}>
          {steps.map(step => {
            const stepProgress = progress[String(step.id)];
            const notified = !!stepProgress?.notifiedAt;
            const completed = !!stepProgress?.completedAt;
            const deliverOn = new Date(startDate);
            deliverOn.setDate(deliverOn.getDate() + step.dayOffset);

            return (
              <Stack key={step.id} direction="row" alignItems="center" spacing={1}>
                {completed ? (
                  <CheckCircleIcon fontSize="small" color="success" />
                ) : notified ? (
                  <RadioButtonUncheckedIcon fontSize="small" color="action" />
                ) : (
                  <LockIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                )}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color={!notified ? 'text.disabled' : undefined}>
                    Day {step.dayOffset} — {step.title}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Delivers {deliverOn.toLocaleDateString()}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
          {steps.length === 0 && (
            <Typography variant="body2" color="text.secondary">No steps yet.</Typography>
          )}
        </Stack>
        <Button
          size="small"
          color="error"
          startIcon={<PersonRemoveIcon />}
          onClick={() => onUnassign(assignment.id)}
        >
          Unassign
        </Button>
      </AccordionDetails>
    </Accordion>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PlanEditorClient() {
  const { planId } = useParams<{ planId: string }>();
  const planUrl = `/api/coach/learning-plans/${planId}`;

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const { data, loading, error } = useApiGet<{ plan: PlanDetail }>(`${planUrl}?r=${refreshKey}`);
  const { data: assetsRaw } = useApiGet<LibraryAssetListItem[]>('/api/library');
  const { data: clientsData } = useApiGet<{ clients: Client[] }>('/api/coach/clients');

  const { mutate } = useApiMutation<unknown>();
  const { mutate: createStep, loading: savingStep } = useApiMutation<{ step: Step }>();
  const { mutate: doAssign, loading: assigning } = useApiMutation<{ assignment: Assignment }>();

  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descEditing, setDescEditing] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);

  const [assignClientId, setAssignClientId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');

  const plan = data?.plan;
  const assets = assetsRaw ?? [];
  const allClients = clientsData?.clients ?? [];
  const assignedClientIds = new Set((plan?.assignments ?? []).map(a => a.clientId));
  const availableClients = allClients.filter(c => !assignedClientIds.has(c.id));

  const saveTitle = useCallback(async () => {
    if (!titleDraft.trim() || titleDraft === plan?.title) { setTitleEditing(false); return; }
    await mutate(planUrl, 'PATCH', { title: titleDraft.trim() });
    setTitleEditing(false);
    refresh();
  }, [titleDraft, plan?.title, mutate, planUrl, refresh]);

  const saveDesc = useCallback(async () => {
    if (descDraft === (plan?.description ?? '')) { setDescEditing(false); return; }
    await mutate(planUrl, 'PATCH', { description: descDraft.trim() || null });
    setDescEditing(false);
    refresh();
  }, [descDraft, plan?.description, mutate, planUrl, refresh]);

  async function handleSaveStep(stepData: { dayOffset: number; title: string; body: string; assetId: string | null }) {
    if (editingStep) {
      const res = await fetch(`${planUrl}/steps/${editingStep.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stepData),
      });
      if (res.ok) { setStepDialogOpen(false); setEditingStep(null); refresh(); }
    } else {
      const result = await createStep(`${planUrl}/steps`, 'POST', stepData);
      if (result) { setStepDialogOpen(false); refresh(); }
    }
  }

  async function handleDeleteStep(stepId: number) {
    const res = await fetch(`${planUrl}/steps/${stepId}`, { method: 'DELETE' });
    if (res.ok) refresh();
  }

  async function handleAssign() {
    if (!assignClientId || !assignStartDate) return;
    const result = await doAssign(`${planUrl}/assignments`, 'POST', {
      clientId: assignClientId,
      startDate: assignStartDate,
    });
    if (result) { setAssignClientId(''); setAssignStartDate(''); refresh(); }
  }

  async function handleUnassign(assignmentId: number) {
    const res = await fetch(`${planUrl}/assignments/${assignmentId}`, { method: 'DELETE' });
    if (res.ok) refresh();
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !plan) {
    return <Alert severity="error" sx={{ m: 2 }}>Failed to load plan.</Alert>;
  }

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      {/* Plan title */}
      {titleEditing ? (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <TextField
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            size="small"
            fullWidth
            autoFocus
            inputProps={{ maxLength: 200 }}
          />
          <Button variant="contained" size="small" onClick={saveTitle}>Save</Button>
          <Button size="small" onClick={() => setTitleEditing(false)}>Cancel</Button>
        </Stack>
      ) : (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{plan.title}</Typography>
          <IconButton size="small" onClick={() => { setTitleDraft(plan.title); setTitleEditing(true); }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}

      {/* Plan description */}
      {descEditing ? (
        <Stack spacing={1} sx={{ mb: 2 }}>
          <TextField
            value={descDraft}
            onChange={e => setDescDraft(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={2}
            autoFocus
            inputProps={{ maxLength: 1000 }}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" size="small" onClick={saveDesc}>Save</Button>
            <Button size="small" onClick={() => setDescEditing(false)}>Cancel</Button>
          </Stack>
        </Stack>
      ) : (
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            {plan.description ?? <em>No description</em>}
          </Typography>
          <IconButton size="small" onClick={() => { setDescDraft(plan.description ?? ''); setDescEditing(true); }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Steps */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>Steps</Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => { setEditingStep(null); setStepDialogOpen(true); }}
        >
          Add Step
        </Button>
      </Stack>

      {plan.steps.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No steps yet. Add the first step to get started.
        </Typography>
      )}

      <Stack spacing={1} sx={{ mb: 3 }}>
        {plan.steps.map(step => (
          <Box key={step.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <DragIndicatorIcon fontSize="small" sx={{ color: 'text.disabled', mt: 0.3, flexShrink: 0 }} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                  <Chip label={`Day ${step.dayOffset}`} size="small" variant="outlined" />
                  <Typography variant="body2" fontWeight={500}>{step.title}</Typography>
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {step.body}
                </Typography>
                {step.asset && (
                  <Chip label={step.asset.title} size="small" sx={{ mt: 0.5 }} />
                )}
              </Box>
              <IconButton
                size="small"
                onClick={() => { setEditingStep(step); setStepDialogOpen(true); }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => handleDeleteStep(step.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Assigned clients */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Assigned Clients</Typography>

      {availableClients.length > 0 && (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel id="client-label">Client</InputLabel>
            <Select
              labelId="client-label"
              value={assignClientId}
              label="Client"
              onChange={e => setAssignClientId(e.target.value as string)}
            >
              {availableClients.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Start date"
            type="date"
            size="small"
            value={assignStartDate}
            onChange={e => setAssignStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleAssign}
            disabled={!assignClientId || !assignStartDate || assigning}
          >
            {assigning ? <CircularProgress size={20} /> : 'Assign'}
          </Button>
        </Stack>
      )}

      {plan.assignments.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No clients assigned yet.</Typography>
      ) : (
        <Stack spacing={1}>
          {plan.assignments.map(assignment => (
            <AssignmentAccordion
              key={assignment.id}
              assignment={assignment}
              steps={plan.steps}
              onUnassign={handleUnassign}
            />
          ))}
        </Stack>
      )}

      <StepFormDialog
        open={stepDialogOpen}
        initial={editingStep}
        assets={assets}
        onSave={handleSaveStep}
        onClose={() => { setStepDialogOpen(false); setEditingStep(null); }}
        saving={savingStep}
      />
    </Box>
  );
}
