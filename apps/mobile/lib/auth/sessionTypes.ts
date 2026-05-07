export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type SignedOutReason = 'manual' | 'expired' | 'unknown';

export type AuthState =
  | { status: 'loading'; user: null; reason: null }
  | { status: 'signed-out'; user: null; reason: SignedOutReason | null }
  | { status: 'signed-in'; user: AuthUser; reason: null };

export function getSignedOutReasonMessage(reason: SignedOutReason | null): string | null {
  switch (reason) {
    case 'manual':
      return 'You have been signed out.';
    case 'expired':
      return 'Your session expired. Sign in again to continue.';
    case 'unknown':
      return 'Your session is no longer available. Sign in again.';
    default:
      return null;
  }
}
