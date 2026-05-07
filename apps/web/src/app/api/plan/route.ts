import {NextRequest, NextResponse} from "next/server";
import {saveUserPlan} from "@lib/planService";
import {PlanPrisma} from "@/types/dataTypes";
import { AuditEventType } from '@/generated/prisma/browser';
import { recordAuditEvent } from '@lib/auditEvents';
import confirmPermission from "@lib/confirmPermission";
import { PlanUploadRequestSchema, type PlanUploadSuccess } from '@lib/contracts/plan';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';
import {authenticationErrorResponse, isAuthenticationError} from "@lib/requireSession";
import { getSessionActorUserId } from '@lib/sessionActor';

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  if (json == null) {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = PlanUploadRequestSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
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

    return NextResponse.json({ success: true, planId: uploadedPlanId } satisfies PlanUploadSuccess, { status: 200 });
  } catch (error) {
    if (isAuthenticationError(error)) return authenticationErrorResponse();
    console.error(error);
    return errorResponse('Failed to create plan', 500);
  }
}
