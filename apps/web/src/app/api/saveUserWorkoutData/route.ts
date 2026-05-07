import prisma from '@/lib/prisma';
import {NextResponse} from "next/server";
import confirmPermission from "@lib/confirmPermission";
import {extractErrorMessage} from "@lib/apiError";
import {AuditEventType} from "@/generated/prisma/browser";
import { recordAuditEvent } from '@lib/auditEvents';
import {authenticationErrorResponse, isAuthenticationError} from "@lib/requireSession";
import { getSessionActorUserId } from '@lib/sessionActor';
import { getCoachFromUser } from '@lib/coachService';
import {
  SaveUserWorkoutDataRequestSchema,
  type SaveUserWorkoutDataRequest,
  type SaveUserWorkoutDataSuccess,
} from '@lib/contracts/saveUserWorkoutData';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';
import { syncPlanTree } from '@lib/savePlanTreeDiff';

const SAVE_USER_WORKOUT_DATA_TRANSACTION_TIMEOUT_MS = 15_000;

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  if (json == null) {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = SaveUserWorkoutDataRequestSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const body: SaveUserWorkoutDataRequest = parsed.data;

  const userId = body.id;

  try {
    await confirmPermission(userId);
  } catch (err) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    throw err;
  }

  const actorUserId = await getSessionActorUserId();
  const assignedCoach = await getCoachFromUser(userId);
  const actorIsAssignedCoach = Boolean(actorUserId && assignedCoach?.coachId === actorUserId);


  try {
    await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { id: userId },
        select: { activePlanId: true },
      });

      const previousActivePlan = existingUser?.activePlanId == null
        ? null
        : await tx.plan.findUnique({
            where: { id: existingUser.activePlanId },
            select: { order: true },
          });

      await syncPlanTree(tx, userId, body.plans, { actorIsAssignedCoach });

      const requestedActivePlanOrder = body.activePlanId === undefined
        ? undefined
        : body.activePlanId === null
          ? null
          : body.plans.find((plan) => plan.id === body.activePlanId)?.order ?? null;

      const activePlanOrder = requestedActivePlanOrder === undefined
        ? previousActivePlan?.order ?? null
        : requestedActivePlanOrder;

      if (activePlanOrder === null) {
        await tx.user.update({
          where: { id: userId },
          data: { activePlanId: null },
        });
        return;
      }

      const remappedActivePlan = await tx.plan.findFirst({
        where: { userId, order: activePlanOrder },
        select: { id: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: { activePlanId: remappedActivePlan?.id ?? null },
      });
    }, { timeout: SAVE_USER_WORKOUT_DATA_TRANSACTION_TIMEOUT_MS });

    if (actorUserId) {
      await recordAuditEvent({
        actorUserId,
        eventType: AuditEventType.PlanSaved,
        analyticsEvent: 'plan_saved',
        analyticsData: {
          planCount: body.plans.length,
          target: actorUserId === userId ? 'self' : 'client',
          requiresRecordingCount: actorIsAssignedCoach
            ? body.plans.reduce(
              (total, plan) => total + plan.weeks.reduce(
                (weekTotal, week) => weekTotal + week.workouts.reduce(
                  (workoutTotal, workout) => workoutTotal + workout.exercises.filter((exercise) => exercise.requiresRecording).length,
                  0,
                ),
                0,
              ),
              0,
            )
            : 0,
        },
        subjectType: 'user_plan',
        subjectId: userId,
        metadata: {
          targetUserId: userId,
          planCount: body.plans.length,
          activePlanId: body.activePlanId ?? null,
          requiresRecordingAllowed: actorIsAssignedCoach,
        },
      });
    }

    return NextResponse.json({success: true} satisfies SaveUserWorkoutDataSuccess, {status: 200});
  } catch (err: unknown) {
    console.error("Save error:", err);
    return errorResponse(extractErrorMessage(err), 500);
  }
}
