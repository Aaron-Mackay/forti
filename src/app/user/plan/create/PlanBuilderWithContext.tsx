import {WorkoutEditorProvider} from "@/context/WorkoutEditorContext";
import {PlanBuilder} from "./PlanBuilder";
import {PlanPrisma, UserPrisma, WeekPrisma, WorkoutPrisma} from "@/types/dataTypes";
import {Exercise} from "@/generated/prisma/browser";

export const PLACEHOLDER_ID = -1

export default function PlanBuilderWithContext({userData, allExercises, clientId}: {
  userData: UserPrisma,
  allExercises: Exercise[],
  clientId?: string,
}) {
  const maxOrder = userData.plans
    .reduce((max, obj) => Math.max(max, obj.order), -Infinity)

  const placeholderWorkout: WorkoutPrisma = {
    name: "Workout 1",
    id: PLACEHOLDER_ID,
    weekId: PLACEHOLDER_ID,
    order: 1,
    notes: null,
    dateCompleted: null,
    exercises: [],
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
    order: Math.max(maxOrder + 1, 1),
    description: null
  }

  return (
    <WorkoutEditorProvider allExercises={allExercises}
                           userData={{...userData, plans: [...userData.plans, placeholderPlan]}}>
      <PlanBuilder blankPlan={placeholderPlan} clientId={clientId}/>
    </WorkoutEditorProvider>
  );
}
