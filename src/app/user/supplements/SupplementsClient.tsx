'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import { useAppBar } from '@lib/providers/AppBarProvider';

interface Supplement {
  id: number;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  notes: string | null;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SupplementFormData {
  name: string;
  dosage: string;
  frequency: string;
  notes: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: SupplementFormData = {
  name: '',
  dosage: '',
  frequency: '',
  notes: '',
  startDate: '',
  endDate: '',
};

function toDateString(date: string | null | undefined): string {
  if (!date) return '';
  return date.slice(0, 10);
}

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(startDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (!endDate) return `Started ${start} · Ongoing`;
  const end = new Date(endDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${start} – ${end}`;
}

function isActive(supp: Supplement): boolean {
  if (!supp.endDate) return true;
  return supp.endDate >= new Date().toISOString().slice(0, 10);
}

interface SupplementCardProps {
  supplement: Supplement;
  readOnly: boolean;
  onEdit: (supp: Supplement) => void;
  onDelete: (supp: Supplement) => void;
}

function SupplementCard({ supplement, readOnly, onEdit, onDelete }: SupplementCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {supplement.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {supplement.dosage} · {supplement.frequency}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDateRange(supplement.startDate, supplement.endDate)}
          </Typography>
          {supplement.notes && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {supplement.notes}
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
    </Paper>
  );
}

export default function SupplementsClient({
  readOnly: readOnlyProp = false,
  initialSupplements,
}: {
  readOnly?: boolean;
  initialSupplements?: Supplement[];
}) {
  useAppBar({ title: 'Supplements' });
  const [supplements, setSupplements] = useState<Supplement[]>(initialSupplements ?? []);
  const [loading, setLoading] = useState(!initialSupplements);
  const [error, setError] = useState<string | null>(null);
  const readOnly = readOnlyProp;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupp, setEditingSupp] = useState<Supplement | null>(null);
  const [formData, setFormData] = useState<SupplementFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSupplements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/supplements');
      if (!res.ok) throw new Error('Failed to load supplements');
      const data: Supplement[] = await res.json();
      setSupplements(data);
    } catch {
      setError('Failed to load supplements.');
    } finally {
      setLoading(false);
    }
  }, []);

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
    setFormData({
      name: supp.name,
      dosage: supp.dosage,
      frequency: supp.frequency,
      notes: supp.notes ?? '',
      startDate: toDateString(supp.startDate),
      endDate: toDateString(supp.endDate),
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
      const body = {
        name: formData.name.trim(),
        dosage: formData.dosage.trim(),
        frequency: formData.frequency.trim(),
        notes: formData.notes.trim() || null,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
      };

      if (editingSupp) {
        const res = await fetch(`/api/supplements/${editingSupp.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update supplement');
        const updated: Supplement = await res.json();
        setSupplements(prev => prev.map(s => s.id === updated.id ? updated : s));
      } else {
        const res = await fetch('/api/supplements', {
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
      const res = await fetch(`/api/supplements/${supp.id}`, { method: 'DELETE' });
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
      <Box sx={{ pt: 2, pb: 6, px: 2, maxWidth: 600, height: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
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
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
                  Add Supplement
                </Button>
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
