'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  ButtonBase,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Overlay } from '@/components/signal/overlay';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import { useAppBar } from '@lib/providers/AppBarProvider';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';

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

const palette = signalTokens.surface.planning;

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
  signalEnabled?: boolean;
}

function SupplementCard({ supplement, readOnly, onEdit, onDelete, signalEnabled = false }: SupplementCardProps) {
  const [versionsOpen, setVersionsOpen] = useState(false);
  const active = getActiveVersion(supplement);

  if (signalEnabled) {
    return (
      <div
        data-signal-supplement-card
        style={{
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          padding: '16px 16px 14px',
          background: palette.surface,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.01em', marginBottom: 6 }}>
              {supplement.name}
            </div>
            <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.45 }}>
              {active?.dosage} · {active?.frequency}
            </div>
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginTop: 8 }}>
              {formatDateRange(supplement.startDate, supplement.endDate)}
            </div>
            {active?.notes ? (
              <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.55, marginTop: 10 }}>
                {active.notes}
              </div>
            ) : null}
          </div>
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
        </div>

        {supplement.versions.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setVersionsOpen((value) => !value)}
              style={{
                marginTop: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: 0,
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                color: palette.inkMid,
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 11,
              }}
            >
              <span>
                Change history ({supplement.versions.length} {supplement.versions.length === 1 ? 'entry' : 'entries'})
              </span>
              <ExpandMoreIcon
                fontSize="small"
                sx={{
                  transition: 'transform 0.2s',
                  transform: versionsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  fontSize: '16px',
                }}
              />
            </button>
            <Collapse in={versionsOpen}>
              <SupplementVersionTimeline versions={supplement.versions} />
            </Collapse>
          </>
        )}
      </div>
    );
  }

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
  signalEnabled = false,
}: {
  readOnly?: boolean;
  initialSupplements?: Supplement[];
  apiBase?: string;
  embedded?: boolean;
  signalEnabled?: boolean;
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

  if (signalEnabled) {
    return (
      <>
        {!embedded && <AppBarSetter />}
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
              [data-signal-supplements-shell] {
                max-width: 860px;
                margin: 0 auto;
              }
              [data-signal-supplements-summary] {
                grid-template-columns: repeat(3, minmax(0, 1fr));
              }
            }
          `}</style>

          <div data-signal-supplements-shell>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <section
              style={{
                background: palette.surface,
                border: `1px solid ${palette.borderStrong}`,
                borderRadius: signalTokens.radii.cardLarge,
                padding: '20px 20px 18px',
              }}
            >
              <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.deep, marginBottom: 6 }}>
                Supplements
              </div>
              <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 10 }}>
                Protocol tracker
              </div>
              <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, maxWidth: 620 }}>
                Track your active stack, keep finished protocols in history, and update dosage changes without losing the timeline.
              </div>

              <div
                data-signal-supplements-summary
                style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginTop: 18 }}
              >
                <SignalSummaryCard
                  label="Active"
                  value={String(active.length)}
                  detail={active.length > 0 ? 'Current supplements still in your stack.' : 'No active protocols right now.'}
                />
                <SignalSummaryCard
                  label="History"
                  value={String(history.length)}
                  detail={history.length > 0 ? 'Ended supplements stay archived below.' : 'Past protocols will build here.'}
                />
                <SignalSummaryCard
                  label="Status"
                  value={active.length > 0 ? 'Live' : 'Idle'}
                  detail={active.length > 0 ? 'You have at least one ongoing supplement.' : 'Nothing ongoing is being tracked.'}
                />
              </div>
            </section>

            {loading ? (
              <section
                data-signal-supplements-loading
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
                      Stack
                    </div>
                    <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.01em', marginBottom: 6 }}>
                      Loading supplement history
                    </div>
                    <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.55 }}>
                      Pulling your latest active and archived protocols.
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <>
                <section style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 8 }}>
                    Active
                  </div>
                  {active.length === 0 ? (
                    <section
                      data-signal-supplements-empty
                      style={{
                        border: `1px solid ${palette.border}`,
                        borderRadius: signalTokens.radii.cardLarge,
                        padding: '18px 16px',
                        background: palette.surfaceAlt,
                      }}
                    >
                      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.01em', marginBottom: 8 }}>
                        No active supplements.
                      </div>
                      <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.55 }}>
                        Add your current protocol to keep dosage changes and ended cycles in one place.
                      </div>
                    </section>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {active.map((supplement) => (
                        <SupplementCard
                          key={supplement.id}
                          supplement={supplement}
                          readOnly={readOnly}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          signalEnabled
                        />
                      ))}
                    </div>
                  )}
                </section>

                {history.length > 0 ? (
                  <section style={{ marginTop: 18 }}>
                    <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 8 }}>
                      History
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {history.map((supplement) => (
                        <SupplementCard
                          key={supplement.id}
                          supplement={supplement}
                          readOnly={readOnly}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          signalEnabled
                        />
                      ))}
                    </div>
                  </section>
                ) : null}

                {!readOnly ? (
                  <button
                    type="button"
                    onClick={openAdd}
                    aria-label="Add supplement"
                    style={{
                      marginTop: 18,
                      width: '100%',
                      minHeight: 52,
                      borderRadius: signalTokens.radii.cardLarge,
                      border: `1px dashed ${palette.borderStrong}`,
                      background: palette.surface,
                      color: palette.ink,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontFamily: signalTokens.fontVar.body,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    <AddIcon sx={{ fontSize: '1rem' }} />
                    Add supplement
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>

        <Overlay
          open={dialogOpen}
          onClose={handleDialogClose}
          title={editingSupp ? 'Edit supplement' : 'Add supplement'}
          size="md"
          primaryAction={{ label: saving ? 'Saving…' : 'Save', onClick: handleSave, disabled: saving }}
          ghostAction={{ label: 'Cancel', onClick: handleDialogClose }}
        >
          <Stack spacing={2} sx={{ mt: 1, pb: 1 }}>
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
        </Overlay>
      </>
    );
  }

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

      <Overlay
        open={dialogOpen}
        onClose={handleDialogClose}
        title={editingSupp ? 'Edit supplement' : 'Add supplement'}
        size="md"
        primaryAction={{ label: saving ? 'Saving…' : 'Save', onClick: handleSave, disabled: saving }}
        ghostAction={{ label: 'Cancel', onClick: handleDialogClose }}
      >
        <Stack spacing={2} sx={{ mt: 1, pb: 1 }}>
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
      </Overlay>
    </>
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
