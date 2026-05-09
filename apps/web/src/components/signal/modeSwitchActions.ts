import type { SignalNavMode } from '@lib/signal/tokens';

const COACH_LANDING = '/user/coach/clients';
const USER_LANDING = '/user';
const DEV_COACH_COOKIE = '__dev_coach_mode';

export function navigateToMode(next: SignalNavMode, crossDomainUrl: string | null) {
  const targetPath = next === 'coach' ? COACH_LANDING : USER_LANDING;
  if (crossDomainUrl) {
    window.location.assign(crossDomainUrl + targetPath);
    return;
  }
  if (next === 'coach') {
    document.cookie = `${DEV_COACH_COOKIE}=1; path=/; max-age=86400`;
  } else {
    document.cookie = `${DEV_COACH_COOKIE}=; path=/; max-age=0`;
  }
  window.location.assign(targetPath);
}
