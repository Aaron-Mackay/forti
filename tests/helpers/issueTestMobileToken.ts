import { issueMobileAccessToken } from '@lib/mobileAuth';

export async function issueTestMobileToken(userId: string) {
  return issueMobileAccessToken(userId);
}
