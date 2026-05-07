import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';
import webpush from 'web-push';
import type { PushSubscription as DbPushSubscription } from '@/generated/prisma/browser';
import { getCheckInDate } from './checkInUtils';
import { getNotificationConfig } from './notificationConfig';
import prisma from './prisma';

const notificationConfig = getNotificationConfig();
const FROM_NAME = 'Forti';

let mailerSendClient: MailerSend | null = null;

function getMailerSendClient(): MailerSend | null {
  if (!notificationConfig.canSendEmail) return null;

  const apiKey = notificationConfig.email.apiKey;
  if (!apiKey) return null;

  if (!mailerSendClient) {
    mailerSendClient = new MailerSend({ apiKey });
  }

  return mailerSendClient;
}

let isPushConfigured = false;

function ensurePushConfigured(): boolean {
  if (!notificationConfig.canSendPush) return false;
  if (isPushConfigured) return true;

  const publicKey = notificationConfig.push.publicKey;
  const privateKey = notificationConfig.push.privateKey;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    notificationConfig.push.subject,
    publicKey,
    privateKey
  );
  isPushConfigured = true;

  return true;
}

/** Send a weekly check-in reminder to a client */
export async function sendCheckInReminder({
  name,
  email,
}: {
  name: string;
  email: string;
}): Promise<void> {
  if (!notificationConfig.canSendEmail) return;

  const mailer = getMailerSendClient();
  const fromEmail = notificationConfig.email.from;
  if (!mailer || !fromEmail) return;

  const params = new EmailParams()
    .setFrom(new Sender(fromEmail, FROM_NAME))
    .setTo([new Recipient(email, name)])
    .setSubject('Your weekly check-in is due')
    .setText(
      `Hi ${name},\n\nYour weekly check-in is ready to complete.\n\nLog in to Forti and head to the Check-in page to fill it in.\n\n— The Forti Team`
    );

  await mailer.email.send(params);
}

// ---------------------------------------------------------------------------
// Unified event notifications (DB record + push + email in one call)
// ---------------------------------------------------------------------------

/** Fetch a user's push subscriptions, email, and name for notification delivery */
async function getRecipientInfo(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, pushSubscriptions: true },
  });
}

/** Persist a notification record and deliver push + email to a recipient */
async function deliverNotification({
  userId,
  type,
  title,
  body,
  url,
  emailSubject,
  emailText,
}: {
  userId: string;
  type: 'CheckInSubmitted' | 'CoachFeedback' | 'CoachRequestReceived' | 'CoachRequestAccepted' | 'LearningPlanStepDelivered';
  title: string;
  body: string;
  url: string;
  emailSubject: string;
  emailText: string;
}): Promise<void> {
  const recipient = await getRecipientInfo(userId);
  if (!recipient) return;

  // 1. Persist in-app notification
  await prisma.notification.create({
    data: { userId, type, title, body, url },
  });

  // 2. Send push notifications
  await Promise.allSettled(
    recipient.pushSubscriptions.map(sub =>
      sendPushNotification(sub, { title, body, url })
    )
  );

  // 3. Send email
  if (notificationConfig.canSendEmail) {
    const mailer = getMailerSendClient();
    const fromEmail = notificationConfig.email.from;
    if (!mailer || !fromEmail) return;

    const params = new EmailParams()
      .setFrom(new Sender(fromEmail, FROM_NAME))
      .setTo([new Recipient(recipient.email, recipient.name)])
      .setSubject(emailSubject)
      .setText(emailText);
    await mailer.email.send(params);
  }
}

/** Notify a coach that a client has submitted their check-in (replaces sendCheckInCoachAlert) */
export async function notifyCoachCheckInSubmitted(
  coachId: string,
  checkInId: number,
  clientName: string,
  weekStartDate: Date,
  checkInDay: number
): Promise<void> {
  const checkInDate = getCheckInDate(weekStartDate, checkInDay);
  const formatted = checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  await deliverNotification({
    userId: coachId,
    type: 'CheckInSubmitted',
    title: `New check-in from ${clientName}`,
    body: `${clientName} submitted their weekly check-in`,
    url: `/user/coach/check-ins/${checkInId}`,
    emailSubject: `${clientName} completed their check-in`,
    emailText: `Hi,\n\n${clientName} has just submitted their weekly check-in for the week of ${formatted}.\n\nLog in to Forti and visit Client Check-ins to review it.\n\n— The Forti Team`,
  });
}

/** Notify a client that their coach has added feedback on a check-in */
export async function notifyClientCoachFeedback(
  clientId: string,
  coachName: string
): Promise<void> {
  await deliverNotification({
    userId: clientId,
    type: 'CoachFeedback',
    title: 'Coach feedback received',
    body: `${coachName} reviewed your check-in`,
    url: '/user/check-in',
    emailSubject: 'Your coach left feedback on your check-in',
    emailText: `Hi,\n\n${coachName} has reviewed your weekly check-in and left some notes.\n\nLog in to Forti and visit Check-in to read the feedback.\n\n— The Forti Team`,
  });
}

/** Notify a coach that a client has sent them a connection request */
export async function notifyCoachRequestReceived(
  coachId: string,
  clientName: string
): Promise<void> {
  await deliverNotification({
    userId: coachId,
    type: 'CoachRequestReceived',
    title: 'New connection request',
    body: `${clientName} wants you to be their coach`,
    url: '/user/settings',
    emailSubject: `${clientName} wants you as their coach`,
    emailText: `Hi,\n\n${clientName} has sent you a coach connection request.\n\nLog in to Forti and visit Settings to accept or decline.\n\n— The Forti Team`,
  });
}

/** Notify a client that their coach request has been accepted */
export async function notifyClientRequestAccepted(
  clientId: string,
  coachName: string
): Promise<void> {
  await deliverNotification({
    userId: clientId,
    type: 'CoachRequestAccepted',
    title: 'Request accepted',
    body: `${coachName} is now your coach`,
    url: '/user/settings',
    emailSubject: 'Your coach request was accepted',
    emailText: `Hi,\n\n${coachName} has accepted your coach connection request. They can now view your check-ins and training plans.\n\nLog in to Forti to get started.\n\n— The Forti Team`,
  });
}

/** Notify a client that a new learning plan step is available */
export async function notifyClientLearningPlanStep(
  clientId: string,
  stepTitle: string,
  stepBody: string,
): Promise<void> {
  await deliverNotification({
    userId: clientId,
    type: 'LearningPlanStepDelivered',
    title: stepTitle,
    body: stepBody.length > 120 ? stepBody.slice(0, 117) + '…' : stepBody,
    url: '/user/learning-plans',
    emailSubject: stepTitle,
    emailText: `Hi,\n\n${stepBody}\n\nLog in to Forti to read your latest coaching step.\n\n— The Forti Team`,
  });
}

/** Send a coach invitation email to a prospective client (may not be a Forti user yet) */
export async function sendCoachInviteEmail({
  email,
  coachName,
  inviteLink,
}: {
  email: string;
  coachName: string;
  inviteLink: string;
}): Promise<void> {
  if (!notificationConfig.canSendEmail) return;

  const mailer = getMailerSendClient();
  const fromEmail = notificationConfig.email.from;
  if (!mailer || !fromEmail) return;

  const params = new EmailParams()
    .setFrom(new Sender(fromEmail, FROM_NAME))
    .setTo([new Recipient(email)])
    .setSubject(`${coachName} invited you to train on Forti`)
    .setText(
      `Hi,\n\n${coachName} has invited you to connect with them as your coach on Forti.\n\nClick the link below to get started:\n${inviteLink}\n\n— The Forti Team`
    );

  await mailer.email.send(params);
}

/** Send a web push notification to a single subscribed device */
export async function sendPushNotification(
  sub: Pick<DbPushSubscription, 'endpoint' | 'p256dh' | 'auth'>,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!ensurePushConfigured()) return;

  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload)
  );
}
