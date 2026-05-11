'use client';

import { useState } from 'react';
import { signalTokens } from '@lib/signal/tokens';

const palette = signalTokens.surface.planning;

type Props = {
  clientId: string;
  initialNotes: string | null;
};

export function CoachNotesPanel({ clientId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/coach/clients/${clientId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: draft }),
      });
      setNotes(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    setDraft(notes);
    setEditing(true);
  }

  function cancel() {
    setDraft(notes);
    setEditing(false);
  }

  return (
    <section
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        padding: '18px',
        marginTop: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          Coach notes
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 11,
              color: signalTokens.signal.deep,
              padding: 0,
            }}
          >
            {notes ? 'Edit' : 'Add notes'}
          </button>
        )}
      </div>

      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder="Notes about this client…"
            style={{
              width: '100%',
              background: palette.bg,
              color: palette.ink,
              border: `1px solid ${palette.border}`,
              borderRadius: signalTokens.radii.card,
              padding: '10px 12px',
              fontFamily: signalTokens.fontVar.body,
              fontSize: 14,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{
                appearance: 'none',
                background: palette.ink,
                color: palette.bg,
                border: `1px solid ${palette.ink}`,
                borderRadius: signalTokens.radii.card,
                padding: '8px 16px',
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 12,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancel}
              style={{
                appearance: 'none',
                background: 'transparent',
                color: palette.inkMid,
                border: `1px solid ${palette.border}`,
                borderRadius: signalTokens.radii.card,
                padding: '8px 16px',
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : notes ? (
        <div style={{ fontSize: 14, color: palette.ink, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {notes}
        </div>
      ) : (
        <div style={{ fontSize: 14, color: palette.inkLight, lineHeight: 1.5, fontStyle: 'italic' }}>
          No notes yet.
        </div>
      )}
    </section>
  );
}
