import { track } from '@vercel/analytics';
import { storage } from '@lib/storage';

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
  const k = storageKey(key);
  if (storage.getString(k)) return;
  track(key, payload);
  storage.setString(k, '1');
}
