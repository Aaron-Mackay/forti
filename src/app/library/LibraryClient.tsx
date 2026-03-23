'use client';

import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { LibraryAsset, LibraryAssetType } from '@prisma/client';
import { useState } from 'react';
import LibraryAssetCard from './LibraryAssetCard';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';

interface Props {
  ownAssets: LibraryAsset[];
  coachAssets: LibraryAsset[];
  coachName: string | null;
  isCoach: boolean;
  userId: string;
}

interface AddForm {
  type: LibraryAssetType;
  title: string;
  description: string;
  url: string;
  isCoachAsset: boolean;
}

const PLACEHOLDER_TYPES: LibraryAssetType[] = ['DOCUMENT', 'IMAGE', 'VIDEO'];

const TYPE_LABELS: Record<LibraryAssetType, string> = {
  LINK: 'Link',
  DOCUMENT: 'Document',
  IMAGE: 'Image',
  VIDEO: 'Video',
};

function EmptyState({ message }: { message: string }) {
  return (
    <Typography variant="body2" color="text.disabled" sx={{ py: 1, fontStyle: 'italic' }}>
      {message}
    </Typography>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1.5 }} />
    </>
  );
}

export default function LibraryClient({ ownAssets: initialOwn, coachAssets, coachName, isCoach, userId }: Props) {
  const [ownAssets, setOwnAssets] = useState<LibraryAsset[]>(initialOwn);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<AddForm>({
    type: 'LINK',
    title: '',
    description: '',
    url: '',
    isCoachAsset: false,
  });
  const [errors, setErrors] = useState<{ title?: string; url?: string }>({});

  const privateAssets = ownAssets.filter((a) => !a.isCoachAsset);
  const sharedAssets = ownAssets.filter((a) => a.isCoachAsset);

  const resetForm = () => {
    setForm({ type: 'LINK', title: '', description: '', url: '', isCoachAsset: false });
    setErrors({});
  };

  const handleClose = () => {
    setAddOpen(false);
    resetForm();
  };

  const validate = (): boolean => {
    const errs: { title?: string; url?: string } = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (form.type === 'LINK') {
      if (!form.url.trim()) {
        errs.url = 'URL is required for links';
      } else if (!/^https?:\/\/.+/.test(form.url.trim())) {
        errs.url = 'Must start with http:// or https://';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim(),
          description: form.description.trim() || null,
          url: form.type === 'LINK' ? form.url.trim() : null,
          isCoachAsset: isCoach && form.isCoachAsset,
        }),
      });
      if (res.ok) {
        const created: LibraryAsset = await res.json();
        setOwnAssets((prev) => [created, ...prev]);
        handleClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setOwnAssets((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/library/${id}`, { method: 'DELETE' });
  };

  const isPlaceholder = PLACEHOLDER_TYPES.includes(form.type);

  return (
    <Paper sx={{ minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto', px: 2, pt: 2, pb: 4 }}>
      {/* Coach assets section — shown when user has a coach */}
      {(coachAssets.length > 0 || coachName) && (
        <Box mb={3}>
          <SectionHeader title={coachName ? `From ${coachName}` : 'From Your Coach'} />
          {coachAssets.length === 0 ? (
            <EmptyState message="Your coach hasn't shared anything yet." />
          ) : (
            <Grid container spacing={1.5}>
              {coachAssets.map((asset) => (
                <Grid key={asset.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <LibraryAssetCard asset={asset} canDelete={false} onDelete={() => {}} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Coach's own shared-with-clients section */}
      {isCoach && (
        <Box mb={3}>
          <SectionHeader title="Shared with Clients" />
          {sharedAssets.length === 0 ? (
            <EmptyState message="You haven't shared anything with your clients yet." />
          ) : (
            <Grid container spacing={1.5}>
              {sharedAssets.map((asset) => (
                <Grid key={asset.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <LibraryAssetCard
                    asset={asset}
                    canDelete={asset.userId === userId}
                    onDelete={() => handleDelete(asset.id)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Private assets section */}
      <Box mb={3}>
        <SectionHeader title="My Library" />
        {privateAssets.length === 0 ? (
          <EmptyState message="No items yet. Add your first resource below." />
        ) : (
          <Grid container spacing={1.5}>
            {privateAssets.map((asset) => (
              <Grid key={asset.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <LibraryAssetCard
                  asset={asset}
                  canDelete={asset.userId === userId}
                  onDelete={() => handleDelete(asset.id)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setAddOpen(true)}
        sx={{ mt: 1 }}
      >
        Add to Library
      </Button>

      {/* Add dialog */}
      <Dialog open={addOpen} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogTitle>Add to Library</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} mt={0.5}>
            {/* Type selector */}
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
                Type
              </Typography>
              <ToggleButtonGroup
                value={form.type}
                exclusive
                onChange={(_e, val) => val && setForm((f) => ({ ...f, type: val as LibraryAssetType, url: '' }))}
                size="small"
                fullWidth
              >
                {(Object.keys(TYPE_LABELS) as LibraryAssetType[]).map((t) => (
                  <ToggleButton key={t} value={t} sx={{ flexDirection: 'column', gap: 0.25, py: 0.75 }}>
                    <Typography variant="caption" lineHeight={1}>
                      {TYPE_LABELS[t]}
                    </Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              {isPlaceholder && (
                <Chip
                  label="Coming soon — placeholder only"
                  size="small"
                  sx={{ mt: 1, fontSize: '0.65rem', height: 20 }}
                />
              )}
            </Box>

            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              error={!!errors.title}
              helperText={errors.title}
              fullWidth
              size="small"
              required
            />

            <TextField
              label="Description (optional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              size="small"
              multiline
              rows={2}
            />

            {form.type === 'LINK' && (
              <TextField
                label="URL"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                error={!!errors.url}
                helperText={errors.url}
                fullWidth
                size="small"
                required
                placeholder="https://"
                inputProps={{ inputMode: 'url' }}
              />
            )}

            {isCoach && (
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isCoachAsset}
                    onChange={(e) => setForm((f) => ({ ...f, isCoachAsset: e.target.checked }))}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">Share with my clients</Typography>
                }
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
