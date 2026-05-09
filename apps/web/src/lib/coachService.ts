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

export type CoachHomeData = {
  summary: {
    clientCount: number;
    submittedCheckInCount: number;
    maintenanceCount: number;
  };
  submittedCheckIns: {
    checkInId: number;
    clientId: string;
    clientName: string | null;
    weekStartDate: Date;
    completedAt: Date;
  }[];
  planMaintenance: {
    clientId: string;
    clientName: string | null;
    planId: number | null;
    planName: string | null;
    kind: 'block_ending' | 'plan_stale' | 'no_active_plan';
    blockEndDate: Date | null;
    daysUntilBlockEnd: number | null;
    lastPlanActivityDate: Date | null;
    staleDays: number | null;
  }[];
};

const PLAN_STALE_AFTER_DAYS = 14;
const BLOCK_ENDING_SOON_DAYS = 7;

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

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function diffInDays(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / msPerDay);
}

export async function getCoachHomeData(coachId: string): Promise<CoachHomeData> {
  const today = startOfDay(new Date());
  const staleBefore = new Date(today);
  staleBefore.setDate(staleBefore.getDate() - PLAN_STALE_AFTER_DAYS);
  const blockEndingCutoff = new Date(today);
  blockEndingCutoff.setDate(blockEndingCutoff.getDate() + BLOCK_ENDING_SOON_DAYS);

  const clients = await prisma.user.findMany({
    where: { coachId },
    select: {
      id: true,
      name: true,
      activePlan: {
        select: {
          id: true,
          name: true,
          lastActivityDate: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  if (clients.length === 0) {
    return {
      summary: {
        clientCount: 0,
        submittedCheckInCount: 0,
        maintenanceCount: 0,
      },
      submittedCheckIns: [],
      planMaintenance: [],
    };
  }

  const clientIds = clients.map(client => client.id);
  const [submittedCheckIns, currentBlocks] = await Promise.all([
    prisma.weeklyCheckIn.findMany({
      where: {
        userId: { in: clientIds },
        completedAt: { not: null },
        coachReviewedAt: null,
      },
      select: {
        id: true,
        userId: true,
        weekStartDate: true,
        completedAt: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    }),
    prisma.event.findMany({
      where: {
        userId: { in: clientIds },
        eventType: 'BlockEvent',
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: {
        userId: true,
        endDate: true,
      },
      orderBy: [
        { userId: 'asc' },
        { endDate: 'asc' },
      ],
    }),
  ]);

  const earliestBlockByClientId = new Map<string, Date>();
  currentBlocks.forEach(block => {
    if (!earliestBlockByClientId.has(block.userId)) {
      earliestBlockByClientId.set(block.userId, block.endDate);
    }
  });

  const planMaintenance = clients
    .map(client => {
      if (!client.activePlan) {
        return {
          clientId: client.id,
          clientName: client.name,
          planId: null,
          planName: null,
          kind: 'no_active_plan' as const,
          blockEndDate: null,
          daysUntilBlockEnd: null,
          lastPlanActivityDate: null,
          staleDays: null,
        };
      }

      const blockEndDate = earliestBlockByClientId.get(client.id) ?? null;
      const daysUntilBlockEnd = blockEndDate ? diffInDays(today, blockEndDate) : null;
      const lastPlanActivityDate = client.activePlan.lastActivityDate ?? null;
      const staleDays = lastPlanActivityDate ? diffInDays(lastPlanActivityDate, today) : null;

      if (blockEndDate && blockEndDate <= blockEndingCutoff) {
        return {
          clientId: client.id,
          clientName: client.name,
          planId: client.activePlan.id,
          planName: client.activePlan.name,
          kind: 'block_ending' as const,
          blockEndDate,
          daysUntilBlockEnd,
          lastPlanActivityDate,
          staleDays,
        };
      }

      if (!lastPlanActivityDate || lastPlanActivityDate < staleBefore) {
        return {
          clientId: client.id,
          clientName: client.name,
          planId: client.activePlan.id,
          planName: client.activePlan.name,
          kind: 'plan_stale' as const,
          blockEndDate,
          daysUntilBlockEnd,
          lastPlanActivityDate,
          staleDays,
        };
      }

      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => {
      const rank = (kind: CoachHomeData['planMaintenance'][number]['kind']) => {
        switch (kind) {
          case 'no_active_plan':
            return 0;
          case 'block_ending':
            return 1;
          case 'plan_stale':
            return 2;
        }
      };

      const kindRank = rank(left.kind) - rank(right.kind);
      if (kindRank !== 0) return kindRank;

      if (left.kind === 'block_ending' && right.kind === 'block_ending') {
        return (left.daysUntilBlockEnd ?? Number.MAX_SAFE_INTEGER) - (right.daysUntilBlockEnd ?? Number.MAX_SAFE_INTEGER);
      }

      if (left.kind === 'plan_stale' && right.kind === 'plan_stale') {
        return (right.staleDays ?? -1) - (left.staleDays ?? -1);
      }

      return (left.clientName ?? '').localeCompare(right.clientName ?? '');
    });

  return {
    summary: {
      clientCount: clients.length,
      submittedCheckInCount: submittedCheckIns.length,
      maintenanceCount: planMaintenance.length,
    },
    submittedCheckIns: submittedCheckIns.map(checkIn => ({
      checkInId: checkIn.id,
      clientId: checkIn.user.id,
      clientName: checkIn.user.name,
      weekStartDate: checkIn.weekStartDate,
      completedAt: checkIn.completedAt ?? checkIn.weekStartDate,
    })),
    planMaintenance,
  };
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
