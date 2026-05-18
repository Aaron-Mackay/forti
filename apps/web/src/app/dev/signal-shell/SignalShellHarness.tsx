'use client';

import { useState } from 'react';
import { SignalAppShell } from '@/components/signal/SignalAppShell';
import { signalTokens, type SignalNavMode, type SignalSurfaceMode } from '@lib/signal/tokens';
import { navItemsFor, type NavItemId } from '@/components/signal/navItems';

const SURFACES: SignalSurfaceMode[] = ['gym', 'planning'];
const MODES: SignalNavMode[] = ['user', 'coach'];

type Palette = (typeof signalTokens.surface)[SignalSurfaceMode];

export function SignalShellHarness({
  userLabel,
  userInitials,
}: {
  userLabel?: string;
  userInitials?: string;
}) {
  const [mode, setMode] = useState<SignalNavMode>('user');
  const [surface, setSurface] = useState<SignalSurfaceMode>('gym');
  const [activeNav, setActiveNav] = useState<NavItemId>('home');

  const items = navItemsFor(mode);
  const palette = signalTokens.surface[surface];

  return (
    <SignalAppShell
      mode={mode}
      surface={surface}
      activeNavOverride={activeNav}
      userLabel={userLabel}
      userInitials={userInitials}
      hasUnreadNotifications
    >
      <div
        style={{
          padding: '28px 32px 56px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          color: palette.ink,
          maxWidth: 880,
        }}
      >
        <header>
          <div
            style={{
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 11,
              color: palette.inkMid,
              marginBottom: 6,
              letterSpacing: 0,
            }}
          >
            Dev preview · Slice 1
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: signalTokens.fontVar.cond,
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            Signal shell preview
          </h1>
          <p
            style={{
              margin: '12px 0 0',
              color: palette.inkMid,
              maxWidth: 640,
              lineHeight: 1.55,
              fontSize: 14,
            }}
          >
            Foundation only — tokens, fonts, theme, and shell components. No production
            routes are migrated. Use the controls below to step through shell variants.
          </p>
        </header>

        <ControlRow palette={palette} label="Mode">
          <Toggle
            palette={palette}
            options={MODES.map((m) => ({ value: m, label: m === 'user' ? 'Train' : 'Coach' }))}
            value={mode}
            onChange={(next) => {
              setMode(next);
              setActiveNav('home');
            }}
          />
        </ControlRow>

        <ControlRow palette={palette} label="Surface">
          <Toggle
            palette={palette}
            options={SURFACES.map((s) => ({ value: s, label: s }))}
            value={surface}
            onChange={setSurface}
          />
        </ControlRow>

        <ControlRow palette={palette} label="Active nav">
          <Toggle
            palette={palette}
            options={items.map((i) => ({ value: i.id, label: i.label }))}
            value={activeNav}
            onChange={setActiveNav}
          />
        </ControlRow>

        <TypeRamp palette={palette} />
        <PaletteSwatches />
      </div>
    </SignalAppShell>
  );
}

function ControlRow({
  palette,
  label,
  children,
}: {
  palette: Palette;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div
        style={{
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 11,
          fontWeight: 600,
          color: palette.inkMid,
          minWidth: 92,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Toggle<T extends string>({
  palette,
  options,
  value,
  onChange,
}: {
  palette: Palette;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div style={{ display: 'inline-flex', gap: 4, padding: 3, background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: 4 }}>
      {options.map((o) => {
        const isActive = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              padding: '6px 12px',
              fontFamily: signalTokens.fontVar.body,
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              background: isActive ? palette.ink : 'transparent',
              color: isActive ? palette.surface : palette.inkMid,
              border: 'none',
              borderRadius: 3,
              textTransform: 'none',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TypeRamp({ palette }: { palette: Palette }) {
  return (
    <section
      style={{
        marginTop: 8,
        padding: '20px 22px',
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 11,
          color: palette.inkMid,
          fontWeight: 600,
        }}
      >
        Typography
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
        What needs attention
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 28, fontWeight: 700, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums' }}>
        100 × 5 · 4 250 kg
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.body, fontSize: 14, color: palette.ink }}>
        Sentence-case body. Inter Tight at 14, default ramp.
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.body, fontSize: 13, color: palette.inkMid, lineHeight: 1.55 }}>
        Quiet body for paragraphs sits at 13 with looser line-height. No all-caps headings, no
        wide letter-spacing on body — the design reads like equipment, not a hype loop.
      </div>
      <div
        style={{
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 11,
          color: palette.inkLight,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        12w · 95% · +0.2 kg · 14h ago
      </div>
      <div style={{ fontFamily: signalTokens.font.serif, fontStyle: 'italic', fontSize: 15, color: palette.ink, lineHeight: 1.65 }}>
        Coach reply rendered in serif italic — used only on the calm client surface.
      </div>
    </section>
  );
}

function PaletteSwatches() {
  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
      }}
    >
      {SURFACES.map((s) => {
        const p = signalTokens.surface[s];
        return (
          <div
            key={s}
            style={{
              border: `1px solid ${p.border}`,
              borderRadius: signalTokens.radii.card,
              overflow: 'hidden',
              background: p.bg,
              color: p.ink,
            }}
          >
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${p.border}`, background: p.surface }}>
              <div
                style={{
                  fontFamily: signalTokens.fontVar.mono,
                  fontSize: 10,
                  color: p.inkMid,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Surface
              </div>
              <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 18, fontWeight: 700 }}>{s}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 8 }}>
              {(['bg', 'surface', 'surfaceAlt', 'ink', 'inkMid', 'inkLight', 'border', 'borderStrong'] as const).map((k) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div
                    style={{
                      height: 24,
                      background: p[k],
                      border: `1px solid ${p.border}`,
                      borderRadius: 2,
                    }}
                  />
                  <div
                    style={{
                      fontFamily: signalTokens.fontVar.mono,
                      fontSize: 9,
                      color: p.inkMid,
                    }}
                  >
                    {k}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
