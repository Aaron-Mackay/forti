export const signalTokens = {
  surface: {
    gym: {
      bg: '#0b0b0a',
      bgAlt: '#121211',
      surface: '#171716',
      surfaceAlt: '#1f1f1d',
      ink: '#f3f1ea',
      inkMid: '#a3a39a',
      inkLight: '#6a6a62',
      inkGhost: '#33332f',
      border: '#262623',
      borderStrong: '#3a3a36',
    },
    planning: {
      bg: '#f4f2ec',
      surface: '#ffffff',
      surfaceAlt: '#faf8f2',
      ink: '#15140f',
      inkMid: '#5e5b53',
      inkLight: '#8c887d',
      border: '#dcd7c8',
      borderStrong: '#2a2823',
    },
    calm: {
      bg: '#ece8dd',
      surface: '#f7f3e8',
      surfaceAlt: '#f2ede0',
      ink: '#22221d',
      inkMid: '#605c52',
      inkLight: '#8e8a7c',
      border: '#d2cbb8',
      borderStrong: '#2a2823',
    },
  },
  signal: {
    base: '#d4f24a',
    deep: '#9bc41a',
    dim: 'rgba(212, 242, 74, 0.18)',
  },
  status: {
    ok: '#5a8c4f',
    warn: '#c79232',
    urgent: '#b14a35',
  },
  chart: {
    series1: '#15140f',
    series2: '#9bc41a',
    series3: '#7a7a72',
    series4: '#b08a3a',
    series5: '#5a8c4f',
    series6: '#b14a35',
  },
  font: {
    body: "'Inter Tight', 'Inter', system-ui, sans-serif",
    cond: "'Archivo Narrow', 'Inter Tight', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
    serif: "Georgia, 'Times New Roman', serif",
  },
  fontVar: {
    body: 'var(--signal-font-body)',
    cond: 'var(--signal-font-cond)',
    mono: 'var(--signal-font-mono)',
  },
  space: {
    base: 4,
    sidebarWidth: 220,
    bottomNavHeight: 56,
    topBarHeight: 52,
    desktopBreakpointPx: 1024,
  },
  radii: {
    cell: 3,
    card: 4,
    cardLarge: 6,
  },
} as const;

export type SignalSurfaceMode = 'gym' | 'planning' | 'calm';
export type SignalNavMode = 'user' | 'coach';
