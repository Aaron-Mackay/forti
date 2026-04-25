export type NotificationConfig = {
  email: {
    apiKey?: string;
    from?: string;
  };
  push: {
    publicKey?: string;
    privateKey?: string;
    subject: string;
  };
  canSendEmail: boolean;
  canSendPush: boolean;
};

/**
 * Reads notification-related environment variables and derives safe capabilities
 * for downstream notification delivery.
 */
export function getNotificationConfig(): NotificationConfig {
  const apiKey = process.env.MAILERSEND_API_KEY;
  const from = process.env.MAILERSEND_FROM;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:noreply@example.com';

  const canSendEmail = Boolean(apiKey && from);
  const canSendPush = Boolean(publicKey && privateKey);

  return {
    email: {
      apiKey,
      from,
    },
    push: {
      publicKey,
      privateKey,
      subject,
    },
    canSendEmail,
    canSendPush,
  };
}
