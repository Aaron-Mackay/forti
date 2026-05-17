'use client';

import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';
import { useSettings } from '@lib/providers/SettingsProvider';
import { useIsDesktop } from './useIsDesktop';
import { SavedStateProvider } from './SavedState';
import { SettingsMobileHub } from './SettingsMobileHub';
import { SettingsMobileSubScreen } from './SettingsMobileSubScreen';
import { SettingsDesktopTwoPane } from './SettingsDesktopTwoPane';
import type { SectionSlug } from './sections';

const palette = signalTokens.surface.planning;

type Props = {
  section: SectionSlug | null;
  initialName: string;
  initialImage: string | null;
};

const DEFAULT_DESKTOP_SECTION: SectionSlug = 'profile';

export function SettingsShell({ section, initialName, initialImage }: Props) {
  const isDesktop = useIsDesktop();
  const { error, clearError } = useSettings();

  return (
    <SavedStateProvider>
      <div
        className={signalFontVariablesClassName}
        style={{
          minHeight: '100%',
          background: palette.bg,
          color: palette.ink,
          fontFamily: signalTokens.fontVar.body,
          position: 'relative',
        }}
      >
        {error ? (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${signalTokens.status.urgent}`,
              background: 'rgba(177,74,53,0.06)',
              color: signalTokens.status.urgent,
              fontSize: 12,
              fontFamily: signalTokens.fontVar.mono,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={clearError}
              style={{
                appearance: 'none',
                background: 'transparent',
                border: 'none',
                color: signalTokens.status.urgent,
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ) : null}

        {isDesktop ? (
          <SettingsDesktopTwoPane
            slug={section ?? DEFAULT_DESKTOP_SECTION}
            initialName={initialName}
            initialImage={initialImage}
          />
        ) : section ? (
          <SettingsMobileSubScreen slug={section} initialName={initialName} initialImage={initialImage} />
        ) : (
          <SettingsMobileHub initialName={initialName} />
        )}
      </div>
    </SavedStateProvider>
  );
}
