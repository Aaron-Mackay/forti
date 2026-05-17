import type { SignalNavMode } from '@lib/signal/tokens';
import type { SignalIconName } from './SignalIcons';

export type NavItemId = 'home' | 'training' | 'plan' | 'progress' | 'more' | 'clients' | 'library' | 'check-in';

export type SignalNavItem = {
  id: NavItemId;
  label: string;
  icon: SignalIconName;
  href: string;
  matchPrefixes: string[];
};

export type SignalSecondaryNavItem = {
  label: string;
  href: string;
  detail: string;
  matchPrefixes: string[];
};

const userNav: SignalNavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/user', matchPrefixes: ['/user'] },
  { id: 'training', label: 'Training', icon: 'training', href: '/user/workout', matchPrefixes: ['/user/workout'] },
  { id: 'plan', label: 'Plan', icon: 'plan', href: '/user/plan', matchPrefixes: ['/user/plan'] },
  { id: 'progress', label: 'Progress', icon: 'progress', href: '/user/progress', matchPrefixes: ['/user/progress'] },
  { id: 'more', label: 'More', icon: 'more', href: '/user/settings', matchPrefixes: ['/user/settings', '/user/feedback', '/user/nutrition', '/user/calendar', '/user/supplements', '/user/learning-plans', '/exercises'] },
];

const coachedUserNav: SignalNavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/user', matchPrefixes: ['/user'] },
  { id: 'training', label: 'Training', icon: 'training', href: '/user/workout', matchPrefixes: ['/user/workout'] },
  { id: 'plan', label: 'Plan', icon: 'plan', href: '/user/plan', matchPrefixes: ['/user/plan'] },
  { id: 'progress', label: 'Progress', icon: 'progress', href: '/user/progress', matchPrefixes: ['/user/progress'] },
  { id: 'check-in', label: 'Check-in', icon: 'checkin', href: '/user/check-in', matchPrefixes: ['/user/check-in'] },
  { id: 'more', label: 'More', icon: 'more', href: '/user/settings', matchPrefixes: ['/user/settings', '/user/feedback', '/user/nutrition', '/user/calendar', '/user/supplements', '/user/learning-plans', '/exercises'] },
];

const coachNav: SignalNavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/user/coach', matchPrefixes: ['/user/coach'] },
  { id: 'clients', label: 'Clients', icon: 'clients', href: '/user/coach/clients', matchPrefixes: ['/user/coach/clients'] },
  { id: 'library', label: 'Library', icon: 'library', href: '/user/coach/library', matchPrefixes: ['/user/coach/library'] },
  { id: 'more', label: 'More', icon: 'more', href: '/user/settings', matchPrefixes: ['/user/settings', '/user/coach/feedback', '/user/coach/exercises', '/user/coach/check-in-template', '/user/coach/learning-plans'] },
];

const userSecondaryNavBase: SignalSecondaryNavItem[] = [
  { label: 'Exercises', href: '/exercises', detail: 'Exercise library and movement notes', matchPrefixes: ['/exercises'] },
  { label: 'Nutrition', href: '/user/nutrition', detail: 'Targets, totals, and trends', matchPrefixes: ['/user/nutrition'] },
  { label: 'Calendar', href: '/user/calendar', detail: 'Training schedule and metrics', matchPrefixes: ['/user/calendar'] },
  { label: 'Learning', href: '/user/learning-plans', detail: 'Assigned learning plans', matchPrefixes: ['/user/learning-plans'] },
  { label: 'Feedback', href: '/user/feedback', detail: 'Send product feedback', matchPrefixes: ['/user/feedback'] },
  { label: 'Settings', href: '/user/settings', detail: 'Profile, units, exports, coaching', matchPrefixes: ['/user/settings'] },
];

const supplementsSecondaryNav: SignalSecondaryNavItem = {
  label: 'Supplements',
  href: '/user/supplements',
  detail: 'Current and historical protocols',
  matchPrefixes: ['/user/supplements'],
};

const coachSecondaryNav: SignalSecondaryNavItem[] = [
  { label: 'Exercises', href: '/user/coach/exercises', detail: 'Exercise library and client-facing notes', matchPrefixes: ['/user/coach/exercises'] },
  { label: 'Check-in template', href: '/user/coach/check-in-template', detail: 'Edit client check-in questions', matchPrefixes: ['/user/coach/check-in-template'] },
  { label: 'Learning plans', href: '/user/coach/learning-plans', detail: 'Create and assign education', matchPrefixes: ['/user/coach/learning-plans'] },
  { label: 'Feedback', href: '/user/coach/feedback', detail: 'Send product feedback', matchPrefixes: ['/user/coach/feedback'] },
  { label: 'Settings', href: '/user/settings', detail: 'Account, coaching, exports', matchPrefixes: ['/user/settings'] },
];

export function navItemsFor(mode: SignalNavMode, coachModeActive = false): SignalNavItem[] {
  if (mode === 'coach') return coachNav;
  return coachModeActive ? coachedUserNav : userNav;
}

export function secondaryNavItemsFor(mode: SignalNavMode, showSupplements = false): SignalSecondaryNavItem[] {
  if (mode === 'coach') return coachSecondaryNav;
  if (!showSupplements) return userSecondaryNavBase;
  return [
    ...userSecondaryNavBase.slice(0, 3),
    supplementsSecondaryNav,
    ...userSecondaryNavBase.slice(3),
  ];
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

export function isSecondaryNavItemActive(item: SignalSecondaryNavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  return item.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}
