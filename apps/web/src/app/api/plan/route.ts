import {NextRequest, NextResponse} from "next/server";
import {saveUserPlan} from "@lib/planService";
import {PlanPrisma} from "@/types/dataTypes";
import { AuditEventType } from '@/generated/prisma/browser';
import { recordAuditEvent } from '@lib/auditEvents';
import confirmPermission from "@lib/confirmPermission";
import { PlanUploadRequestSchema, type PlanUploadSuccess } from '@lib/contracts/plan';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';
import {isAuthenticationError} from "@lib/requireSession";
import { getSessionActorUserId } from '@lib/sessionActor';
import { logInvalidJson, logUnexpectedError, logValidationError, summarizePayload, type RequestLogContext } from '@lib/apiLogging';
import { withApiRoute } from '@lib/routeAuth';

export const POST = withApiRoute({ route: '/api/plan' }, async function POST(ctx: RequestLogContext, req: NextRequest) {
  const json = await req.json().catch(() => null);
  if (json == null) {
    logInvalidJson(ctx);
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = PlanUploadRequestSchema.safeParse(json);
  if (!parsed.success) {
    logValidationError(ctx, parsed.error, summarizePayload(json, ['userId', 'weeks']));
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
    if (isAuthenticationError(error)) throw error;
    logUnexpectedError(ctx, error, { userId: parsed.data.userId });
    return errorResponse('Failed to create plan', 500);
  }
});
