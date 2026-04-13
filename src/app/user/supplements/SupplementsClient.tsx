'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import { useAppBar } from '@lib/providers/AppBarProvider';

interface SupplementVersion {
  id: number;
  supplementId: number;
  effectiveFrom: string; // ISO date "YYYY-MM-DD" (or ISO timestamp from Prisma)
  dosage: string;
  frequency: string;
  notes: string | null;
}

interface Supplement {
  id: number;
  userId: string;
  name: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  versions: SupplementVersion[];
}

interface SupplementFormData {
  name: string;
  dosage: string;
  frequency: string;
  notes: string;
  startDate: string;
  endDate: string;
  effectiveFrom: string; // only used in edit mode
}

const EMPTY_FORM: SupplementFormData = {
  name: '',
  dosage: '',
  frequency: '',
  notes: '',
  startDate: '',
  endDate: '',
  effectiveFrom: '',
};

function toDateString(date: string | null | undefined): string {
  if (!date) return '';
  return date.slice(0, 10);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateRange(startDate: string, endDate: string | null): string {
  if (!endDate) return `Started ${formatDate(startDate)} · Ongoing`;
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

function isActive(supp: Supplement): boolean {
  if (!supp.endDate) return true;
  return supp.endDate >= new Date().toISOString().slice(0, 10);
}

/** Backwards lookup: most recent version where effectiveFrom <= today. */
function getActiveVersion(supplement: Supplement, dateStr?: string): SupplementVersion | null {
  if (!supplement.versions.length) return null;
  const cutoff = dateStr ?? new Date().toISOString().slice(0, 10);
  const desc = [...supplement.versions].sort((a, b) =>
    b.effectiveFrom.slice(0, 10).localeCompare(a.effectiveFrom.slice(0, 10))
  );
  return desc.find(v => v.effectiveFrom.slice(0, 10) <= cutoff) ?? supplement.versions[0];
}

// ---------------------------------------------------------------------------
// Version history timeline
// ---------------------------------------------------------------------------

interface VersionDiff {
  field: string;
  from: string;
  to: string;
}

function computeVersionDiffs(prev: SupplementVersion, curr: SupplementVersion): VersionDiff[] {
  const diffs: VersionDiff[] = [];
  if (prev.dosage !== curr.dosage)
    diffs.push({ field: 'Dosage', from: prev.dosage, to: curr.dosage });
  if (prev.frequency !== curr.frequency)
    diffs.push({ field: 'Frequency', from: prev.frequency, to: curr.frequency });
  if ((prev.notes ?? '') !== (curr.notes ?? ''))
    diffs.push({ field: 'Notes', from: prev.notes ?? '—', to: curr.notes ?? '—' });
  return diffs;
}

function SupplementVersionTimeline({ versions }: { versions: SupplementVersion[] }) {
  return (
    <Box sx={{ borderLeft: '2px solid', borderColor: 'divider', pl: 2, mt: 1.5 }}>
      {versions.map((v, i) => {
        const isFirst = i === 0;
        const diffs = isFirst ? [] : computeVersionDiffs(versions[i - 1], v);
        return (
          <Box key={v.id} sx={{ position: 'relative', mb: i < versions.length - 1 ? 1.5 : 0 }}>
            {/* dot on rail */}
            <Box sx={{
              position: 'absolute',
              left: '-21px',
              top: '5px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              bgcolor: 'text.disabled',
            }} />
            <Typography variant="caption" display="block" color="text.secondary">
              {formatDate(v.effectiveFrom)}
            </Typography>
            {isFirst ? (
              <Typography variant="body2">
                Added · {v.dosage} · {v.frequency}
                {v.notes && (
                  <Typography component="span" variant="body2" color="text.secondary"> · {v.notes}</Typography>
                )}
              </Typography>
            ) : diffs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No visible changes</Typography>
            ) : (
              diffs.map(d => (
                <Typography key={d.field} variant="body2">
                  <Typography component="span" variant="body2" fontWeight={500}>{d.field}</Typography>
                  {': '}{d.from}{' → '}{d.to}
                </Typography>
              ))
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Supplement card
// ---------------------------------------------------------------------------

interface SupplementCardProps {
  supplement: Supplement;
  readOnly: boolean;
  onEdit: (supp: Supplement) => void;
  onDelete: (supp: Supplement) => void;
}

function SupplementCard({ supplement, readOnly, onEdit, onDelete }: SupplementCardProps) {
  const [versionsOpen, setVersionsOpen] = useState(false);
  const active = getActiveVersion(supplement);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {supplement.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {active?.dosage} · {active?.frequency}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDateRange(supplement.startDate, supplement.endDate)}
          </Typography>
          {active?.notes && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {active.notes}
            </Typography>
          )}
        </Box>
        {!readOnly && (
          <Stack direction="row" spacing={0.5} sx={{ ml: 1, flexShrink: 0 }}>
            <IconButton size="small" onClick={() => onEdit(supplement)} aria-label="Edit supplement">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onDelete(supplement)} aria-label="Delete supplement">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
      </Stack>

      {supplement.versions.length > 0 && (
        <>
          <ButtonBase
            onClick={() => setVersionsOpen(v => !v)}
            sx={{
              mt: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.secondary',
              borderRadius: 1,
              px: 0.5,
            }}
          >
            <Typography variant="caption">
              Change history ({supplement.versions.length} {supplement.versions.length === 1 ? 'entry' : 'entries'})
            </Typography>
            <ExpandMoreIcon
              fontSize="small"
              sx={{
                transition: 'transform 0.2s',
                transform: versionsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                fontSize: '16px',
              }}
            />
          </ButtonBase>
          <Collapse in={versionsOpen}>
            <SupplementVersionTimeline versions={supplement.versions} />
          </Collapse>
        </>
      )}
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

function AppBarSetter() {
  useAppBar({ title: 'Supplements' });
  return null;
}

export default function SupplementsClient({
  readOnly = false,
  initialSupplements,
  apiBase = '/api/supplements',
  embedded = false,
}: {
  readOnly?: boolean;
  initialSupplements?: Supplement[];
  apiBase?: string;
  embedded?: boolean;
}) {
  const [supplements, setSupplements] = useState<Supplement[]>(initialSupplements ?? []);
  const [loading, setLoading] = useState(!initialSupplements);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupp, setEditingSupp] = useState<Supplement | null>(null);
  const [formData, setFormData] = useState<SupplementFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSupplements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiBase);
      if (!res.ok) throw new Error('Failed to load supplements');
      const data: Supplement[] = await res.json();
      setSupplements(data);
    } catch {
      setError('Failed to load supplements.');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (!initialSupplements) {
      fetchSupplements();
    }
  }, [fetchSupplements, initialSupplements]);

  const openAdd = () => {
    setEditingSupp(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (supp: Supplement) => {
    setEditingSupp(supp);
    const active = getActiveVersion(supp);
    setFormData({
      name: supp.name,
      dosage: active?.dosage ?? '',
      frequency: active?.frequency ?? '',
      notes: active?.notes ?? '',
      startDate: toDateString(supp.startDate),
      endDate: toDateString(supp.endDate),
      effectiveFrom: new Date().toISOString().slice(0, 10),
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.dosage.trim() || !formData.frequency.trim() || !formData.startDate) {
      setFormError('Name, dosage, frequency, and start date are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingSupp) {
        // Build a diff-only PATCH body to avoid creating spurious version entries
        const active = getActiveVersion(editingSupp);
        const body: Record<string, unknown> = {};

        if (formData.name.trim() !== editingSupp.name) body.name = formData.name.trim();
        if (formData.startDate !== toDateString(editingSupp.startDate)) body.startDate = formData.startDate;
        const newEndDate = formData.endDate || null;
        const currentEndDate = editingSupp.endDate ? toDateString(editingSupp.endDate) : null;
        if (newEndDate !== currentEndDate) body.endDate = newEndDate;

        const newDosage = formData.dosage.trim();
        const newFrequency = formData.frequency.trim();
        const newNotes = formData.notes.trim() || null;
        if (newDosage !== (active?.dosage ?? '')) body.dosage = newDosage;
        if (newFrequency !== (active?.frequency ?? '')) body.frequency = newFrequency;
        if (newNotes !== (active?.notes ?? null)) body.notes = newNotes;

        // Include effectiveFrom only if versioned fields changed
        if ('dosage' in body || 'frequency' in body || 'notes' in body) {
          body.effectiveFrom = formData.effectiveFrom;
        }

        if (Object.keys(body).length === 0) {
          setDialogOpen(false);
          return;
        }

        const res = await fetch(`${apiBase}/${editingSupp.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update supplement');
        const updated: Supplement = await res.json();
        setSupplements(prev => prev.map(s => s.id === updated.id ? updated : s));
      } else {
        const body = {
          name: formData.name.trim(),
          dosage: formData.dosage.trim(),
          frequency: formData.frequency.trim(),
          notes: formData.notes.trim() || null,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
        };
        const res = await fetch(apiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to create supplement');
        const created: Supplement = await res.json();
        setSupplements(prev => [created, ...prev]);
      }
      setDialogOpen(false);
    } catch {
      setFormError('Failed to save supplement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supp: Supplement) => {
    if (!confirm(`Delete "${supp.name}"?`)) return;
    setSupplements(prev => prev.filter(s => s.id !== supp.id));
    try {
      const res = await fetch(`${apiBase}/${supp.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setSupplements(prev => [supp, ...prev]);
        setError('Failed to delete supplement.');
      }
    } catch {
      setSupplements(prev => [supp, ...prev]);
      setError('Failed to delete supplement.');
    }
  };

  const active = supplements.filter(isActive);
  const history = supplements.filter(s => !isActive(s));

  return (
    <>
      {!embedded && <AppBarSetter />}
      <Box sx={embedded ? undefined : { pt: 2, pb: 6, px: 2, maxWidth: 600, height: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="overline" color="text.secondary">Active</Typography>
            {active.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No active supplements.
              </Typography>
            ) : (
              <Box sx={{ mb: 2 }}>
                {active.map(s => (
                  <SupplementCard
                    key={s.id}
                    supplement={s}
                    readOnly={readOnly}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </Box>
            )}

            {history.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="overline" color="text.secondary">History</Typography>
                <Box sx={{ mt: 0.5 }}>
                  {history.map(s => (
                    <SupplementCard
                      key={s.id}
                      supplement={s}
                      readOnly={readOnly}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </Box>
              </>
            )}

            {!readOnly && (
              <Box
                component={ButtonBase}
                onClick={openAdd}
                aria-label="Add supplement"
                sx={{
                  mt: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  color: 'primary.main',
                  opacity: 0.35,
                  py: 0.75,
                  '&:hover': {opacity: 0.9},
                  transition: 'opacity 0.15s',
                }}
              >
                <AddIcon sx={{fontSize: '1rem'}} />
              </Box>
            )}
          </>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>{editingSupp ? 'Edit Supplement' : 'Add Supplement'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Alert severity="error" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}
            <TextField
              label="Name"
              required
              fullWidth
              value={formData.name}
              onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              disabled={saving}
            />
            <TextField
              label="Dosage"
              required
              fullWidth
              placeholder="e.g. 400mg"
              value={formData.dosage}
              onChange={e => setFormData(f => ({ ...f, dosage: e.target.value }))}
              disabled={saving}
            />
            <TextField
              label="Frequency"
              required
              fullWidth
              placeholder="e.g. Daily, Weekly"
              value={formData.frequency}
              onChange={e => setFormData(f => ({ ...f, frequency: e.target.value }))}
              disabled={saving}
            />
            {editingSupp && (
              <TextField
                label="Effective from"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.effectiveFrom}
                onChange={e => setFormData(f => ({ ...f, effectiveFrom: e.target.value }))}
                disabled={saving}
                helperText="When did this dosage/frequency change take effect?"
              />
            )}
            <TextField
              label="Start Date"
              required
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.startDate}
              onChange={e => setFormData(f => ({ ...f, startDate: e.target.value }))}
              disabled={saving}
            />
            <TextField
              label="End Date (optional)"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.endDate}
              onChange={e => setFormData(f => ({ ...f, endDate: e.target.value }))}
              disabled={saving}
              helperText="Leave blank for ongoing supplements"
            />
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={2}
              value={formData.notes}
              onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
              disabled={saving}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
