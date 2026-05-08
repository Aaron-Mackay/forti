import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import { withRouteAuth } from '@lib/routeAuth';
import { getWorkoutData } from '@lib/userService';
import { notFoundResponse } from '@lib/apiResponses';
import { WorkoutDataResponseSchema } from '@lib/contracts/workoutData';

export const GET = withRouteAuth(async function GET() {
  const session = await requireSession();
  const workoutData = await getWorkoutData(session.user.id);
  if (!workoutData) return notFoundResponse('User');

  return NextResponse.json(WorkoutDataResponseSchema.parse(workoutData));
});
