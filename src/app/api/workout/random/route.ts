import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  const workouts = await prisma.workout.findMany({
    include: {
      exercises: {
        include: {
          exercise: true,
          sets: true,
        },
      },
    },
  });

  const random = workouts[Math.floor(Math.random() * workouts.length)];

  const formatted = {
    id: random.id,
    name: random.name,
    exercises: random.exercises.map((ex) => ({
      id: ex.id,
      name: ex.exercise.name,
      sets: ex.sets,
    })),
  };

  return NextResponse.json(formatted);
}
