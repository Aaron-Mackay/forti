import {WorkoutEditorProvider} from "@/context/WorkoutEditorContext";
import {PlanBuilder} from "./PlanBuilder";
import {PlanPrisma, UserPrisma} from "@/types/dataTypes";
import {Exercise} from "@prisma/client";

export const PLACEHOLDER_ID = -1

export default function PlanBuilderWithContext({userData, allExercises}: {
  userData: UserPrisma,
  allExercises: Exercise[]
}) {
  const maxOrder = userData.plans
    .reduce((max, obj) => Math.max(max, obj.order), -Infinity)

  const placeholderWeek = {
    id: PLACEHOLDER_ID,
    planId: PLACEHOLDER_ID,
    order: 1,
    workouts: []
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