import type { CSSProperties, ReactElement } from 'react';

type IconName =
  | 'home'
  | 'plan'
  | 'progress'
  | 'more'
  | 'clients'
  | 'library'
  | 'bell'
  | 'arrowRight';

const stroke = (paths: ReactElement) => paths;

const ICONS: Record<IconName, ReactElement> = {
  home: stroke(
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  plan: stroke(
    <>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M4 9h16M9 4v16" />
    </>
  ),
  progress: stroke(
    <>
      <path d="M4 18l5-6 4 3 7-9" />
      <path d="M4 20h16" />
    </>
  ),
  more: stroke(
    <>
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </>
  ),
  clients: stroke(
    <>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M14 19c0-2.5 1.7-4.5 4-5" />
    </>
  ),
  library: stroke(
    <>
      <path d="M5 4h6v16H5z" />
      <path d="M11 4h3l3 15-3 1-3-1z" />
    </>
  ),
  bell: stroke(
    <>
      <path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z" />
      <path d="M10 21a2 2 0 004 0" />
    </>
  ),
  arrowRight: stroke(
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
};

export function SignalIcon({
  name,
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.6,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

export type { IconName as SignalIconName };
