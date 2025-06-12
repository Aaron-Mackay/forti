import {getExercisesAndCategories, getUserData} from "@lib/api";
import {WorkoutContent} from "@/components/WorkoutContent";
import {WorkoutEditorProvider} from "@/context/WorkoutEditorContext";
import React from "react";
import {notFound} from "next/navigation";

const Plan = async ({params}: { params: Promise<{ userId: string }> }) => {
  const userData = await getUserData((await params).userId)
  if (!userData) {
    return notFound()
  }
  const {allExercises, categories} = await getExercisesAndCategories()

  return (
    <WorkoutEditorProvider userData={userData}>
      <WorkoutContent
        lockedInEditMode={false}
        categories={categories}
        allExercises={allExercises}
      />
    </WorkoutEditorProvider>
  )
};

export default Plan;
