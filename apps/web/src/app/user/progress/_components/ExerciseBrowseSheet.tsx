'use client';

import { useState, useEffect } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import { listExercises, getExerciseE1rmHistory } from '@lib/clientApi';
import type { ExerciseListResponse } from '@lib/contracts/exercises';
import type { E1rmHistoryPoint } from '@lib/contracts/exerciseHistory';
import type { WeightUnit } from '@/lib/units';
import { formatWeight } from '@/lib/units';
import E1rmSparkline from '@/app/user/workout/E1rmSparkline';

const palette = signalTokens.surface.planning;
type Exercise = ExerciseListResponse[number];

export function ExerciseBrowseSheet({
  open,
  onClose,
  weightUnit,
}: {
  open: boolean;
  onClose: () => void;
  weightUnit: WeightUnit;
}) {
  const [search, setSearch] = useState('');
  const [exercises, setExercises] = useState<ExerciseListResponse | null>(null);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<E1rmHistoryPoint[] | null>(null);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelected(null);
      setHistory(null);
      setExercises(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setExercises(null);
    const trimmed = search.trim();
    const delay = trimmed ? 250 : 0;
    const id = setTimeout(() => {
      listExercises(trimmed ? { search: trimmed, take: 25 } : { sortBy: 'recent', take: 25 })
        .then(setExercises)
        .catch(() => setExercises([]));
    }, delay);
    return () => clearTimeout(id);
  }, [open, search]);

  useEffect(() => {
    if (!selected) { setHistory(null); return; }
    setHistory(null);
    getExerciseE1rmHistory(selected.id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [selected]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Browse exercises"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.55)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: palette.bg,
          color: palette.ink,
          fontFamily: signalTokens.fontVar.body,
          maxHeight: '88dvh',
          overflowY: 'auto',
          borderTop: `1px solid ${palette.border}`,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{ width: 36, height: 4, background: palette.borderStrong, borderRadius: 2 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 18px 14px', borderBottom: `1px solid ${palette.border}` }}>
          <div>
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight, marginBottom: 4 }}>
              {selected ? 'Exercise history' : 'Browse exercises'}
            </div>
            <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>
              {selected ? selected.name : 'All exercises'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {selected && (
              <button
                type="button"
                onClick={() => { setSelected(null); setHistory(null); }}
                style={{
                  appearance: 'none',
                  background: 'transparent',
                  color: palette.inkMid,
                  border: `1px solid ${palette.border}`,
                  fontSize: 12,
                  fontFamily: signalTokens.fontVar.mono,
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: signalTokens.radii.card,
                }}
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{ appearance: 'none', background: 'transparent', color: palette.ink, border: 'none', fontSize: 20, cursor: 'pointer', padding: 8, marginRight: -8 }}
            >
              ×
            </button>
          </div>
        </div>

        {selected ? (
          <ExerciseDetail exercise={selected} history={history} weightUnit={weightUnit} />
        ) : (
          <ExerciseList search={search} onSearchChange={setSearch} exercises={exercises} onSelect={setSelected} />
        )}
      </div>
    </div>
  );
}

function ExerciseList({
  search,
  onSearchChange,
  exercises,
  onSelect,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  exercises: ExerciseListResponse | null;
  onSelect: (ex: Exercise) => void;
}) {
  return (
    <div>
      <div style={{ padding: '14px 18px 0' }}>
        <input
          type="search"
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            background: palette.surface,
            color: palette.ink,
            border: `1px solid ${palette.border}`,
            borderRadius: signalTokens.radii.card,
            padding: '10px 12px',
            fontFamily: signalTokens.fontVar.body,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ padding: '10px 18px 28px' }}>
        {exercises === null ? (
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, padding: '24px 0', textAlign: 'center' }}>
            Loading…
          </div>
        ) : exercises.length === 0 ? (
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, padding: '24px 0', textAlign: 'center' }}>
            No exercises found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {exercises.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onSelect(ex)}
                style={{
                  appearance: 'none',
                  width: '100%',
                  background: palette.surface,
                  border: `1px solid ${palette.border}`,
                  borderRadius: signalTokens.radii.card,
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: palette.ink,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500 }}>{ex.name}</span>
                {ex.category && (
                  <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight, flexShrink: 0 }}>
                    {ex.category}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseDetail({
  exercise,
  history,
  weightUnit,
}: {
  exercise: Exercise;
  history: E1rmHistoryPoint[] | null;
  weightUnit: WeightUnit;
}) {
  const hasData = history !== null && history.length > 0;
  const mostRecent = hasData ? history[history.length - 1].bestE1rm : null;
  const allTimeBest = hasData ? Math.max(...history.map((p) => p.bestE1rm)) : null;

  return (
    <div style={{ padding: '16px 18px 28px' }}>
      {exercise.category && (
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 14 }}>
          {exercise.category}
        </div>
      )}
      {history === null ? (
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, padding: '24px 0', textAlign: 'center' }}>
          Loading history…
        </div>
      ) : history.length === 0 ? (
        <div style={{ background: palette.surface, border: `1px dashed ${palette.border}`, borderRadius: signalTokens.radii.card, padding: '28px 16px', textAlign: 'center', fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          No data yet — log a weighted set in a workout to start tracking.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
            <StatMini label="Recent e1RM" value={mostRecent !== null ? formatWeight(mostRecent, weightUnit) : '—'} />
            <StatMini label="Best e1RM" value={allTimeBest !== null ? formatWeight(allTimeBest, weightUnit) : '—'} />
          </div>
          <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: signalTokens.radii.card, padding: 10 }}>
            <E1rmSparkline exerciseId={exercise.id} history={history} todayE1RM={null} />
          </div>
        </>
      )}
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: palette.surfaceAlt, border: `1px solid ${palette.border}`, borderRadius: signalTokens.radii.card, padding: '10px 12px' }}>
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</div>
    </div>
  );
}
