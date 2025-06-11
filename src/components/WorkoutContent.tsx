'use client'

import React, { useState } from "react";
import { useWorkoutEditorContext } from "@/context/WorkoutEditorContext";
import { saveUserWorkoutData } from "@lib/api";
import Button from "@mui/material/Button";
import Week from "@/components/Week";
import EditModeToggle from "@/components/EditModeToggle";

export const WorkoutContent: React.FC<{
  lockedInEditMode: boolean;
  categories: string[];
  allExercises: any[];
}> = ({ lockedInEditMode = false, categories, allExercises }) => {
  const [isInEditMode, setIsInEditMode] = useState(lockedInEditMode);
  const { state, dispatch } = useWorkoutEditorContext();

  const handleSave = () => {
    saveUserWorkoutData(state)
      .then(() => alert('Saved successfully'))
      .catch(() => alert('Failed to save'));
  };

  return (
    <>
      {!lockedInEditMode && (
        <EditModeToggle
          isInEditMode={isInEditMode}
          setIsInEditMode={setIsInEditMode}
        />
      )}
      {isInEditMode && (
        <Button onClick={handleSave}>
          Save
        </Button>
      )}

      <h1>User: {state.name}</h1>

      {state.weeks.map((week) => (
        <Week
          key={week.id}
          week={week}
          isInEditMode={isInEditMode}
          categories={categories}
          allExercises={allExercises}
        />
      ))}

      {isInEditMode && (
        <Button onClick={() => dispatch({ type: 'ADD_WEEK' })}>
          Add Week
        </Button>
      )}
    </>
  );
};
