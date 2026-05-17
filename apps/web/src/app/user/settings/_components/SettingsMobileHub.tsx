'use client';

import Link from 'next/link';
import { signalTokens } from '@lib/signal/tokens';
import {
  GROUPS,
  SECTION_DESCRIPTORS,
  type SectionDescriptor,
} from './sections';
import { useHubStatuses } from './hubStatuses';

const palette = signalTokens.surface.planning;

type Props = {
  initialName: string;
};

function GroupTitle({ children, suffix }: { children: string; suffix?: string | null }) {
  return (
    <h2
      style={{
        fontFamily: signalTokens.fontVar.mono,
        fontSize: 9,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: palette.inkLight,
        margin: '0 0 6px',
        fontWeight: 600,
      }}
    >
      {children}
      {suffix ? <span style={{ color: signalTokens.status.warn, marginLeft: 6 }}>{suffix}</span> : null}
    </h2>
  );
}

function HubRow({ section, statusText }: { section: SectionDescriptor; statusText: string }) {
  return (
    <Link
      href={`/user/settings/${section.slug}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 12px',
        minHeight: 48,
        textDecoration: 'none',
        color: 'inherit',
        borderTop: `1px solid ${palette.border}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          flexShrink: 0,
          background: palette.surfaceAlt,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cell,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: palette.inkMid,
          fontSize: 13,
        }}
      >
        ⌬
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: signalTokens.fontVar.body,
            fontSize: 13,
            fontWeight: 600,
            color: palette.ink,
          }}
        >
          {section.hubLabel}
          {section.badge ? (
            <span
              style={{
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 8,
                padding: '1px 5px',
                background: palette.ink,
                color: signalTokens.signal.base,
                borderRadius: 2,
                letterSpacing: '0.1em',
              }}
            >
              {section.badge}
            </span>
          ) : null}
        </span>
        <span
          style={{
            display: 'block',
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 10,
            color: palette.inkLight,
            letterSpacing: '0.02em',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {statusText}
        </span>
      </span>
      <span aria-hidden="true" style={{ color: palette.inkMid, fontSize: 16, lineHeight: 1 }}>
        ›
      </span>
    </Link>
  );
}

export function SettingsMobileHub({ initialName }: Props) {
  const statuses = useHubStatuses({ initialName });

  return (
    <div style={{ padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 10,
            color: signalTokens.signal.deep,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Settings · {initialName || 'You'}
        </span>
        <h1
          style={{
            fontFamily: signalTokens.fontVar.cond,
            fontSize: 30,
            lineHeight: 1,
            letterSpacing: '-0.015em',
            margin: 0,
            color: palette.ink,
          }}
        >
          Everything
        </h1>
        <p style={{ fontSize: 12, color: palette.inkMid, margin: 0, lineHeight: 1.5 }}>
          Tap a row to open it. Account-wide changes save instantly.
        </p>
      </header>

      {GROUPS.map((group) => {
        const sections = SECTION_DESCRIPTORS.filter((s) => s.group === group.id);
        if (sections.length === 0) return null;
        const suffix = group.id === 'coaching' ? statuses.coachGroupSuffix : null;
        return (
          <section key={group.id} aria-labelledby={`group-${group.id}`}>
            <GroupTitle suffix={suffix}>{`${group.label.toUpperCase()}`}</GroupTitle>
            <div
              style={{
                border: `1px solid ${palette.border}`,
                borderRadius: signalTokens.radii.card,
                background: palette.surface,
                overflow: 'hidden',
              }}
            >
              {sections.map((s, idx) => {
                const status = statuses[s.slug as keyof typeof statuses] as { text: string } | string | null | undefined;
                const text = typeof status === 'object' && status && 'text' in status ? status.text : '';
                return (
                  <div key={s.slug} style={{ borderTop: idx === 0 ? 'none' : undefined }}>
                    {/* HubRow renders its own top divider; suppress for first row */}
                    <HubRowWrapped first={idx === 0}>
                      <HubRow section={s} statusText={text} />
                    </HubRowWrapped>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function HubRowWrapped({ first, children }: { first: boolean; children: React.ReactNode }) {
  // When first row in a card, remove the row's top border by overlapping it.
  return <div style={{ marginTop: first ? -1 : 0 }}>{children}</div>;
}
