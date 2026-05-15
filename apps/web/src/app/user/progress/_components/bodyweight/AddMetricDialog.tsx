'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { updateUserSettings } from '@lib/clientApi';
import type { CustomMetricDef, Settings } from '@/types/settingsTypes';

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `cm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  existingCustomMetrics: CustomMetricDef[];
  onSaved: (next: Settings) => void;
};

export function AddMetricDialog({ open, onClose, existingCustomMetrics, onSaved }: Props) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setTarget('');
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    setBusy(true);
    setError(null);

    const targetNum = target.trim() === '' ? null : Number(target);
    if (targetNum != null && !Number.isFinite(targetNum)) {
      setBusy(false);
      setError('Target must be a number');
      return;
    }

    const next: CustomMetricDef = {
      id: generateId(),
      name: trimmed,
      target: targetNum,
    };
    const customMetrics = [...existingCustomMetrics, next];

    try {
      const res = await updateUserSettings({ customMetrics });
      onSaved(res.settings);
      onClose();
    } catch {
      setBusy(false);
      setError('Failed to save. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add a metric</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            autoFocus
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Energy, Resting HR, Waist"
            fullWidth
          />
          <TextField
            label="Target (optional)"
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            helperText="A small target (e.g. 5) renders the value as ‘n / 5’."
            fullWidth
          />
          {error && (
            <Box sx={{ color: 'error.main', fontSize: 13 }}>{error}</Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={handleSave} disabled={busy || !name.trim()} variant="contained">
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
