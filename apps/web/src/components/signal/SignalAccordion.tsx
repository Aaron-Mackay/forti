'use client';

import {
  useCallback,
  useId,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { signalTokens } from '@lib/signal/tokens';

const palette = signalTokens.surface.planning;

export interface SignalAccordionProps {
  summary: ReactNode;
  defaultExpanded?: boolean;
  /** When true, children are mounted only after the first expand. Defaults to false. */
  lazy?: boolean;
  children: ReactNode;
  /** Controlled mode. */
  expanded?: boolean;
  onChange?: (next: boolean) => void;
  'data-testid'?: string;
}

export function SignalAccordion({
  summary,
  defaultExpanded = false,
  lazy = false,
  children,
  expanded: controlled,
  onChange,
  'data-testid': dataTestId,
}: SignalAccordionProps) {
  const auto = useId();
  const headerId = `${auto}-header`;
  const panelId = `${auto}-panel`;
  const [internal, setInternal] = useState(defaultExpanded);
  const [everOpened, setEverOpened] = useState(defaultExpanded);
  const expanded = controlled ?? internal;

  const toggle = useCallback(() => {
    const next = !expanded;
    if (controlled === undefined) setInternal(next);
    if (next) setEverOpened(true);
    onChange?.(next);
  }, [expanded, controlled, onChange]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  };

  const wrapperStyle: CSSProperties = {
    border: `1px solid ${palette.border}`,
    borderRadius: signalTokens.radii.card,
    background: palette.surface,
    overflow: 'hidden',
  };
  const headerStyle: CSSProperties = {
    appearance: 'none',
    background: 'transparent',
    border: 'none',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    cursor: 'pointer',
    color: palette.ink,
    fontFamily: signalTokens.fontVar.body,
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'left',
    gap: 12,
  };
  const chevronStyle: CSSProperties = {
    transition: 'transform 160ms ease-out',
    transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
    color: palette.inkMid,
    flexShrink: 0,
  };
  const panelStyle: CSSProperties = {
    padding: '0 14px 14px',
    borderTop: `1px solid ${palette.border}`,
  };

  const shouldRender = !lazy || everOpened;

  return (
    <div style={wrapperStyle} data-testid={dataTestId}>
      <button
        type="button"
        id={headerId}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        style={headerStyle}
      >
        <span>{summary}</span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          style={chevronStyle}
        >
          <path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!expanded}
        style={expanded ? panelStyle : undefined}
      >
        {shouldRender ? children : null}
      </div>
    </div>
  );
}
