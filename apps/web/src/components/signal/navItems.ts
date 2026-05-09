import type { SignalNavMode } from '@lib/signal/tokens';
import type { SignalIconName } from './SignalIcons';

export type NavItemId = 'home' | 'plan' | 'progress' | 'more' | 'clients' | 'library';

export type SignalNavItem = {
  id: NavItemId;
  label: string;
  icon: SignalIconName;
  href: string;
  matchPrefixes: string[];
};

const userNav: SignalNavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/user', matchPrefixes: ['/user'] },
  { id: 'plan', label: 'Plan', icon: 'plan', href: '/user/plan', matchPrefixes: ['/user/plan'] },
  { id: 'progress', label: 'Progress', icon: 'progress', href: '/user/progress', matchPrefixes: ['/user/progress'] },
  { id: 'more', label: 'More', icon: 'more', href: '/user/settings', matchPrefixes: ['/user/settings'] },
];

const coachNav: SignalNavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/user/coach', matchPrefixes: ['/user/coach'] },
  { id: 'clients', label: 'Clients', icon: 'clients', href: '/user/coach/clients', matchPrefixes: ['/user/coach/clients'] },
  { id: 'library', label: 'Library', icon: 'library', href: '/library', matchPrefixes: ['/library'] },
  { id: 'more', label: 'More', icon: 'more', href: '/user/settings', matchPrefixes: ['/user/settings'] },
];

export function navItemsFor(mode: SignalNavMode): SignalNavItem[] {
  return mode === 'coach' ? coachNav : userNav;
}

export function activeNavId(items: SignalNavItem[], pathname: string | null): NavItemId | null {
  if (!pathname) return null;
  let best: { item: SignalNavItem; len: number } | null = null;
  for (const item of items) {
    for (const prefix of item.matchPrefixes) {
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        if (!best || prefix.length > best.len) best = { item, len: prefix.length };
      }
    }
  }
  return best?.item.id ?? null;
}
