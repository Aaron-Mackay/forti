'use client';

import {
  Alert,
  Box,
  Button,
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
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { LibraryAsset, LibraryAssetType } from '@prisma/client';
import { useMemo, useState } from 'react';
import LibraryAssetCard from './LibraryAssetCard';
import ImportLinksDialog from './ImportLinksDialog';
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

const TYPE_LABELS: Record<LibraryAssetType, string> = {
  LINK: 'Link',
  DOCUMENT: 'Document',
  IMAGE: 'Image',
  VIDEO: 'Video',
};

const FILE_ACCEPT: Record<Exclude<LibraryAssetType, 'LINK'>, string> = {
  DOCUMENT: '.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain',
  IMAGE: 'image/*',
  VIDEO: 'video/mp4,video/quicktime,video/webm',
};

const FILE_HELPER: Record<Exclude<LibraryAssetType, 'LINK'>, string> = {
  DOCUMENT: 'Accepted: PDF, DOC, DOCX, TXT (max 50MB)',
  IMAGE: 'Accepted: JPEG, PNG, WEBP, GIF (max 50MB)',
  VIDEO: 'Accepted: MP4, MOV, WEBM (max 50MB)',
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
  const [importOpen, setImportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<AddForm>({
    type: 'LINK',
    title: '',
    description: '',
    url: '',
    isCoachAsset: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ title?: string; url?: string; file?: string }>({});

  const privateAssets = ownAssets.filter((a) => !a.isCoachAsset);
  const sharedAssets = ownAssets.filter((a) => a.isCoachAsset);

  const fileType = form.type === 'LINK' ? null : form.type;
  const fileAccept = useMemo(() => (fileType ? FILE_ACCEPT[fileType] : ''), [fileType]);

  const resetForm = () => {
    setForm({ type: 'LINK', title: '', description: '', url: '', isCoachAsset: false });
    setFile(null);
    setErrors({});
    setSubmitError(null);
  };

  const handleClose = () => {
    setAddOpen(false);
    resetForm();
  };

  const validate = (): boolean => {
    const errs: { title?: string; url?: string; file?: string } = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (form.type === 'LINK') {
      if (!form.url.trim()) {
        errs.url = 'URL is required for links';
      } else if (!/^https?:\/\/.+/.test(form.url.trim())) {
        errs.url = 'Must start with http:// or https://';
      }
    } else if (!file) {
      errs.file = 'Please choose a file to upload';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const endpoint = form.type === 'LINK' ? '/api/library' : '/api/library/upload';
      const options =
        form.type === 'LINK'
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: form.type,
                title: form.title.trim(),
                description: form.description.trim() || null,
                url: form.url.trim(),
                isCoachAsset: isCoach && form.isCoachAsset,
              }),
            }
          : (() => {
              const payload = new FormData();
              payload.append('type', form.type);
              payload.append('title', form.title.trim());
              payload.append('description', form.description.trim());
              payload.append('isCoachAsset', String(isCoach && form.isCoachAsset));
              payload.append('file', file!);
              return { method: 'POST', body: payload };
            })();

      const res = await fetch(endpoint, options);
      if (res.ok) {
        const created: LibraryAsset = await res.json();
        setOwnAssets((prev) => [created, ...prev]);
        handleClose();
      } else {
        let message = 'Upload failed. Please try again.';
        try {
          const payload = await res.json() as { error?: string };
          if (payload?.error) message = payload.error;
        } catch {
          // Ignore JSON parse issues and fall back to default message
        }
        setSubmitError(message);
      }
    } catch {
      setSubmitError('Upload failed. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setOwnAssets((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/library/${id}`, { method: 'DELETE' });
  };

  return (
    <Paper sx={{ minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto', px: 2, pt: 2, pb: 4 }}>
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

      <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Add to Library
        </Button>
        <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setImportOpen(true)}>
          Bulk Upload Links
        </Button>
      </Stack>

      <ImportLinksDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(created) => setOwnAssets((prev) => [...created, ...prev])}
        isCoach={isCoach}
      />

      <Dialog open={addOpen} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogTitle>Add to Library</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} mt={0.5}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
                Type
              </Typography>
              <ToggleButtonGroup
                value={form.type}
                exclusive
                onChange={(_e, val) => {
                  if (!val) return;
                  setForm((f) => ({ ...f, type: val as LibraryAssetType, url: '' }));
                  setFile(null);
                  setErrors({});
                }}
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

            {form.type === 'LINK' ? (
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
            ) : (
              <Stack spacing={1}>
                <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                  {file ? 'Change file' : 'Choose file'}
                  <input
                    hidden
                    type="file"
                    accept={fileAccept}
                    onChange={(event) => {
                      setFile(event.target.files?.[0] ?? null);
                      setErrors((prev) => ({ ...prev, file: undefined }));
                    }}
                  />
                </Button>
                <Typography variant="caption" color={errors.file ? 'error.main' : 'text.secondary'}>
                  {errors.file ?? (file ? `Selected: ${file.name}` : fileType ? FILE_HELPER[fileType] : '')}
                </Typography>
              </Stack>
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
                label={<Typography variant="body2">Share with my clients</Typography>}
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
