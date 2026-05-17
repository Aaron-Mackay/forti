import type { ReactNode } from 'react';

export type SectionSlug =
  | 'profile'
  | 'dashboard'
  | 'workout'
  | 'tracked'
  | 'metrics'
  | 'checkin'
  | 'units'
  | 'onboarding'
  | 'coach'
  | 'coach-mode'
  | 'export'
  | 'signal'
  | 'signout';

export type SectionGroupId = 'account' | 'training' | 'coaching' | 'data';

export type SectionDescriptor = {
  slug: SectionSlug;
  group: SectionGroupId;
  /** Title used in the section header (Archivo Narrow large). */
  title: string;
  /** Eyebrow used in the section header — names the surface this setting affects. */
  eyebrow: string;
  /** Short label used in the mobile hub row + desktop rail item. */
  hubLabel: string;
  /** Optional description rendered below the title on the sub-screen / desktop pane. */
  description?: string;
  /** Optional `BETA` style badge text rendered next to the hub label. */
  badge?: string;
};

export const SECTION_DESCRIPTORS: SectionDescriptor[] = [
  {
    slug: 'profile',
    group: 'account',
    title: 'Identity',
    eyebrow: 'Identity',
    hubLabel: 'Profile',
    description: 'This name is used across training, check-ins, and coach-facing views.',
  },
  {
    slug: 'signal',
    group: 'account',
    title: 'Experimental UI',
    eyebrow: 'App',
    hubLabel: 'Signal UI',
    badge: 'BETA',
    description:
      'Opt in to the in-progress Signal redesign. Shell, workouts, progress, check-ins, calendar, notifications, and planning tools already use it.',
  },
  {
    slug: 'signout',
    group: 'account',
    title: 'Sign out',
    eyebrow: 'Account',
    hubLabel: 'Sign out',
    description: 'Sign out of your Forti account on this device.',
  },
  {
    slug: 'dashboard',
    group: 'training',
    title: 'Dashboard cards',
    eyebrow: 'Home',
    hubLabel: 'Dashboard cards',
    description: 'Choose which training summaries appear on Home. The order is fixed around the primary command.',
  },
  {
    slug: 'workout',
    group: 'training',
    title: 'Session defaults',
    eyebrow: 'Workout',
    hubLabel: 'Workout defaults',
    description: 'Tune the controls and effort language used while you log training.',
  },
  {
    slug: 'tracked',
    group: 'training',
    title: 'Tracked lifts',
    eyebrow: 'Progress',
    hubLabel: 'Tracked lifts',
    description: 'Pick up to 5 exercises to track e1RM progress on your dashboard.',
  },
  {
    slug: 'metrics',
    group: 'training',
    title: 'Custom metrics',
    eyebrow: 'Home',
    hubLabel: 'Custom metrics',
    description: 'Track up to 4 personal measurements alongside your daily metrics.',
  },
  {
    slug: 'checkin',
    group: 'training',
    title: 'Weekly timing',
    eyebrow: 'Check-in',
    hubLabel: 'Check-in day',
    description: 'Choose the day that starts your weekly check-in rhythm.',
  },
  {
    slug: 'units',
    group: 'training',
    title: 'Display preferences',
    eyebrow: 'App',
    hubLabel: 'Units',
    description: 'Pick the units used for exercise weights and bodyweight tracking.',
  },
  {
    slug: 'onboarding',
    group: 'training',
    title: 'Replay guide',
    eyebrow: 'Home',
    hubLabel: 'Replay guide',
    description: 'Re-show the getting-started guide on your Home route.',
  },
  {
    slug: 'coach',
    group: 'coaching',
    title: 'Your coach',
    eyebrow: 'Coaching',
    hubLabel: 'Your coach',
    description: 'Link or unlink the coach who reviews your check-ins and plans.',
  },
  {
    slug: 'coach-mode',
    group: 'coaching',
    title: 'Coach mode',
    eyebrow: 'Coaching',
    hubLabel: 'Coach mode',
    description: 'Turn on the Coach tools to invite clients and manage your roster.',
  },
  {
    slug: 'export',
    group: 'data',
    title: 'Download your data',
    eyebrow: 'Data',
    hubLabel: 'Export data',
    description: 'CSV exports of your training plans, daily metrics, and check-in history.',
  },
];

export const SECTION_BY_SLUG: Record<SectionSlug, SectionDescriptor> = SECTION_DESCRIPTORS.reduce(
  (acc, d) => {
    acc[d.slug] = d;
    return acc;
  },
  {} as Record<SectionSlug, SectionDescriptor>,
);

export const GROUPS: { id: SectionGroupId; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'training', label: 'Training' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'data', label: 'Data' },
];

export function isSectionSlug(value: unknown): value is SectionSlug {
  if (typeof value !== 'string') return false;
  return value in SECTION_BY_SLUG;
}

export type SectionRendererArgs = {
  initialName: string;
  initialImage: string | null;
};

export type SectionRenderer = (args: SectionRendererArgs) => ReactNode;
