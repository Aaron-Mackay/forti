export type SerialisedFullUser = {
  id: number;
  email: string;
  name: string;
  weeks: {
    id: number;
    workouts: {
      id: number;
      name: string;
      notes: string | null;
      exercises: {
        id: number;
        order: number;
        restTime: string | null;
        repRange: string | null;
        exercise: {
          id: number;
          name: string;
          category: string | null;
          description: string | null;
        };
        sets: {
          id: number;
          reps: number | null;
          weight: number | null;
        }[];
      }[];
    }[];
  }[];
};
