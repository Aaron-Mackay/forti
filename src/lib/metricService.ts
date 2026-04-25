import { Prisma } from '@/generated/prisma/browser';
import prisma from '@/lib/prisma';
import { MetricPrisma } from '@/types/dataTypes';

export async function getUserMetrics(userId: string) {
  return prisma.metric.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });
}

export async function updateUserMetric(metric: Omit<MetricPrisma, 'id' | 'customMetrics'> & { customMetrics: Prisma.InputJsonValue | null }) {
  const { customMetrics, ...rest } = metric;
  // Prisma nullable JSON fields need Prisma.JsonNull (not null) to explicitly clear them
  const customMetricsValue = customMetrics === null ? Prisma.JsonNull : customMetrics;
  return prisma.metric.upsert({
    where: {
      userId_date: {
        userId: metric.userId,
        date: metric.date,
      },
    },
    update: { ...rest, customMetrics: customMetricsValue },
    create: { ...rest, customMetrics: customMetricsValue },
  });
}
