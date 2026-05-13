'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signalTokens } from '@lib/signal/tokens';

const palette = signalTokens.surface.planning;

const NAV_ITEMS = [
  { label: 'Overview', segment: '' },
  { label: 'Calendar', segment: 'calendar' },
  { label: 'Check-ins', segment: 'check-ins' },
  { label: 'Plans', segment: 'plans' },
  { label: 'Nutrition', segment: 'nutrition' },
  { label: 'Supplements', segment: 'supplements' },
] as const;

export function SignalClientNav({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/user/coach/clients/${clientId}`;

  return (
    <nav
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: `1px solid ${palette.border}`,
        marginBottom: 18,
        overflowX: 'auto',
      }}
      aria-label="Client workspace"
    >
      {NAV_ITEMS.map(({ label, segment }) => {
        const href = segment ? `${base}/${segment}` : base;
        const isActive = segment
          ? pathname === href || pathname.startsWith(`${href}/`)
          : pathname === base;

        return (
          <Link
            key={segment}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            style={{
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? palette.ink : palette.inkMid,
              textDecoration: 'none',
              padding: '10px 14px',
              borderBottom: `2px solid ${isActive ? signalTokens.signal.deep : 'transparent'}`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
