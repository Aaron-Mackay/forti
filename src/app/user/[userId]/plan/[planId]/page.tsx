import {getExercisesAndCategories, getUserData} from "@lib/api";
import {PlanTable} from "../PlanTable";
import {WorkoutEditorProvider} from "@/context/WorkoutEditorContext";
import React from "react";
import {notFound} from "next/navigation";

const PlanPage = async ({params}: { params: Promise<{ userId: string, planId: string }> }) => {
  const userData = await getUserData((await params).userId)
  if (!userData) {
    return notFound()
  }
  const {allExercises, categories} = await getExercisesAndCategories()

  return (
    <WorkoutEditorProvider userData={userData} allExercises={allExercises}>
      <PlanTable
        lockedInEditMode={false}
        categories={categories}
        planId={(await params).planId}
      />
    </WorkoutEditorProvider>
  )
};

export default PlanPage;
