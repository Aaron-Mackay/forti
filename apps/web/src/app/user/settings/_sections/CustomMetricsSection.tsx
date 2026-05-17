'use client';

import { useEffect, useState } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import { useSettingsWithSaved } from '../_components/SavedState';
import type { CustomMetricDef } from '@/types/settingsTypes';

const palette = signalTokens.surface.planning;
const MAX = 4;

export function CustomMetricsSection() {
  const { settings, updateCustomMetrics } = useSettingsWithSaved();
  const [defs, setDefs] = useState<CustomMetricDef[]>(settings.customMetrics);

  useEffect(() => {
    setDefs(settings.customMetrics);
  }, [settings.customMetrics]);

  function saveDefs(next: CustomMetricDef[]) {
    setDefs(next);
    updateCustomMetrics(next);
  }

  function handleNameBlur(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveDefs(defs.map((d) => (d.id === id ? { ...d, name: trimmed } : d)));
  }

  function handleDelete(id: string) {
    saveDefs(defs.filter((d) => d.id !== id));
  }

  function handleAdd() {
    if (defs.length >= MAX) return;
    saveDefs([
      ...defs,
      { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, name: `Metric ${defs.length + 1}` },
    ]);
  }

  const atMax = defs.length >= MAX;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {defs.map((def) => (
        <div
          key={def.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '9px 14px',
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            borderRadius: signalTokens.radii.card,
            gap: 8,
          }}
        >
          <input
            defaultValue={def.name}
            onBlur={(e) => handleNameBlur(def.id, e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 14,
              color: palette.ink,
              fontFamily: signalTokens.fontVar.body,
              outline: 'none',
              minWidth: 0,
            }}
          />
          <button
            type="button"
            aria-label={`Remove ${def.name}`}
            onClick={() => handleDelete(def.id)}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: palette.inkMid,
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}

      {atMax ? (
        <div
          style={{
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 10,
            color: palette.inkLight,
            padding: '4px 2px',
            letterSpacing: '0.02em',
          }}
        >
          {MAX} / {MAX} used
        </div>
      ) : (
        <button
          type="button"
          onClick={handleAdd}
          style={{
            appearance: 'none',
            background: 'transparent',
            border: `1px dashed ${palette.border}`,
            borderRadius: signalTokens.radii.card,
            cursor: 'pointer',
            padding: '9px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 12,
            color: palette.inkMid,
          }}
        >
          Add metric…
          <span aria-hidden="true">+</span>
        </button>
      )}
    </div>
  );
}
