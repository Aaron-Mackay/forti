'use client';

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
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import { LibraryAsset, LibraryAssetType } from '@prisma/client';
import { useEffect, useMemo, useState } from 'react';
import LibraryAssetCard from './LibraryAssetCard';
import ImportLinksDialog from './ImportLinksDialog';
import { APPBAR_HEIGHT, HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';

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

interface EditForm {
  id: string;
  title: string;
  description: string;
}

type PreviewableDocumentExtension = 'pdf' | 'txt';

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

const DEFAULT_MAX_UPLOAD_MB = 50;

function parseMaxUploadMb() {
  const value = Number(process.env.NEXT_PUBLIC_LIBRARY_UPLOAD_MAX_MB ?? DEFAULT_MAX_UPLOAD_MB);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MAX_UPLOAD_MB;
  return Math.floor(value);
}

function buildFileHelper(maxUploadMb: number): Record<Exclude<LibraryAssetType, 'LINK'>, string> {
  return {
    DOCUMENT: `Accepted: PDF, DOC, DOCX, TXT (max ${maxUploadMb}MB)`,
    IMAGE: `Accepted: JPEG, PNG, WEBP, GIF (max ${maxUploadMb}MB)`,
    VIDEO: `Accepted: MP4, MOV, WEBM (max ${maxUploadMb}MB)`,
  };
}


function getFormErrors(
  form: AddForm,
  file: File | null,
  maxUploadBytes: number,
  maxUploadMb: number,
): { title?: string; url?: string; file?: string } {
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
  } else if (file.size > maxUploadBytes) {
    errs.file = `File is too large. Max ${maxUploadMb}MB.`;
  }
  return errs;
}

function EmptyState({ message }: { message: string }) {
  return (
    <Typography variant="body2" color="text.disabled" sx={{ py: 1, fontStyle: 'italic' }}>
      {message}
    </Typography>
  );
}

function SectionHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <Box mb={1.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
          {title}
        </Typography>
        {actions}
      </Stack>
      <Divider sx={{ mb: 1.5 }} />
    </Box>
  );
}

function getUrlExtension(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function getPreviewableDocumentExtension(asset: LibraryAsset): PreviewableDocumentExtension | null {
  if (asset.type !== 'DOCUMENT') return null;
  const extension = getUrlExtension(asset.url);
  if (extension === 'pdf' || extension === 'txt') return extension;
  return null;
}

function canOpenInViewer(asset: LibraryAsset): boolean {
  if (!asset.url) return false;
  return asset.type === 'IMAGE' || asset.type === 'VIDEO' || getPreviewableDocumentExtension(asset) !== null;
}

export default function LibraryClient({ ownAssets: initialOwn, coachAssets, coachName, isCoach, userId }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [ownAssets, setOwnAssets] = useState<LibraryAsset[]>(initialOwn);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [viewerAsset, setViewerAsset] = useState<LibraryAsset | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [textPreviewLoading, setTextPreviewLoading] = useState(false);
  const [textPreviewError, setTextPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<EditForm | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
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

  const maxUploadMb = useMemo(() => parseMaxUploadMb(), []);
  const maxUploadBytes = maxUploadMb * 1024 * 1024;
  const fileHelper = useMemo(() => buildFileHelper(maxUploadMb), [maxUploadMb]);

  const fileType = form.type === 'LINK' ? null : form.type;
  const fileAccept = useMemo(() => (fileType ? FILE_ACCEPT[fileType] : ''), [fileType]);
  const viewerDocumentType = viewerAsset ? getPreviewableDocumentExtension(viewerAsset) : null;

  useEffect(() => {
    if (!viewerAsset || viewerDocumentType !== 'txt' || !viewerAsset.url) {
      setTextPreview(null);
      setTextPreviewLoading(false);
      setTextPreviewError(null);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setTextPreview(null);
    setTextPreviewError(null);
    setTextPreviewLoading(true);

    fetch(viewerAsset.url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Could not load this text document.');
        }
        return await res.text();
      })
      .then((content) => {
        if (!active) return;
        setTextPreview(content);
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        setTextPreviewError(error instanceof Error ? error.message : 'Could not load this text document.');
      })
      .finally(() => {
        if (!active) return;
        setTextPreviewLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [viewerAsset, viewerDocumentType]);

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

  const isFormValid = useMemo(
    () => Object.keys(getFormErrors(form, file, maxUploadBytes, maxUploadMb)).length === 0,
    [form, file, maxUploadBytes, maxUploadMb],
  );

  const validate = (): boolean => {
    const errs = getFormErrors(form, file, maxUploadBytes, maxUploadMb);
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

  const handleAssetOpen = (asset: LibraryAsset) => {
    if (canOpenInViewer(asset)) {
      setViewerAsset(asset);
      return;
    }

    if (asset.url) {
      window.open(asset.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleViewerClose = () => {
    setViewerAsset(null);
  };

  const handleEditOpen = (asset: LibraryAsset) => {
    setEditingAsset({
      id: asset.id,
      title: asset.title,
      description: asset.description ?? '',
    });
    setEditError(null);
  };

  const handleEditClose = () => {
    if (editSubmitting) return;
    setEditingAsset(null);
    setEditError(null);
  };

  const isEditValid = Boolean(editingAsset?.title.trim());

  const handleEditSave = async () => {
    if (!editingAsset || !isEditValid) return;
    setEditSubmitting(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/library/${editingAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingAsset.title.trim(),
          description: editingAsset.description.trim() || null,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        setEditError(payload?.error ?? 'Update failed. Please try again.');
        return;
      }

      const updated: LibraryAsset = await res.json();
      setOwnAssets((prev) => prev.map((asset) => (asset.id === updated.id ? updated : asset)));
      setEditingAsset(null);
    } catch {
      setEditError('Update failed. Please check your connection and try again.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const libraryActions = (
    <Stack direction="row" spacing={1} alignItems="center">
      {isMobile ? (
        <>
          <Tooltip title="Upload">
            <IconButton
              aria-label="Upload"
              onClick={() => setAddOpen(true)}
              sx={{
                color: 'text.secondary',
                p: 0.75,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bulk upload links">
            <IconButton
              aria-label="Bulk upload links"
              onClick={() => setImportOpen(true)}
              sx={{
                color: 'text.secondary',
                p: 0.75,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <UploadFileIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ) : (
        <>
          <Button
            size="small"
            variant="text"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              px: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            Upload
          </Button>
          <Button
            size="small"
            variant="text"
            startIcon={<UploadFileIcon />}
            onClick={() => setImportOpen(true)}
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              px: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            Bulk Upload Links
          </Button>
        </>
      )}
    </Stack>
  );

  return (
    <Paper sx={{ minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto', px: 2, pt: 2, pb: 4 }}>
      {(coachAssets.length > 0 || coachName) && (
        <Box mb={3}>
          <SectionHeader title={coachName ? `From ${coachName}` : 'From Your Coach'} />
          {coachAssets.length === 0 ? (
            <EmptyState message="Your coach hasn't shared anything yet." />
          ) : (
            <Grid container spacing={1.5} alignItems="stretch">
              {coachAssets.map((asset) => (
                <Grid key={asset.id} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
                  <LibraryAssetCard
                    asset={asset}
                    canDelete={false}
                    canEdit={false}
                    onOpen={canOpenInViewer(asset) ? () => handleAssetOpen(asset) : null}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
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
            <Grid container spacing={1.5} alignItems="stretch">
              {sharedAssets.map((asset) => (
                <Grid key={asset.id} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
                  <LibraryAssetCard
                    asset={asset}
                    canDelete={asset.userId === userId}
                    canEdit={asset.userId === userId}
                    onOpen={canOpenInViewer(asset) ? () => handleAssetOpen(asset) : null}
                    onEdit={() => handleEditOpen(asset)}
                    onDelete={() => handleDelete(asset.id)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      <Box mb={3}>
        <SectionHeader title="My Library" actions={libraryActions} />
        {privateAssets.length === 0 ? (
          <EmptyState message="No items yet. Add your first resource below." />
        ) : (
          <Grid container spacing={1.5} alignItems="stretch">
            {privateAssets.map((asset) => (
              <Grid key={asset.id} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
                <LibraryAssetCard
                  asset={asset}
                  canDelete={asset.userId === userId}
                  canEdit={asset.userId === userId}
                  onOpen={canOpenInViewer(asset) ? () => handleAssetOpen(asset) : null}
                  onEdit={() => handleEditOpen(asset)}
                  onDelete={() => handleDelete(asset.id)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

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
                      const selected = event.target.files?.[0] ?? null;
                      if (selected && selected.size > maxUploadBytes) {
                        setFile(null);
                        setErrors((prev) => ({ ...prev, file: `File is too large. Max ${maxUploadMb}MB.` }));
                        return;
                      }
                      setFile(selected);
                      setErrors((prev) => ({ ...prev, file: undefined }));
                    }}
                  />
                </Button>
                <Typography variant="caption" color={errors.file ? 'error.main' : 'text.secondary'}>
                  {errors.file ?? (file ? `Selected: ${file.name}` : fileType ? fileHelper[fileType] : '')}
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
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !isFormValid}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {submitting ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editingAsset)} onClose={handleEditClose} fullWidth maxWidth="xs">
        <DialogTitle>Edit Asset</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} mt={0.5}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <TextField
              label="Title"
              value={editingAsset?.title ?? ''}
              onChange={(e) => setEditingAsset((current) => (current ? { ...current, title: e.target.value } : current))}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Description (optional)"
              value={editingAsset?.description ?? ''}
              onChange={(e) =>
                setEditingAsset((current) => (current ? { ...current, description: e.target.value } : current))
              }
              fullWidth
              size="small"
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose} disabled={editSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={editSubmitting || !isEditValid}
            startIcon={editSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {editSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(viewerAsset)}
        onClose={handleViewerClose}
        fullWidth
        maxWidth="lg"
        sx={{
          '& .MuiDialog-container': {
            alignItems: { xs: 'center', md: 'flex-start' },
          },
          '& .MuiDialog-paper': {
            mt: { xs: 2, md: `calc(${APPBAR_HEIGHT}px + 12px)` },
            mb: 2,
            maxHeight: {
              xs: 'calc(100dvh - 32px)',
              md: `calc(100dvh - ${APPBAR_HEIGHT}px - 28px)`,
            },
            width: 'calc(100% - 32px)',
          },
        }}
      >
        <DialogTitle sx={{ pr: 7 }}>
          {viewerAsset?.title}
          <IconButton
            aria-label="Close viewer"
            onClick={handleViewerClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {viewerAsset?.type === 'IMAGE' && viewerAsset.url && (
              <Box
                component="img"
                src={viewerAsset.url}
                alt={viewerAsset.title}
                sx={{
                  width: '100%',
                  maxHeight: `calc(100dvh - ${APPBAR_HEIGHT}px - 180px)`,
                  objectFit: 'contain',
                  borderRadius: 2,
                  bgcolor: 'background.default',
                }}
              />
            )}

            {viewerAsset?.type === 'VIDEO' && viewerAsset.url && (
              <Box
                component="video"
                src={viewerAsset.url}
                controls
                playsInline
                preload="metadata"
                sx={{
                  width: '100%',
                  maxHeight: `calc(100dvh - ${APPBAR_HEIGHT}px - 180px)`,
                  borderRadius: 2,
                  bgcolor: 'common.black',
                }}
              />
            )}

            {viewerDocumentType === 'pdf' && viewerAsset?.url && (
              <Box
                component="iframe"
                src={viewerAsset.url}
                title={viewerAsset.title}
                sx={{
                  width: '100%',
                  height: `calc(100dvh - ${APPBAR_HEIGHT}px - 180px)`,
                  border: 0,
                  borderRadius: 2,
                  bgcolor: 'background.default',
                }}
              />
            )}

            {viewerDocumentType === 'txt' && (
              <Box
                sx={{
                  minHeight: { xs: 320, md: 480 },
                  maxHeight: `calc(100dvh - ${APPBAR_HEIGHT}px - 180px)`,
                  overflow: 'auto',
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                {textPreviewLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 'inherit' }}>
                    <CircularProgress size={28} />
                  </Stack>
                ) : textPreviewError ? (
                  <Alert severity="error">{textPreviewError}</Alert>
                ) : (
                  <Typography
                    component="pre"
                    sx={{
                      m: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: '0.9rem',
                    }}
                  >
                    {textPreview ?? ''}
                  </Typography>
                )}
              </Box>
            )}

            {viewerAsset?.description && (
              <Typography variant="body2" color="text.secondary">
                {viewerAsset.description}
              </Typography>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </Paper>
  );
}
