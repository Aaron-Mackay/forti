import Link from 'next/link';
import { signalTokens, type SignalSurfaceMode } from '@lib/signal/tokens';

type Props = {
  href: string;
  label: string;
  surface?: SignalSurfaceMode;
};

export function SignalBackLink({ href, label, surface = 'planning' }: Props) {
  const palette = signalTokens.surface[surface];
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: signalTokens.fontVar.mono,
        fontSize: 11,
        color: palette.inkMid,
        textDecoration: 'none',
        padding: '14px 16px 0',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={13}
        height={13}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5M11 6l-6 6 6 6" />
      </svg>
      {label}
    </Link>
  );
}
