import {getExercisesAndCategories, getUserData} from "@lib/api";
import {PlanTable} from "../PlanTable";
import {WorkoutEditorProvider} from "@/context/WorkoutEditorContext";
import React from "react";
import {notFound} from "next/navigation";
import getLoggedInUser from "@lib/getLoggedInUser";

const PlanPage = async ({params}: { params: Promise<{ planId: string }> }) => {
  const userId = (await getLoggedInUser()).id
  const userData = await getUserData(userId)
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
