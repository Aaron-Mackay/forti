'use client';

import { useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { signalTokens } from '@lib/signal/tokens';

const palette = signalTokens.surface.planning;

export type SignalTabsTab<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

export interface SignalTabsProps<T extends string> {
  tabs: SignalTabsTab<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
}

export function SignalTabs<T extends string>({ tabs, value, onChange, ariaLabel }: SignalTabsProps<T>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    event.preventDefault();
    let nextIdx = idx;
    if (event.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
    if (event.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
    if (event.key === 'Home') nextIdx = 0;
    if (event.key === 'End') nextIdx = tabs.length - 1;
    const nextTab = tabs[nextIdx];
    if (!nextTab) return;
    onChange(nextTab.value);
    refs.current[nextTab.value]?.focus();
  };

  const listStyle: CSSProperties = {
    display: 'flex',
    gap: 4,
    borderBottom: `1px solid ${palette.border}`,
    overflowX: 'auto',
  };

  return (
    <div role="tablist" aria-label={ariaLabel} style={listStyle}>
      {tabs.map((tab, idx) => {
        const active = tab.value === value;
        const tabStyle: CSSProperties = {
          appearance: 'none',
          background: 'transparent',
          border: 'none',
          borderBottom: `2px solid ${active ? palette.ink : 'transparent'}`,
          padding: '8px 12px',
          fontFamily: signalTokens.fontVar.body,
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          color: active ? palette.ink : palette.inkMid,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
          marginBottom: -1,
        };
        const countStyle: CSSProperties = {
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 11,
          color: active ? palette.ink : palette.inkLight,
        };
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[tab.value] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            style={tabStyle}
          >
            {tab.label}
            {typeof tab.count === 'number' ? <span style={countStyle}>{tab.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
