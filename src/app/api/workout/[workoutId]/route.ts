import {NextResponse} from 'next/server';

import prisma from '@/lib/prisma';

// GET request to fetch workouts for a specific user and week
export async function GET(req: Request, {params}: { params: Promise<{ workoutId: string }> }) {
  const {workoutId} = await params;

  try {
    // Fetch workouts for the specified user and week
    const workout = await prisma.workout.findUnique({
      where: {
        id: Number(workoutId)
      },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: true, // ✅ This is valid here, inside WorkoutExercise
          },
        },
      }
    });

    if (!workout) {
      return NextResponse.json({message: 'No workout found for id'}, {status: 404});
    }

    return NextResponse.json(workout);
  } catch (error) {
    return NextResponse.json({error: 'Failed to fetch workout'}, {status: 500});
  }
}
