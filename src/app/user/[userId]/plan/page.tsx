import {getExercisesAndCategories, getUserData} from "@lib/api";
import {PlanTable} from "@/components/PlanTable";
import {WorkoutEditorProvider} from "@/context/WorkoutEditorContext";
import React from "react";
import {notFound} from "next/navigation";

const PlanPage = async ({params}: { params: Promise<{ userId: string }> }) => {
  const userData = await getUserData((await params).userId)
  if (!userData) {
    return notFound()
  }
  const {allExercises, categories} = await getExercisesAndCategories()

  return (
    <WorkoutEditorProvider userData={userData}>
      <PlanTable
        lockedInEditMode={false}
        categories={categories}
        allExercises={allExercises}
      />
    </WorkoutEditorProvider>
  )
};

export default PlanPage;
