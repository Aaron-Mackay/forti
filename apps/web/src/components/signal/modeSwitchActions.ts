import type { SignalNavMode } from '@lib/signal/tokens';

const COACH_LANDING = '/user/coach';
const USER_LANDING = '/user';
const PREF_COOKIE = 'preferred_mode';
const PREF_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function navigateToMode(next: SignalNavMode, push: (url: string) => void) {
  document.cookie = `${PREF_COOKIE}=${next}; path=/; max-age=${PREF_MAX_AGE}; SameSite=Lax`;
  push(next === 'coach' ? COACH_LANDING : USER_LANDING);
}
