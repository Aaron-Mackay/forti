import prisma from '@/lib/prisma';
import { getWeekStart } from '@/lib/checkInUtils';

export type CoachClientHealthSummary = {
  clientId: string;
  clientName: string | null;
  activePlan: {
    id: number;
    name: string;
  } | null;
  lastWorkoutDate: Date | null;
  lastMetricEntryDate: Date | null;
  currentWeekCheckInStatus: 'submitted' | 'pending';
  latestCoachReviewStatus: 'reviewed' | 'awaiting_review' | 'no_checkins';
  latestCoachReviewAt: Date | null;
  unreadClientNotifications: number;
  riskFlags: string[];
};

export async function getCoachClients(coachId: string): Promise<{ id: string; name: string | null }[]> {
  return prisma.user.findMany({
    where: { coachId },
    select: { id: true, name: true },
  });
}

export async function getCoachClientHealthSummary(coachId: string): Promise<CoachClientHealthSummary[]> {
  const clients = await prisma.user.findMany({
    where: { coachId },
    select: {
      id: true,
      name: true,
      activePlan: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  if (clients.length === 0) return [];

  const clientIds = clients.map(client => client.id);
  const currentWeekStart = getWeekStart(new Date());
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setHours(0, 0, 0, 0);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [lastWorkoutByClient, lastMetricByClient, currentWeekCheckIns, latestCompletedCheckIns, unreadCheckInNotifications] = await Promise.all([
    prisma.trainingSession.groupBy({
      by: ['userId'],
      where: {
        userId: { in: clientIds },
        sessionType: 'workout',
        status: 'completed',
      },
      _max: { performedAt: true },
    }),
    prisma.metric.groupBy({
      by: ['userId'],
      where: { userId: { in: clientIds } },
      _max: { date: true },
    }),
    prisma.weeklyCheckIn.findMany({
      where: {
        userId: { in: clientIds },
        weekStartDate: currentWeekStart,
      },
      select: {
        userId: true,
        completedAt: true,
      },
    }),
    prisma.weeklyCheckIn.findMany({
      where: {
        userId: { in: clientIds },
        completedAt: { not: null },
      },
      orderBy: [
        { userId: 'asc' },
        { completedAt: 'desc' },
      ],
      distinct: ['userId'],
      select: {
        userId: true,
        coachReviewedAt: true,
      },
    }),
    getUnreadClientNotificationsByClient(coachId),
  ]);

  const lastWorkoutMap = new Map(lastWorkoutByClient.map(entry => [entry.userId, entry._max.performedAt ?? null]));
  const lastMetricMap = new Map(lastMetricByClient.map(entry => [entry.userId, entry._max.date ?? null]));
  const currentWeekCheckInMap = new Map(currentWeekCheckIns.map(entry => [entry.userId, entry]));
  const latestCompletedCheckInMap = new Map(latestCompletedCheckIns.map(entry => [entry.userId, entry]));

  return clients.map(client => {
    const lastWorkoutDate = lastWorkoutMap.get(client.id) ?? null;
    const currentWeekCheckIn = currentWeekCheckInMap.get(client.id);
    const latestCompletedCheckIn = latestCompletedCheckInMap.get(client.id);

    const currentWeekCheckInStatus = currentWeekCheckIn?.completedAt ? 'submitted' : 'pending';
    const latestCoachReviewStatus = !latestCompletedCheckIn
      ? 'no_checkins'
      : latestCompletedCheckIn.coachReviewedAt
        ? 'reviewed'
        : 'awaiting_review';

    const riskFlags: string[] = [];
    if (currentWeekCheckInStatus === 'pending') {
      riskFlags.push('No check-in this week');
    }
    if (!lastWorkoutDate || lastWorkoutDate < sevenDaysAgo) {
      riskFlags.push('No workout in 7 days');
    }

    return {
      clientId: client.id,
      clientName: client.name,
      activePlan: client.activePlan,
      lastWorkoutDate,
      lastMetricEntryDate: lastMetricMap.get(client.id) ?? null,
      currentWeekCheckInStatus,
      latestCoachReviewStatus,
      latestCoachReviewAt: latestCompletedCheckIn?.coachReviewedAt ?? null,
      unreadClientNotifications: unreadCheckInNotifications.get(client.id) ?? 0,
      riskFlags,
    };
  });
}

async function getUnreadClientNotificationsByClient(coachId: string): Promise<Map<string, number>> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId: coachId,
      type: 'CheckInSubmitted',
      readAt: null,
    },
    select: { url: true },
  });

  const checkInIds = notifications
    .map(notification => {
      const match = notification.url.match(/\/user\/coach\/check-ins\/(\d+)/);
      return match ? Number(match[1]) : null;
    })
    .filter((id): id is number => id !== null);

  if (checkInIds.length === 0) return new Map();

  const checkIns = await prisma.weeklyCheckIn.findMany({
    where: { id: { in: checkInIds } },
    select: { id: true, userId: true },
  });

  const userByCheckInId = new Map(checkIns.map(checkIn => [checkIn.id, checkIn.userId]));
  const countByClientId = new Map<string, number>();

  checkInIds.forEach(checkInId => {
    const clientId = userByCheckInId.get(checkInId);
    if (!clientId) return;
    countByClientId.set(clientId, (countByClientId.get(clientId) ?? 0) + 1);
  });

  return countByClientId;
}

export async function getCoachFromUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      coachId: true,
    },
  });
}
