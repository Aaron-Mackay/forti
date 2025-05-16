import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const userData = await req.json();

  if (!userData?.id) {
    return new Response("Missing userId", {status: 400});
  }

  const userId = userData.id;

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

        const createdWeek = await tx.week.create({
          data: {
            userId,
            order: week.order,
            workouts: {
              create: week.workouts.map(workout => ({
                name: workout.name,
                notes: workout.notes,
                order: workout.order,
                exercises: {
                  create: workout.exercises
                    .filter(x => x.exercise.id) // ignore new exercises that aren't filled
                    .map(exercise => ({
                      exercise: {
                        connect: {id: exercise.exercise.id}
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
  } catch (err: any) {
    console.error("Save error:", err);
    return new Response(JSON.stringify({error: err.message}), {status: 500});
  }
}