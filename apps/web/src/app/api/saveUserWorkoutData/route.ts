import prisma from '@/lib/prisma';
import {NextResponse} from "next/server";
import confirmPermission from "@lib/confirmPermission";
import {extractErrorMessage} from "@lib/apiError";
import {AuditEventType} from "@/generated/prisma/browser";
import type { Prisma } from '@/generated/prisma/browser';
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
import { logInvalidJson, logUnexpectedError, logValidationError, summarizePayload, type RequestLogContext } from '@lib/apiLogging';
import { withApiRoute } from '@lib/routeAuth';

const SAVE_USER_WORKOUT_DATA_TRANSACTION_TIMEOUT_MS = 15_000;

async function loadExistingPlansForSave(tx: Prisma.TransactionClient, userId: string): Promise<SaveUserWorkoutDataRequest['plans']> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      plans: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          clientCanEdit: true,
          order: true,
          weeks: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              order: true,
              workouts: {
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  name: true,
                  notes: true,
                  order: true,
                  dateCompleted: true,
                  exercises: {
                    orderBy: { order: 'asc' },
                    select: {
                      id: true,
                      order: true,
                      repRange: true,
                      restTime: true,
                      notes: true,
                      targetRpe: true,
                      targetRir: true,
                      isBfr: true,
                      requiresRecording: true,
                      exercise: {
                        select: { id: true, name: true, category: true, primaryMuscles: true, secondaryMuscles: true },
                      },
                      sets: {
                        orderBy: { order: 'asc' },
                        select: { id: true, weight: true, reps: true, rpe: true, rir: true, order: true, isDropSet: true, parentSetId: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return user?.plans ?? [];
}

export const POST = withApiRoute({ route: '/api/saveUserWorkoutData' }, async function POST(ctx: RequestLogContext, req: Request) {
  const json = await req.json().catch(() => null);
  if (json == null) {
    logInvalidJson(ctx);
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = SaveUserWorkoutDataRequestSchema.safeParse(json);
  if (!parsed.success) {
    logValidationError(ctx, parsed.error, summarizePayload(json, ['id', 'activePlanId', 'plans']));
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

      let plansToSave = body.plans;
      if (body.saveScope) {
        const existingPlanData = await loadExistingPlansForSave(tx, userId);
        const incomingById = new Map(body.plans.filter((plan) => plan.id != null).map((plan) => [plan.id!, plan]));
        plansToSave = existingPlanData.map((plan) => incomingById.get(plan.id) ?? plan);
        const hasScopedPlan = plansToSave.some((plan) => plan.id === body.saveScope?.planId);
        if (!hasScopedPlan && body.plans[0]) plansToSave.push(body.plans[0]);
      }

      await syncPlanTree(tx, userId, plansToSave, { actorIsAssignedCoach });

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
    logUnexpectedError(ctx, err, { userId });
    return errorResponse(extractErrorMessage(err), 500);
  }
});
