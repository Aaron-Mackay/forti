import { useWorkoutEditorContext } from "@/context/WorkoutEditorContext";
import { PlanPrisma } from "@/types/dataTypes";
import { notFound } from "next/navigation";
import {ActionDispatch} from "react";
import {WorkoutEditorAction} from "@lib/useWorkoutEditor";

/**
 * Returns the new (placeholder) plan from context, or throws notFound if not present.
 */
export function useNewPlan(): {statePlan: PlanPrisma, dispatch:  ActionDispatch<[WorkoutEditorAction]>} {
  const { state, dispatch } = useWorkoutEditorContext();
  const statePlan = state.plans.find(p => p.id === -1);
  if (!statePlan) return notFound();
  return {statePlan, dispatch};
}