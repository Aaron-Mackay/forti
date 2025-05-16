export type EditableSet = {
  id: string; // UUID for unsaved
  reps: number | null;
  weight: number | null;
  order: number;
};

export type EditableExercise = {
  id: string;
  exerciseId: string | null;
  order: number
  repRange?: string;
  restTime?: string;
  sets: EditableSet[];
  exercise: {
    id: string,
    name: string,
    category: string
  }
};

export type EditableWorkout = {
  id: string;
  name: string;
  notes?: string;
  order: number;
  exercises: EditableExercise[];
};

export type EditableWeek = {
  id: string;
  order: number;
  workouts: EditableWorkout[];
};

export type EditableUser = {
  id: number;
  name: string;
  weeks: EditableWeek[];
};
