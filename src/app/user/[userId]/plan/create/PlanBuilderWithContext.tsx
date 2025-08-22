import {WorkoutEditorProvider} from "@/context/WorkoutEditorContext";
import {PlanBuilder} from "./PlanBuilder";
import {PlanPrisma, SetPrisma, UserPrisma, WeekPrisma, WorkoutExercisePrisma, WorkoutPrisma} from "@/types/dataTypes";
import {Exercise} from "@prisma/client";

export const PLACEHOLDER_ID = -1

export default function PlanBuilderWithContext({userData, allExercises}: {
  userData: UserPrisma,
  allExercises: Exercise[]
}) {
  const maxOrder = userData.plans
    .reduce((max, obj) => Math.max(max, obj.order), -Infinity)

  const placeholderSet: SetPrisma = {
    id: PLACEHOLDER_ID,
    workoutExerciseId: PLACEHOLDER_ID,
    reps: null,
    weight: null,
    order: 1
  }

  const placeholderExercise: WorkoutExercisePrisma = {
    id: PLACEHOLDER_ID,
    notes: null,
    order: 1,
    workoutId: PLACEHOLDER_ID,
    exercise: {
      category: "none",
      name: "",
      id: PLACEHOLDER_ID,
      description: null
    },
    exerciseId: PLACEHOLDER_ID,
    repRange: "",
    restTime: "",
    sets: [placeholderSet],
  }

  const placeholderWorkout: WorkoutPrisma = {
    name: "Workout 1",
    id: PLACEHOLDER_ID,
    weekId: PLACEHOLDER_ID,
    order: 1,
    notes: null,
    dateCompleted: null,
    exercises: [placeholderExercise],
  }

  const placeholderWeek: WeekPrisma = {
    id: PLACEHOLDER_ID,
    planId: PLACEHOLDER_ID,
    order: 1,
    workouts: [placeholderWorkout]
  }

  const placeholderPlan: PlanPrisma = {
    weeks: [placeholderWeek],
    name: "",
    id: PLACEHOLDER_ID,
    userId: userData.id,
    order: maxOrder + 1,
    description: null
  }

  return (
    <WorkoutEditorProvider allExercises={allExercises}
                           userData={{...userData, plans: [...userData.plans, placeholderPlan]}}>
      <PlanBuilder/>
    </WorkoutEditorProvider>
  );
}