'use client';

import React, { useEffect, useState } from 'react';
import { EditableUser } from '@/types/editableData';
import { getExercisesAndCategories, saveUserWorkoutData } from '@lib/api';
import { Button } from '@mui/material';
import {useWorkoutEditorContext, WorkoutEditorProvider} from '@/context/WorkoutEditorContext';
import Week from './Week';

interface Props {
  data: EditableUser;
  lockedInEditMode?: boolean;
}

const WorkoutContent: React.FC<{
  isInEditMode: boolean;
  categories: string[];
  allExercises: any[];
}> = ({ isInEditMode, categories, allExercises }) => {
  const { state, dispatch } = useWorkoutEditorContext();

  const handleSave = () => {
    saveUserWorkoutData(state)
      .then(() => alert('Saved successfully'))
      .catch(() => alert('Failed to save'));
  };

  return (
    <>
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

const WorkoutTablesByWeek: React.FC<Props> = ({ data, lockedInEditMode = false }) => {
  const [isInEditMode, setIsInEditMode] = useState(lockedInEditMode);
  const [allExercises, setAllExercises] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getExercisesAndCategories().then(({ exercises, categories }) => {
      setAllExercises(exercises);
      setCategories(categories);
    });
  }, []);

  return (
    <WorkoutEditorProvider userData={data}>
      <div>
        {!lockedInEditMode && (
          <Button onClick={() => setIsInEditMode(!isInEditMode)}>
            Edit mode {isInEditMode ? 'ON' : 'OFF'}
          </Button>
        )}

        <WorkoutContent
          isInEditMode={isInEditMode}
          categories={categories}
          allExercises={allExercises}
        />
      </div>
    </WorkoutEditorProvider>
  );
};

export default WorkoutTablesByWeek;