
import prisma from '@/lib/prisma';
import {WorkoutPrisma} from "@/types/dataTypes";

export async function POST(req: Request) {
  const userData = await req.json();

  const userId = userData.id;
  if (!userId) {
    return new Response("Missing userId", {status: 400});
  }


  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all nested data
      const weekIds = await tx.week.findMany({
        where: {userId},
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
        where: {userId}
      });

      // 2. Recreate all weeks, workouts, etc.
      for (const week of userData.weeks) {
        await tx.week.create({
          data: {
            userId,
            order: week.order,
            workouts: {
              create: week.workouts.map((workout: WorkoutPrisma) => ({
                name: workout.name,
                notes: workout.notes,
                order: workout.order,
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
                      sets: {
                        create: exercise.sets.map(set => ({
                          weight: set.weight ?? null,
                          reps: set.reps ?? null,
                          order: set.order
                        }))
                      }
                    }))
                }
              }))
            }
          }
        });
      }
    });

    return new Response(JSON.stringify({success: true}), {status: 200});
  } catch (err: unknown) {
    console.error("Save error:", err);

    let message = "Unknown error";
    if (err && typeof err === "object" && "message" in err) {
      message = String((err as { message: unknown }).message);
    }

    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}