import { track } from '@vercel/analytics';

type FirstWeekEventKey =
  | 'onboarding_completed'
  | 'first_metric_logged'
  | 'first_nutrition_target_set'
  | 'first_workout_completed'
  | 'first_checkin_submitted';

function storageKey(key: FirstWeekEventKey) {
  return `forti:first-week:${key}`;
}

export function trackFirstWeekEvent(
  key: FirstWeekEventKey,
  payload?: Record<string, string | number | boolean>
) {
  if (typeof window === 'undefined') return;
  const k = storageKey(key);
  if (window.localStorage.getItem(k)) return;
  track(key, payload);
  window.localStorage.setItem(k, '1');
}
