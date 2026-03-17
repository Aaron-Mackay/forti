import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';
import webpush from 'web-push';
import type { PushSubscription as DbPushSubscription } from '@prisma/client';
import { getCheckInDate } from './checkInUtils';

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
