import { NextRequest, NextResponse } from 'next/server';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { getWeekStart, toDateOnly } from '@lib/checkInUtils';
import { sendCheckInReminder, sendPushNotification } from '@lib/notifications';

/**
 * GET /api/cron/check-in-reminders
 * Intended to run daily via Vercel Cron (see vercel.json).
 * Finds users whose check-in day matches today and who haven't yet submitted
 * this week's check-in, then sends email + push reminders.
 */
export async function GET(req: NextRequest) {
  // Verify the request comes from the Vercel Cron scheduler
  const cronSecret = req.headers.get('authorization');
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Today as 0=Mon…6=Sun
  const jsDay = new Date().getDay(); // 0=Sun…6=Sat
  const todayIndex = (jsDay + 6) % 7; // convert to 0=Mon

  // Get all users (with settings + push subscriptions)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      settings: true,
      pushSubscriptions: true,
    },
  });

  const weekStart = toDateOnly(getWeekStart(new Date()));
  let reminded = 0;

  for (const user of users) {
    const settings = parseDashboardSettings(user.settings);
    if (settings.checkInDay !== todayIndex) continue;

    // Check if already submitted this week
    const existing = await prisma.weeklyCheckIn.findUnique({
      where: { userId_weekStartDate: { userId: user.id, weekStartDate: weekStart } },
      select: { completedAt: true },
    });
    if (existing?.completedAt) continue;

    // Send email reminder
    await sendCheckInReminder({ name: user.name, email: user.email }).catch(
      err => console.error(`Email reminder failed for ${user.email}:`, err)
    );

    // Send push notifications to all registered devices
    for (const sub of user.pushSubscriptions) {
      await sendPushNotification(sub, {
        title: 'Weekly Check-in',
        body: "Time to complete your weekly check-in!",
        url: '/user/check-in',
      }).catch(err => console.error(`Push failed for ${user.email}:`, err));
    }

    reminded++;
  }

  return NextResponse.json({ reminded });
}
