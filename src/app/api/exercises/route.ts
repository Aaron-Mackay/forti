import {PrismaClient} from "@prisma/client";
import {NextResponse} from "next/server";

const prisma = new PrismaClient();

type ExerciseData = {
  id: number,
  name: string,
  category: string | null,
  description: string | null
}

export async function GET(req: Request) {
  {
    try {
      const exercises: ExerciseData[] = await prisma.exercise.findMany();

      if (!exercises) {
        return NextResponse.json({message: 'No exercises found'}, {status: 404});
      }

      return NextResponse.json(exercises);
    } catch (error) {
      return NextResponse.json({error: 'Failed to fetch exercise'}, {status: 500});
    }
  }
}
