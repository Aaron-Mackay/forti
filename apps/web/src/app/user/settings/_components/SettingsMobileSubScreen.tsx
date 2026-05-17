'use client';

import Link from 'next/link';
import { signalTokens } from '@lib/signal/tokens';
import { SECTION_BY_SLUG, GROUPS, type SectionSlug } from './sections';
import { renderSection } from '../_sections';
import { SavedTimestampLabel } from './SavedState';

const palette = signalTokens.surface.planning;

type Props = {
  slug: SectionSlug;
  initialName: string;
  initialImage: string | null;
};

export function SettingsMobileSubScreen({ slug, initialName, initialImage }: Props) {
  const section = SECTION_BY_SLUG[slug];
  const groupLabel = GROUPS.find((g) => g.id === section.group)?.label.toUpperCase() ?? 'SETTINGS';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <nav
        aria-label="Settings breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 44,
          padding: '0 14px',
          borderBottom: `1px solid ${palette.border}`,
          background: palette.surface,
        }}
      >
        <Link
          href="/user/settings"
          aria-label="Back to Settings hub"
          style={{
            color: palette.inkMid,
            textDecoration: 'none',
            fontSize: 22,
            lineHeight: 1,
            padding: '4px 6px 4px 0',
          }}
        >
          ‹
        </Link>
        <span
          style={{
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 11,
            letterSpacing: '0.12em',
            color: palette.inkLight,
            textTransform: 'uppercase',
          }}
        >
          Settings · {groupLabel}
        </span>
      </nav>

      <div style={{ padding: '16px 14px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 10,
              letterSpacing: '0.14em',
              color: signalTokens.signal.deep,
              textTransform: 'uppercase',
            }}
          >
            {section.eyebrow}
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
            {section.title}
          </h1>
          {section.description ? (
            <p style={{ fontSize: 12, color: palette.inkMid, margin: 0, lineHeight: 1.5 }}>{section.description}</p>
          ) : null}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 10,
              color: palette.inkLight,
              marginTop: 4,
              letterSpacing: '0.02em',
            }}
          >
            <SavedTimestampLabel />
          </div>
        </header>

        <div>{renderSection(slug, { initialName, initialImage })}</div>
      </div>
    </div>
  );
}
