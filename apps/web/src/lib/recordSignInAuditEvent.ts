import { AuditEventType } from '@/generated/prisma/browser';
import { recordAuditEvent } from '@lib/auditEvents';

export type SignInProvider = 'google' | 'demo' | 'demo-coach' | 'mobile-google';

export async function recordSignInAuditEvent(args: {
  userId: string;
  provider: SignInProvider;
}): Promise<void> {
  const { userId, provider } = args;

  const isGoogle = provider === 'google' || provider === 'mobile-google';
  const analyticsEvent = isGoogle ? 'login_succeeded_google' : 'login_succeeded_demo';
  const analyticsProvider = isGoogle ? provider : 'demo';

  await recordAuditEvent({
    actorUserId: userId,
    eventType: AuditEventType.LoginSucceeded,
    analyticsEvent,
    analyticsData: {
      provider: analyticsProvider,
      isCoach: provider === 'demo-coach',
    },
    subjectType: 'user',
    subjectId: userId,
    metadata: {
      provider,
      isCoach: provider === 'demo-coach',
    },
  });
}
