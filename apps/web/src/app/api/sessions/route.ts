import prisma from '@/lib/prisma';
import { validationErrorResponse, errorResponse } from '@lib/apiResponses';
import { requireSession } from '@lib/requireSession';
import {
  SessionCreateRequestSchema,
  SessionListQuerySchema,
  SessionsListResponseSchema,
  type SessionItem,
} from '@lib/contracts/sessions';

type TrainingSessionDelegate = {
  create: (args: Record<string, unknown>) => Promise<{
    id: number;
    sessionType: 'workout' | 'cardio';
    status: 'planned' | 'completed';
    performedAt: Date;
    workoutId: number | null;
    activityType: string | null;
    durationSec: number | null;
    distanceM: number | null;
    avgPace: number | null;
    avgHr: number | null;
    calories: number | null;
    notes: string | null;
  }>;
  findMany: (args: Record<string, unknown>) => Promise<Array<{
    id: number;
    sessionType: 'workout' | 'cardio';
    status: 'planned' | 'completed';
    performedAt: Date;
    workoutId: number | null;
    activityType: string | null;
    durationSec: number | null;
    distanceM: number | null;
    avgPace: number | null;
    avgHr: number | null;
    calories: number | null;
    notes: string | null;
  }>>;
};

const trainingSessionDelegate = (prisma as unknown as { trainingSession: TrainingSessionDelegate }).trainingSession;

function toSessionItem(session: {
  id: number;
  sessionType: 'workout' | 'cardio';
  status: 'planned' | 'completed';
  performedAt: Date;
  workoutId: number | null;
  activityType: string | null;
  durationSec: number | null;
  distanceM: number | null;
  avgPace: number | null;
  avgHr: number | null;
  calories: number | null;
  notes: string | null;
}): SessionItem {
  return {
    id: session.id,
    sessionType: session.sessionType,
    status: session.status,
    performedAt: session.performedAt.toISOString(),
    workoutId: session.workoutId,
    cardio: session.sessionType === 'cardio'
      ? {
          activityType: session.activityType ?? '',
          durationSec: session.durationSec ?? 0,
          distanceM: session.distanceM ?? undefined,
          avgPace: session.avgPace ?? undefined,
          avgHr: session.avgHr ?? undefined,
          calories: session.calories ?? undefined,
          notes: session.notes ?? undefined,
        }
      : null,
  };
}

export async function POST(req: Request) {
  const session = await requireSession();

  const json = await req.json().catch(() => null);
  if (json == null) {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = SessionCreateRequestSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const body = parsed.data;

  if (body.sessionType === 'workout') {
    const ownedWorkout = await prisma.workout.findFirst({
      where: {
        id: body.workoutId,
        week: {
          plan: {
            userId: session.user.id,
          },
        },
      },
      select: { id: true, dateCompleted: true },
    });

    if (!ownedWorkout) {
      return errorResponse('Workout not found for user', 404);
    }
  }

  const created = await trainingSessionDelegate.create({
    data: {
      userId: session.user.id,
      sessionType: body.sessionType,
      status: body.status,
      performedAt: body.performedAt ? new Date(body.performedAt) : new Date(),
      workoutId: body.sessionType === 'workout' ? body.workoutId : null,
      activityType: body.sessionType === 'cardio' ? body.cardio?.activityType : null,
      durationSec: body.sessionType === 'cardio' ? body.cardio?.durationSec : null,
      distanceM: body.sessionType === 'cardio' ? body.cardio?.distanceM ?? null : null,
      avgPace: body.sessionType === 'cardio' ? body.cardio?.avgPace ?? null : null,
      avgHr: body.sessionType === 'cardio' ? body.cardio?.avgHr ?? null : null,
      calories: body.sessionType === 'cardio' ? body.cardio?.calories ?? null : null,
      notes: body.sessionType === 'cardio' ? body.cardio?.notes ?? null : null,
    },
  });

  return Response.json(toSessionItem(created), { status: 201 });
}

export async function GET(req: Request) {
  const session = await requireSession();

  const { searchParams } = new URL(req.url);
  const parsed = SessionListQuerySchema.safeParse({
    type: searchParams.get('type') ?? undefined,
    status: searchParams.get('status') ?? undefined,
  });

  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const query = parsed.data;

  const rows = await trainingSessionDelegate.findMany({
    where: {
      userId: session.user.id,
      ...(query.type !== 'all' ? { sessionType: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    orderBy: [
      { performedAt: 'desc' },
      { id: 'desc' },
    ],
  });

  const payload = SessionsListResponseSchema.parse({
    sessions: rows.map(toSessionItem),
  });

  return Response.json(payload);
}
