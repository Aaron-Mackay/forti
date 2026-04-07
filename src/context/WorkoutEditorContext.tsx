'use client'

import React, {createContext, ReactNode, useContext, useState} from 'react';
import {useWorkoutEditor, WorkoutEditorAction} from '@/lib/useWorkoutEditor';
import useDebouncedDispatch from "@/utils/useDebouncedDispatch";

import {UserPrisma} from "@/types/dataTypes";
import {Exercise} from "@/generated/prisma/browser";

export interface WorkoutEditorContextType {
  state: UserPrisma;
  dispatch: React.Dispatch<WorkoutEditorAction>;
  debouncedDispatch: (action: WorkoutEditorAction) => void;
  allExercises: Exercise[];
  addExercise: (exercise: Exercise) => void;
}
const WorkoutEditorContext = createContext<WorkoutEditorContextType | null>(null);

interface WorkoutEditorProviderProps {
  userData: UserPrisma;
  children: ReactNode;
  allExercises: Exercise[];
}
export const WorkoutEditorProvider = ({ children, userData, allExercises: initialExercises }: WorkoutEditorProviderProps) => {
  const { state, dispatch } = useWorkoutEditor(userData);
  const debouncedDispatch = useDebouncedDispatch(dispatch, 250);
  const [allExercises, setAllExercises] = useState<Exercise[]>(initialExercises);
  const addExercise = (exercise: Exercise) => setAllExercises(prev => [...prev, exercise]);

  return (
    <WorkoutEditorContext.Provider value={{ state, dispatch, debouncedDispatch, allExercises, addExercise }}>
      {children}
    </WorkoutEditorContext.Provider>
  );
};

export const useWorkoutEditorContext = (): WorkoutEditorContextType => {
  const context = useContext(WorkoutEditorContext);
  if (!context) throw new Error('useWorkoutEditorContext must be used within WorkoutEditorProvider');
  return context;
};
