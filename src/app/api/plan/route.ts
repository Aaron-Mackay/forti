import {NextRequest, NextResponse} from "next/server";
import {saveUserPlan} from "@lib/api";
import {PlanPrisma} from "@/types/dataTypes";
import { AuditEventType } from '@/generated/prisma/browser';
import { recordAuditEvent } from '@lib/auditEvents';
import confirmPermission from "@lib/confirmPermission";
import {PlanPostSchema} from "@lib/planSchemas";
import {authenticationErrorResponse, isAuthenticationError} from "@lib/requireSession";
import { getSessionActorUserId } from '@lib/sessionActor';

export type PlanUploadResponse = {
  success: boolean;
  planId?: number;
  error?: string;
}
export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = PlanPostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {success: false, error: 'Invalid request', issues: parsed.error.flatten()} as PlanUploadResponse,
      {status: 400}
    );
  }

  try {
    await confirmPermission(parsed.data.userId);
    const actorUserId = await getSessionActorUserId();

    const uploadedPlanId = await saveUserPlan(parsed.data as PlanPrisma);

    if (actorUserId) {
      const workoutCount = parsed.data.weeks.reduce((total, week) => total + week.workouts.length, 0);
      await recordAuditEvent({
        actorUserId,
        eventType: AuditEventType.PlanCreated,
        analyticsEvent: 'plan_created',
        analyticsData: {
          weekCount: parsed.data.weeks.length,
          workoutCount,
          target: actorUserId === parsed.data.userId ? 'self' : 'client',
        },
        subjectType: 'plan',
        subjectId: uploadedPlanId,
        metadata: {
          targetUserId: parsed.data.userId,
          weekCount: parsed.data.weeks.length,
          workoutCount,
        },
      });
    }

    return NextResponse.json({ success: true, planId: uploadedPlanId } as PlanUploadResponse, { status: 200 });
  } catch (error) {
    if (isAuthenticationError(error)) return authenticationErrorResponse();
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to create plan' } as PlanUploadResponse, { status: 500 })
  }
}
