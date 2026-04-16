import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { AuditEventType } from '@/generated/prisma/browser';
import { recordAuditEvent } from '@lib/auditEvents';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { getCheckInWeekStart, toDateOnly } from '@lib/checkInUtils';
import { notifyCoachCheckInSubmitted } from '@lib/notifications';

/** GET /api/check-in — fetch current user's check-in history (newest first) */
export async function GET(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const excludeCurrent = searchParams.get('excludeCurrent') === 'true';

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  const { checkInDay } = parseDashboardSettings(userRecord?.settings);
  const currentWeekStart = toDateOnly(getCheckInWeekStart(new Date(), checkInDay));
  const where = excludeCurrent
    ? { userId, NOT: { weekStartDate: currentWeekStart } }
    : { userId };

  const [checkIns, total] = await Promise.all([
    prisma.weeklyCheckIn.findMany({
      where,
      orderBy: { weekStartDate: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.weeklyCheckIn.count({ where }),
  ]);

  const mappedCheckIns = checkIns.map(c => ({
    ...c,
    frontPhotoUrl: c.frontPhotoUrl ? `/api/check-in/photos/${c.id}/front` : null,
    backPhotoUrl: c.backPhotoUrl ? `/api/check-in/photos/${c.id}/back` : null,
    sidePhotoUrl: c.sidePhotoUrl ? `/api/check-in/photos/${c.id}/side` : null,
  }));

  return NextResponse.json({ checkIns: mappedCheckIns, total });
}

interface CheckInBody {
  energyLevel?: number;
  moodRating?: number;
  stressLevel?: number;
  sleepQuality?: number;
  recoveryRating?: number;
  adherenceRating?: number;
  completedWorkouts?: number;
  plannedWorkouts?: number;
  weekReview?: string;
  coachMessage?: string;
  goalsNextWeek?: string;
}

/** POST /api/check-in — submit (complete) this week's check-in */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const body = await req.json() as CheckInBody;

  // Validate ratings are 1–5 when provided
  const ratingFields = ['energyLevel', 'moodRating', 'stressLevel', 'sleepQuality', 'recoveryRating', 'adherenceRating'] as const;
  for (const field of ratingFields) {
    const val = body[field];
    if (val !== undefined && (typeof val !== 'number' || val < 1 || val > 5)) {
      return NextResponse.json({ error: `${field} must be between 1 and 5` }, { status: 400 });
    }
  }

  // Fetch user settings (and coach) up-front so checkInDay is available for weekStart
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      settings: true,
      coach: { select: { id: true, email: true, name: true } },
    },
  });
  const { checkInDay } = parseDashboardSettings(user?.settings);
  const weekStart = toDateOnly(getCheckInWeekStart(new Date(), checkInDay));

  const existing = await prisma.weeklyCheckIn.findUnique({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
  });
  const isEditingCompletedCheckIn = Boolean(existing?.completedAt);
  const completedAt = isEditingCompletedCheckIn ? new Date() : new Date();

  const checkIn = await prisma.weeklyCheckIn.upsert({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
    create: {
      userId,
      weekStartDate: weekStart,
      completedAt,
      ...body,
    },
    update: {
      completedAt,
      ...body,
    },
  });

  if (user?.coach && !isEditingCompletedCheckIn) {
    await notifyCoachCheckInSubmitted(
      user.coach.id,
      checkIn.id,
      user.name,
      weekStart,
      checkInDay,
    ).catch(err => console.error('Failed to send coach notification:', err));
  }

  await recordAuditEvent({
    actorUserId: userId,
    eventType: AuditEventType.CheckInSubmitted,
    analyticsEvent: 'checkin_submitted',
    analyticsData: {
      hasCoach: Boolean(user?.coach),
      isEdit: isEditingCompletedCheckIn,
    },
    subjectType: 'weekly_check_in',
    subjectId: checkIn.id,
    metadata: {
      checkInId: checkIn.id,
      weekStartDate: weekStart.toISOString(),
      hasCoach: Boolean(user?.coach),
      isEdit: isEditingCompletedCheckIn,
    },
  });

  const mappedCheckIn = {
    ...checkIn,
    frontPhotoUrl: checkIn.frontPhotoUrl ? `/api/check-in/photos/${checkIn.id}/front` : null,
    backPhotoUrl: checkIn.backPhotoUrl ? `/api/check-in/photos/${checkIn.id}/back` : null,
    sidePhotoUrl: checkIn.sidePhotoUrl ? `/api/check-in/photos/${checkIn.id}/side` : null,
  };
  return NextResponse.json({ checkIn: mappedCheckIn }, { status: isEditingCompletedCheckIn ? 200 : 201 });
}
