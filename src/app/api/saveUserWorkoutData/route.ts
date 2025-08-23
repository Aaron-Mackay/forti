import prisma from '@/lib/prisma';
import {WeekPrisma, WorkoutPrisma} from "@/types/dataTypes";
import {NextResponse} from "next/server";
import confirmPermission from "@lib/confirmPermission";

export async function POST(req: Request) {
  const userData = await req.json();

  const userId = userData.id;
  const permissionResult = await confirmPermission(userId);
  if (permissionResult) return permissionResult;

  if (!userId) {
    return NextResponse.json({error: "Missing userId"}, {status: 400});
  }


  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all nested data
      const planIds = await tx.plan.findMany({
        where: {userId},
        select: {id: true},
      });

      const weekIds = await tx.week.findMany({
        where: {planId: {in: planIds.map(p => p.id)}},
        select: {id: true},
      });

      const workoutIds = await tx.workout.findMany({
        where: {weekId: {in: weekIds.map(w => w.id)}},
        select: {id: true},
      });

      const workoutExerciseIds = await tx.workoutExercise.findMany({
        where: {workoutId: {in: workoutIds.map(w => w.id)}},
        select: {id: true},
      });

      await tx.exerciseSet.deleteMany({
        where: {workoutExerciseId: {in: workoutExerciseIds.map(w => w.id)}}
      });

      await tx.workoutExercise.deleteMany({
        where: {workoutId: {in: workoutIds.map(w => w.id)}}
      });

      await tx.workout.deleteMany({
        where: {weekId: {in: weekIds.map(w => w.id)}}
      });

      await tx.week.deleteMany({
        where: {planId: {in: planIds.map(p => p.id)}},
      });

      await tx.plan.deleteMany({
        where: {userId}
      });

      // 2. Recreate all plans, weeks, workouts, etc.
      for (const plan of userData.plans) {
        await tx.plan.create({
          data: {
            userId,
            order: plan.order,
            name: plan.name,
            description: plan.description,
            weeks: {
              create: plan.weeks.map((week: WeekPrisma) => ({
                order: week.order,
                workouts: {
                  create: week.workouts.map((workout: WorkoutPrisma) => ({
                    name: workout.name,
                    notes: workout.notes,
                    order: workout.order,
                    dateCompleted: workout.dateCompleted ? new Date(workout.dateCompleted) : null,
                    exercises: {
                  create: workout.exercises
                    .map(exercise => ({
                        exercise: exercise.exercise.id
                          ? {connect: {id: exercise.exercise.id}}
                          : {
                            connectOrCreate: {
                              where: {
                                name_category: {
                                  name: exercise.exercise.name,
                                  category: exercise.exercise.category,
                                },
                              },
                              create: {
                                name: exercise.exercise.name,
                                category: exercise.exercise.category,
                              },
                            },
                          },
                        order: exercise.order,
                        repRange: exercise.repRange,
                        restTime: exercise.restTime,
                        notes: exercise.notes,
                        sets: {
                        create: exercise.sets.map(set => ({
                            weight: set.weight ?? null,
                            reps: set.reps ?? null,
                            order: set.order,
                          })),
                        },
                      })),
                    },
                  })),
                },
              })),
            },
          },
        });
      }
    });

    return NextResponse.json({success: true}, {status: 200});
  } catch (err: unknown) {
    console.error("Save error:", err);

    let message = "Unknown error";
    if (err && typeof err === "object" && "message" in err) {
      message = String((err as { message: unknown }).message);
    }

    return NextResponse.json({error: message}, {status: 500});
  }
}