import { EditableUser, EditableSet } from '@/types/editableData';

export function updateUserSets(
  user: EditableUser,
  weekId: string,
  workoutId: string,
  exerciseId: string,
  newSets: EditableSet[]
): EditableUser {
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
