import prisma from '@/lib/prisma';
import {NextResponse} from "next/server";
import confirmPermission from "@lib/confirmPermission";
import {z} from "zod";
import {extractErrorMessage} from "@lib/apiError";
import {PlanInputSchema} from "@lib/planSchemas";
import {ExerciseCategory} from "@prisma/client";
import {computeE1rm} from "@lib/e1rm";

const SaveUserDataSchema = z.object({
  id: z.string(),
  plans: z.array(PlanInputSchema),
});

export async function POST(req: Request) {
  let body: z.infer<typeof SaveUserDataSchema>;
  try {
    body = SaveUserDataSchema.parse(await req.json());
  } catch {
    return NextResponse.json({error: "Invalid request body"}, {status: 400});
  }

  const userId = body.id;

  try {
    await confirmPermission(userId);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    throw err;
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
      for (const plan of body.plans) {
        await tx.plan.create({
          data: {
            userId,
            order: plan.order,
            name: plan.name,
            description: plan.description ?? null,
            weeks: {
              create: plan.weeks.map((week) => ({
                order: week.order,
                workouts: {
                  create: week.workouts.map((workout) => ({
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
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  category: exercise.exercise.category as any as ExerciseCategory,
                                },
                              },
                              create: {
                                name: exercise.exercise.name,
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                category: exercise.exercise.category as any as ExerciseCategory,
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
                            e1rm: computeE1rm(set.weight, set.reps),
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
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}