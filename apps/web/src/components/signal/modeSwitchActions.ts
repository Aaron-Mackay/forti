import type { SignalNavMode } from '@lib/signal/tokens';

const COACH_LANDING = '/user/coach/clients';
const USER_LANDING = '/user';

export function navigateToMode(next: SignalNavMode, push: (url: string) => void) {
  const targetPath = next === 'coach' ? COACH_LANDING : USER_LANDING;
  push(targetPath);
}
