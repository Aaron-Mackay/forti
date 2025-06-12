import React from 'react';
import {getExercisesAndCategories} from '@lib/api';
import {WorkoutEditorProvider} from '@/context/WorkoutEditorContext';
import {WorkoutContent} from "@/components/WorkoutContent";
import {UserPrisma} from "@/types/dataTypes";

interface Props {
  data: UserPrisma;
  lockedInEditMode?: boolean;
}

const PlanTable = async ({ data, lockedInEditMode = false }: Props) => {
  const {allExercises, categories} = await getExercisesAndCategories()
  return (
    <WorkoutEditorProvider userData={data}>
        <WorkoutContent
          lockedInEditMode={lockedInEditMode}
          categories={categories}
          allExercises={allExercises}
        />
    </WorkoutEditorProvider>
  );
};

export default PlanTable;