import { track } from '@vercel/analytics/server';
import { AuditEventType, Prisma } from '@/generated/prisma/browser';
import prisma from '@lib/prisma';

type AnalyticsData = Record<string, string | number | boolean | undefined>;

type RecordAuditEventInput = {
  actorUserId: string;
  eventType: AuditEventType;
  analyticsEvent: string;
  analyticsData?: AnalyticsData;
  subjectType?: string;
  subjectId?: string | number | null;
  metadata?: Prisma.InputJsonObject;
};

export async function recordAuditEvent({
  actorUserId,
  eventType,
  analyticsEvent,
  analyticsData,
  subjectType,
  subjectId,
  metadata,
}: RecordAuditEventInput) {
  try {
    await prisma.auditEvent.create({
      data: {
        actorUserId,
        eventType,
        subjectType: subjectType ?? null,
        subjectId: subjectId == null ? null : String(subjectId),
        metadata: metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error('Failed to record audit event:', error);
  }

  try {
    await track(analyticsEvent, analyticsData);
  } catch (error) {
    console.error('Failed to track analytics event:', error);
  }
}
