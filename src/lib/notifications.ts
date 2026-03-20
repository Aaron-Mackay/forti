import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';
import webpush from 'web-push';
import type { PushSubscription as DbPushSubscription } from '@prisma/client';
import { getCheckInDate } from './checkInUtils';
import prisma from './prisma';

// Configure web-push VAPID keys once (these are set via env vars)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:noreply@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

function mailer() {
  return new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY! });
}

const FROM_EMAIL = process.env.MAILERSEND_FROM!;
const FROM_NAME = 'Forti';

/** Send a weekly check-in reminder to a client */
export async function sendCheckInReminder({
  name,
  email,
}: {
  name: string;
  email: string;
}): Promise<void> {
  if (!process.env.MAILERSEND_API_KEY || !FROM_EMAIL) return;

  const params = new EmailParams()
    .setFrom(new Sender(FROM_EMAIL, FROM_NAME))
    .setTo([new Recipient(email, name)])
    .setSubject('Your weekly check-in is due')
    .setText(
      `Hi ${name},\n\nYour weekly check-in is ready to complete.\n\nLog in to Forti and head to the Check-in page to fill it in.\n\n— The Forti Team`
    );

  await mailer().email.send(params);
}

/** Notify a coach that a client has completed their check-in */
export async function sendCheckInCoachAlert({
  coach,
  clientName,
  weekStartDate,
  checkInDay,
}: {
  coach: { email: string; name: string };
  clientName: string;
  weekStartDate: Date;
  checkInDay: number;
}): Promise<void> {
  if (!process.env.MAILERSEND_API_KEY || !FROM_EMAIL) return;

  const checkInDate = getCheckInDate(weekStartDate, checkInDay);
  const formatted = checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const params = new EmailParams()
    .setFrom(new Sender(FROM_EMAIL, FROM_NAME))
    .setTo([new Recipient(coach.email, coach.name)])
    .setSubject(`${clientName} completed their check-in`)
    .setText(
      `Hi ${coach.name},\n\n${clientName} has just submitted their weekly check-in for the week of ${formatted}.\n\nLog in to Forti and visit Client Check-ins to review it.\n\n— The Forti Team`
    );

  await mailer().email.send(params);
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
  type: 'CheckInSubmitted' | 'CoachFeedback' | 'CoachRequestReceived' | 'CoachRequestAccepted';
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
  if (process.env.MAILERSEND_API_KEY && FROM_EMAIL) {
    const params = new EmailParams()
      .setFrom(new Sender(FROM_EMAIL, FROM_NAME))
      .setTo([new Recipient(recipient.email, recipient.name)])
      .setSubject(emailSubject)
      .setText(emailText);
    await mailer().email.send(params);
  }
}

/** Notify a coach that a client has submitted their check-in (replaces sendCheckInCoachAlert) */
export async function notifyCoachCheckInSubmitted(
  coachId: string,
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
    url: '/user/coach/check-ins',
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

/** Send a web push notification to a single subscribed device */
export async function sendPushNotification(
  sub: Pick<DbPushSubscription, 'endpoint' | 'p256dh' | 'auth'>,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload)
  );
}
