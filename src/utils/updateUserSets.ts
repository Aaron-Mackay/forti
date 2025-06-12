import {SetPrisma, UserPrisma} from "@/types/dataTypes";

export function updateUserSets(
  user: UserPrisma,
  weekId: number,
  workoutId: number,
  exerciseId: number,
  newSets: SetPrisma[]
): UserPrisma {
  return {
    ...user,
    weeks: user.weeks.map(week =>
      week.id !== weekId
        ? week
        : {
            ...week,
            workouts: week.workouts.map(workout =>
              workout.id !== workoutId
                ? workout
                : {
                    ...workout,
                    exercises: workout.exercises.map(ex =>
                      ex.id !== exerciseId
                        ? ex
                        : { ...ex, sets: newSets }
                    ),
                  }
            ),
          }
    ),
  };
}
