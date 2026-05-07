'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CheckInPhotoTile from '@/components/checkin/CheckInPhotoTile';
import PhotoViewerDialog, { type PhotoAngle, type PhotoViewerHistory } from '@/components/checkin/PhotoViewerDialog';
import type { PhotoHistoryEntry } from '@/lib/contracts/checkIn';

interface CurrentCheckIn {
  id: number;
  weekStartDate: string | Date;
  frontPhotoUrl: string | null;
  sidePhotoUrl: string | null;
  backPhotoUrl: string | null;
}

interface Props {
  currentCheckIn: CurrentCheckIn;
}

const ANGLES: PhotoAngle[] = ['front', 'side', 'back'];
const ANGLE_LABEL: Record<PhotoAngle, string> = { front: 'Front', side: 'Side', back: 'Back' };
const ANGLE_FIELD: Record<PhotoAngle, 'frontPhotoUrl' | 'sidePhotoUrl' | 'backPhotoUrl'> = {
  front: 'frontPhotoUrl',
  side: 'sidePhotoUrl',
  back: 'backPhotoUrl',
};

interface Entry {
  id: number;
  weekStartDate: Date;
  frontPhotoUrl: string | null;
  sidePhotoUrl: string | null;
  backPhotoUrl: string | null;
}

function formatWeek(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function entryHasAngle(entry: Pick<Entry, 'frontPhotoUrl' | 'sidePhotoUrl' | 'backPhotoUrl'>, angle: PhotoAngle) {
  return Boolean(entry[ANGLE_FIELD[angle]]);
}

function pickInitialAngle(current: CurrentCheckIn, history: Entry[]): PhotoAngle {
  for (const angle of ANGLES) {
    if (current[ANGLE_FIELD[angle]]) return angle;
  }
  for (const entry of history) {
    for (const angle of ANGLES) {
      if (entry[ANGLE_FIELD[angle]]) return angle;
    }
  }
  return 'front';
}

export default function CheckInPhotoCompare({ currentCheckIn }: Props) {
  const [history, setHistory] = useState<Entry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [angle, setAngle] = useState<PhotoAngle>('front');
  const [comparisonId, setComparisonId] = useState<number | null>(null);
  const [activePhoto, setActivePhoto] = useState<
    { src: string; alt: string; entryId: number; angle: PhotoAngle } | null
  >(null);
  const [angleInitialised, setAngleInitialised] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/coach/check-ins/${currentCheckIn.id}/photo-history`)
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load photo history');
        return res.json() as Promise<{ entries: PhotoHistoryEntry[] }>;
      })
      .then(data => {
        if (cancelled) return;
        const parsed: Entry[] = data.entries.map(e => ({
          id: e.id,
          weekStartDate: new Date(e.weekStartDate),
          frontPhotoUrl: e.frontPhotoUrl,
          sidePhotoUrl: e.sidePhotoUrl,
          backPhotoUrl: e.backPhotoUrl,
        }));
        setHistory(parsed);
      })
      .catch(err => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load photo history');
        setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentCheckIn.id]);

  useEffect(() => {
    if (history === null || angleInitialised) return;
    setAngle(pickInitialAngle(currentCheckIn, history));
    setAngleInitialised(true);
  }, [history, angleInitialised, currentCheckIn]);

  useEffect(() => {
    if (history === null) return;
    const matchForAngle = history.find(entry => entryHasAngle(entry, angle));
    setComparisonId(prev => {
      if (prev !== null && history.some(entry => entry.id === prev)) return prev;
      return matchForAngle?.id ?? history[0]?.id ?? null;
    });
  }, [history, angle]);

  const comparisonEntry = useMemo(() => {
    if (history === null || comparisonId === null) return null;
    return history.find(entry => entry.id === comparisonId) ?? null;
  }, [history, comparisonId]);

  useEffect(() => {
    if (history === null || comparisonEntry === null) return;
    if (typeof window === 'undefined') return;
    const idx = history.findIndex(e => e.id === comparisonEntry.id);
    const neighbours = [history[idx - 1], history[idx + 1]].filter((e): e is Entry => Boolean(e));
    const idleId = (window.requestIdleCallback ?? window.setTimeout)(() => {
      for (const neighbour of neighbours) {
        const url = neighbour[ANGLE_FIELD[angle]];
        if (!url) continue;
        const img = new window.Image();
        img.src = url;
      }
    }, { timeout: 1500 } as IdleRequestOptions);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idleId as number);
      else window.clearTimeout(idleId as number);
    };
  }, [history, comparisonEntry, angle]);

  const currentWeekLabel = useMemo(
    () => formatWeek(new Date(currentCheckIn.weekStartDate)),
    [currentCheckIn.weekStartDate],
  );

  const allEntriesForDialog = useMemo(() => {
    const currentEntry: Entry = {
      id: currentCheckIn.id,
      weekStartDate: new Date(currentCheckIn.weekStartDate),
      frontPhotoUrl: currentCheckIn.frontPhotoUrl,
      sidePhotoUrl: currentCheckIn.sidePhotoUrl,
      backPhotoUrl: currentCheckIn.backPhotoUrl,
    };
    return [currentEntry, ...(history ?? [])].sort(
      (a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime(),
    );
  }, [currentCheckIn, history]);

  if (history === null) {
    return (
      <Section>
        <Header />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
          <Skeleton variant="rounded" sx={{ aspectRatio: '4 / 5', width: '100%' }} />
          <Skeleton variant="rounded" sx={{ aspectRatio: '4 / 5', width: '100%' }} />
        </Box>
      </Section>
    );
  }

  const hasAnyPhotos =
    Boolean(currentCheckIn.frontPhotoUrl || currentCheckIn.sidePhotoUrl || currentCheckIn.backPhotoUrl) ||
    history.some(entry => entry.frontPhotoUrl || entry.sidePhotoUrl || entry.backPhotoUrl);

  if (!hasAnyPhotos) return null;

  const currentSrc = currentCheckIn[ANGLE_FIELD[angle]];
  const compareSrc = comparisonEntry ? comparisonEntry[ANGLE_FIELD[angle]] : null;

  function openDialog(entryId: number, src: string) {
    const entry = allEntriesForDialog.find(e => e.id === entryId);
    if (!entry) return;
    setActivePhoto({
      src,
      alt: `${ANGLE_LABEL[angle]} photo, week of ${formatWeek(entry.weekStartDate)}`,
      entryId,
      angle,
    });
  }

  const dialogEntry = activePhoto
    ? allEntriesForDialog.find(e => e.id === activePhoto.entryId) ?? null
    : null;
  const dialogIdx = dialogEntry
    ? allEntriesForDialog.findIndex(e => e.id === dialogEntry.id)
    : -1;

  const dialogHistory: PhotoViewerHistory | undefined = activePhoto && dialogEntry ? {
    weekLabel: formatWeek(dialogEntry.weekStartDate),
    angle: activePhoto.angle,
    availableAngles: ANGLES.filter(a => Boolean(dialogEntry[ANGLE_FIELD[a]])),
    canPrev: dialogIdx < allEntriesForDialog.length - 1,
    canNext: dialogIdx > 0,
    onAngleChange: nextAngle => {
      const url = dialogEntry[ANGLE_FIELD[nextAngle]];
      if (!url) return;
      setActivePhoto({
        src: url,
        alt: `${ANGLE_LABEL[nextAngle]} photo, week of ${formatWeek(dialogEntry.weekStartDate)}`,
        entryId: dialogEntry.id,
        angle: nextAngle,
      });
    },
    onPrev: () => {
      const next = allEntriesForDialog[dialogIdx + 1];
      if (!next) return;
      const angleForNext: PhotoAngle = entryHasAngle(next, activePhoto.angle)
        ? activePhoto.angle
        : (ANGLES.find(a => entryHasAngle(next, a)) ?? activePhoto.angle);
      const url = next[ANGLE_FIELD[angleForNext]];
      if (!url) return;
      setActivePhoto({
        src: url,
        alt: `${ANGLE_LABEL[angleForNext]} photo, week of ${formatWeek(next.weekStartDate)}`,
        entryId: next.id,
        angle: angleForNext,
      });
    },
    onNext: () => {
      const next = allEntriesForDialog[dialogIdx - 1];
      if (!next) return;
      const angleForNext: PhotoAngle = entryHasAngle(next, activePhoto.angle)
        ? activePhoto.angle
        : (ANGLES.find(a => entryHasAngle(next, a)) ?? activePhoto.angle);
      const url = next[ANGLE_FIELD[angleForNext]];
      if (!url) return;
      setActivePhoto({
        src: url,
        alt: `${ANGLE_LABEL[angleForNext]} photo, week of ${formatWeek(next.weekStartDate)}`,
        entryId: next.id,
        angle: angleForNext,
      });
    },
  } : undefined;

  return (
    <Section>
      <Header />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={angle}
          onChange={(_, val: PhotoAngle | null) => {
            if (val) setAngle(val);
          }}
          aria-label="Photo angle"
        >
          {ANGLES.map(a => (
            <ToggleButton key={a} value={a}>
              {ANGLE_LABEL[a]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
        <Box>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              This week
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {currentWeekLabel}
            </Typography>
          </Box>
          <CheckInPhotoTile
            src={currentSrc}
            alt={`${ANGLE_LABEL[angle]} progress photo, week of ${currentWeekLabel}`}
            onClick={src => openDialog(currentCheckIn.id, src)}
          />
        </Box>

        <Box>
          {history.length === 0 ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Compare with
              </Typography>
              <Box
                sx={{
                  mt: 0.5,
                  aspectRatio: '4 / 5',
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No earlier photos yet
                </Typography>
              </Box>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Compare with
                </Typography>
                <Select
                  size="small"
                  fullWidth
                  value={comparisonId ?? ''}
                  onChange={event => setComparisonId(Number(event.target.value))}
                  inputProps={{ 'aria-label': 'Compare with week', 'data-testid': 'photo-compare-week' }}
                  sx={{ mt: 0.5 }}
                >
                  {history.map(entry => (
                    <MenuItem key={entry.id} value={entry.id}>
                      Week of {formatWeek(entry.weekStartDate)}
                      {!entryHasAngle(entry, angle) ? ' (no ' + ANGLE_LABEL[angle].toLowerCase() + ' photo)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
              <CheckInPhotoTile
                src={compareSrc}
                alt={
                  comparisonEntry
                    ? `${ANGLE_LABEL[angle]} progress photo, week of ${formatWeek(comparisonEntry.weekStartDate)}`
                    : `${ANGLE_LABEL[angle]} progress photo`
                }
                onClick={comparisonEntry && compareSrc
                  ? src => openDialog(comparisonEntry.id, src)
                  : undefined}
              />
            </>
          )}
        </Box>
      </Box>

      {loadError && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {loadError}
        </Typography>
      )}

      <PhotoViewerDialog
        photo={activePhoto ? { src: activePhoto.src, alt: activePhoto.alt } : null}
        onClose={() => setActivePhoto(null)}
        history={dialogHistory}
      />
    </Section>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
      }}
    >
      {children}
    </Paper>
  );
}

function Header() {
  return (
    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
      Progress photos
    </Typography>
  );
}
