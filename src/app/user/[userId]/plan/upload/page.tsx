import React from "react";
import {getExercisesAndCategories} from "@lib/api";
import {UploadAndEdit} from "@/components/uploadAndEdit";

export default async function UploadAndEditPage() {
  const { categories, allExercises } = await getExercisesAndCategories()

  return (<UploadAndEdit categories={categories} allExercises={allExercises}/>)
}

