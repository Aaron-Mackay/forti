import React, {createContext, ReactNode, useContext} from 'react';
import {useWorkoutEditor, WorkoutEditorAction} from '@/lib/useWorkoutEditor';
import useDebouncedDispatch from "@/utils/useDebouncedDispatch";
import {EditableUser} from "@/types/editableData";


export interface WorkoutEditorContextType {
  state: EditableUser;
  dispatch: React.Dispatch<WorkoutEditorAction>;
  debouncedDispatch: (action: WorkoutEditorAction) => void;
}
const WorkoutEditorContext = createContext<WorkoutEditorContextType | null>(null);

interface WorkoutEditorProviderProps {
  userData: EditableUser;
  children: ReactNode;
}
export const WorkoutEditorProvider = ({ children, userData }: WorkoutEditorProviderProps) => {
  const { state, dispatch } = useWorkoutEditor(userData);
  const debouncedDispatch = useDebouncedDispatch(dispatch, 250);

  return (
    <WorkoutEditorContext.Provider value={{ state, dispatch, debouncedDispatch }}>
      {children}
    </WorkoutEditorContext.Provider>
  );
};

export const useWorkoutEditorContext = (): WorkoutEditorContextType => {
  const context = useContext(WorkoutEditorContext);
  if (!context) throw new Error('useWorkoutEditorContext must be used within WorkoutEditorProvider');
  return context;
};
