import {PrismaClient} from "@prisma/client";
import {NextResponse} from "next/server";
import prisma from '@/lib/prisma';

export async function GET(req: Request, {params}: { params: Promise<{ exerciseId: string }> }) {
  {
    const {exerciseId} = await params;

    try {
      const workoutExercise = await prisma.workoutExercise.findUnique({
        where: {
          id: Number(exerciseId),
        },
        include: {
          exercise: true,
          sets: true,
        },
      });

      if (!workoutExercise) {
        return NextResponse.json({message: 'No exercise found for id'}, {status: 404});
      }

      return NextResponse.json(workoutExercise);
    } catch (error) {
      return NextResponse.json({error: 'Failed to fetch exercise'}, {status: 500});
    }
  }
}
