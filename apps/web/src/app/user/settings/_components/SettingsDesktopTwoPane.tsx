'use client';

import Link from 'next/link';
import { signalTokens } from '@lib/signal/tokens';
import {
  GROUPS,
  SECTION_DESCRIPTORS,
  SECTION_BY_SLUG,
  type SectionDescriptor,
  type SectionSlug,
} from './sections';
import { renderSection } from '../_sections';
import { SavedTimestampLabel } from './SavedState';

const palette = signalTokens.surface.planning;
const RAIL_WIDTH = 232;

type Props = {
  slug: SectionSlug;
  initialName: string;
  initialImage: string | null;
};

function RailItem({ section, active }: { section: SectionDescriptor; active: boolean }) {
  return (
    <Link
      href={`/user/settings/${section.slug}`}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 18px',
        fontFamily: signalTokens.fontVar.body,
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active ? palette.ink : palette.inkMid,
        background: active ? palette.surfaceAlt : 'transparent',
        borderLeft: active ? `3px solid ${palette.ink}` : '3px solid transparent',
        textDecoration: 'none',
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
    </Link>
  );
}

export function SettingsDesktopTwoPane({ slug, initialName, initialImage }: Props) {
  const section = SECTION_BY_SLUG[slug];
  const groupLabel = GROUPS.find((g) => g.id === section.group)?.label.toUpperCase() ?? 'SETTINGS';

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100%',
        background: palette.bg,
      }}
    >
      <aside
        aria-label="Settings sections"
        style={{
          width: RAIL_WIDTH,
          flexShrink: 0,
          background: palette.surface,
          borderRight: `1px solid ${palette.border}`,
          padding: '0 0 24px',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '20px 18px 14px' }}>
          <div
            style={{
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 10,
              color: palette.inkLight,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Settings
          </div>
          <h1
            style={{
              fontFamily: signalTokens.fontVar.cond,
              fontSize: 22,
              lineHeight: 1,
              letterSpacing: '-0.01em',
              margin: 0,
              color: palette.ink,
            }}
          >
            Everything
          </h1>
        </div>
        <nav>
          {GROUPS.map((group) => {
            const sections = SECTION_DESCRIPTORS.filter((s) => s.group === group.id);
            if (sections.length === 0) return null;
            return (
              <div key={group.id} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontFamily: signalTokens.fontVar.mono,
                    fontSize: 9,
                    color: palette.inkLight,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    padding: '6px 18px',
                  }}
                >
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {sections.map((s) => (
                    <RailItem key={s.slug} section={s} active={s.slug === slug} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: '24px 36px 32px',
          overflowY: 'auto',
        }}
      >
        <div style={{ maxWidth: 720 }}>
          <header
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 18,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: signalTokens.fontVar.mono,
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: palette.inkLight,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Settings · {groupLabel}
              </div>
              <h2
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
              </h2>
              {section.description ? (
                <p
                  style={{
                    fontSize: 13,
                    color: palette.inkMid,
                    margin: '8px 0 0',
                    lineHeight: 1.5,
                    maxWidth: 520,
                  }}
                >
                  {section.description}
                </p>
              ) : null}
            </div>
            <SavedTimestampLabel />
          </header>

          <div>{renderSection(slug, { initialName, initialImage })}</div>
        </div>
      </main>
    </div>
  );
}
