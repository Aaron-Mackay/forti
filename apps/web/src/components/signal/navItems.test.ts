import { describe, expect, it } from 'vitest';
import { activeNavId, isSecondaryNavItemActive, navItemsFor, secondaryNavItemsFor } from './navItems';

describe('Signal navigation', () => {
  it('keeps user primary routes ordered and includes Training', () => {
    expect(navItemsFor('user').map((item) => item.label)).toEqual([
      'Home',
      'Training',
      'Plan',
      'Progress',
      'More',
    ]);

    expect(navItemsFor('user', true).map((item) => item.label)).toEqual([
      'Home',
      'Training',
      'Plan',
      'Progress',
      'Check-in',
      'More',
    ]);

    expect(navItemsFor('user').find((item) => item.id === 'training')).toMatchObject({
      href: '/user/workout',
      matchPrefixes: ['/user/workout'],
    });
  });

  it('marks Training active on workout routes', () => {
    const userItems = navItemsFor('user');

    expect(activeNavId(userItems, '/user/workout')).toBe('training');
    expect(activeNavId(userItems, '/user/workout/active')).toBe('training');
  });

  it('keeps user secondary routes ordered and gates Supplements', () => {
    expect(secondaryNavItemsFor('user').map((item) => item.label)).toEqual([
      'Exercises',
      'Nutrition',
      'Calendar',
      'Learning',
      'Feedback',
      'Settings',
    ]);

    expect(secondaryNavItemsFor('user', true).map((item) => item.label)).toEqual([
      'Exercises',
      'Nutrition',
      'Calendar',
      'Supplements',
      'Learning',
      'Feedback',
      'Settings',
    ]);
  });

  it('uses coach-context hrefs for coach workspace and support routes', () => {
    expect(secondaryNavItemsFor('coach')).toEqual([
      {
        label: 'Exercises',
        href: '/user/coach/exercises',
        detail: 'Exercise library and client-facing notes',
        matchPrefixes: ['/user/coach/exercises'],
      },
      {
        label: 'Check-in template',
        href: '/user/coach/check-in-template',
        detail: 'Edit client check-in questions',
        matchPrefixes: ['/user/coach/check-in-template'],
      },
      {
        label: 'Learning plans',
        href: '/user/coach/learning-plans',
        detail: 'Create and assign education',
        matchPrefixes: ['/user/coach/learning-plans'],
      },
      {
        label: 'Feedback',
        href: '/user/coach/feedback',
        detail: 'Send product feedback',
        matchPrefixes: ['/user/coach/feedback'],
      },
      {
        label: 'Settings',
        href: '/user/settings',
        detail: 'Account, coaching, exports',
        matchPrefixes: ['/user/settings'],
      },
    ]);
  });

  it('marks secondary routes active from exact or nested paths', () => {
    const [exercises] = secondaryNavItemsFor('coach');

    expect(isSecondaryNavItemActive(exercises, '/user/coach/exercises')).toBe(true);
    expect(isSecondaryNavItemActive(exercises, '/user/coach/exercises/42')).toBe(true);
    expect(isSecondaryNavItemActive(exercises, '/exercises')).toBe(false);
  });

  it('keeps coach Library primary inside the coach shell', () => {
    const coachItems = navItemsFor('coach');

    expect(coachItems.find((item) => item.id === 'library')).toMatchObject({
      href: '/user/coach/library',
      matchPrefixes: ['/user/coach/library'],
    });
    expect(activeNavId(coachItems, '/user/coach/library')).toBe('library');
  });
});
