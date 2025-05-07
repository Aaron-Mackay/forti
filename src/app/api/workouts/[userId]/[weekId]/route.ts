
import { NextResponse } from 'next/server';
import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

// GET request to fetch workouts for a specific user and week
export async function GET(req: Request, { params }: { params: Promise<{ userId: string; weekId: string }> }) {
  const { userId, weekId } = await params;

  try {
    // Fetch workouts for the specified user and week
    const workouts = await prisma.workout.findMany({
      where: {
        week: {
          userId: Number(userId),
          id: Number(weekId),
        },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: true, // ✅ This is valid here, inside WorkoutExercise
          },
        },
      },
    });


    if (!workouts.length) {
      return NextResponse.json({ message: 'No workouts found for this user and week' }, { status: 404 });
    }

    return NextResponse.json(workouts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 });
  }
}
