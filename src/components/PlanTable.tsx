import React from 'react';
import {EditableUser} from '@/types/editableData';
import {getExercisesAndCategories} from '@lib/api';
import {WorkoutEditorProvider} from '@/context/WorkoutEditorContext';
import {WorkoutContent} from "@/components/WorkoutContent";

interface Props {
  data: EditableUser;
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