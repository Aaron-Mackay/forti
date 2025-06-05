import PlanTable from "@/components/PlanTable";
import {getExercisesAndCategories, getUserData} from "@lib/api";
import {WorkoutContent} from "@/components/WorkoutContent";
import {WorkoutEditorProvider} from "@/context/WorkoutEditorContext";
import React from "react";

const Plan = async ({params}: { params: { userId: string } }) => {
  const data = await getUserData((await params).userId)
  const {allExercises, categories} = await getExercisesAndCategories()

  return (
    <WorkoutEditorProvider userData={data}>
      <WorkoutContent
        lockedInEditMode={false}
        categories={categories}
        allExercises={allExercises}
      />
    </WorkoutEditorProvider>
  )
};

export default Plan;
