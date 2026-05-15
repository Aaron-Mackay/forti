'use client';

import { useState, useEffect } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import { listExercises } from '@lib/clientApi';
import type { ExerciseListResponse } from '@lib/contracts/exercises';
import type { TrackedE1rmExercise } from '@/types/settingsTypes';

const palette = signalTokens.surface.planning;
const DESKTOP_BP = signalTokens.space.desktopBreakpointPx;

type Props = {
  open: boolean;
  onClose: () => void;
  tracked: TrackedE1rmExercise[];
  onChange: (next: TrackedE1rmExercise[]) => void;
};

export function TrackedExercisePickerSheet({ open, onClose, tracked, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [exercises, setExercises] = useState<ExerciseListResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch('');
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

  if (!open) return null;

  const trackedIds = new Set(tracked.map((e) => e.id));
  const atMax = tracked.length >= 5;

  function handleToggle(ex: ExerciseListResponse[number]) {
    if (trackedIds.has(ex.id)) {
      onChange(tracked.filter((t) => t.id !== ex.id));
    } else if (!atMax) {
      onChange([...tracked, { id: ex.id, name: ex.name }]);
    }
  }

  return (
    <>
      <style>{`
        @media (min-width: ${DESKTOP_BP}px) {
          [data-picker-overlay] {
            align-items: center;
            justify-content: center;
          }
          [data-picker-panel] {
            max-height: 80vh;
            width: 460px;
            border-top: 1px solid ${palette.border};
            border-radius: 8px;
          }
          [data-picker-handle] { display: none; }
        }
      `}</style>
      <div
        data-picker-overlay
        role="dialog"
        aria-label="Add tracked lift"
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
          data-picker-panel
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
          <div data-picker-handle style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
            <div style={{ width: 36, height: 4, background: palette.borderStrong, borderRadius: 2 }} />
          </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 18px 14px',
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <div>
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight, marginBottom: 4 }}>
              Strength
            </div>
            <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>
              Add tracked lift
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: palette.inkLight }}>
              {tracked.length}/5
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                appearance: 'none',
                background: 'transparent',
                color: palette.ink,
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                padding: 8,
                marginRight: -8,
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 18px 0' }}>
          <input
            type="search"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 48,
                    background: palette.surfaceAlt,
                    border: `1px solid ${palette.border}`,
                    borderRadius: signalTokens.radii.card,
                    opacity: 1 - i * 0.1,
                  }}
                />
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, padding: '24px 0', textAlign: 'center' }}>
              No exercises found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {exercises.map((ex) => {
                const isTracked = trackedIds.has(ex.id);
                const disabled = atMax && !isTracked;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleToggle(ex)}
                    disabled={disabled}
                    style={{
                      appearance: 'none',
                      width: '100%',
                      background: isTracked ? palette.surfaceAlt : palette.surface,
                      border: `1px solid ${isTracked ? palette.borderStrong : palette.border}`,
                      borderRadius: signalTokens.radii.card,
                      padding: '12px 14px',
                      textAlign: 'left',
                      cursor: disabled ? 'default' : 'pointer',
                      color: disabled ? palette.inkLight : palette.ink,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{ex.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      {ex.category && (
                        <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight }}>
                          {ex.category}
                        </span>
                      )}
                      {isTracked && (
                        <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: signalTokens.signal.base, fontWeight: 700 }}>
                          ✓
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
