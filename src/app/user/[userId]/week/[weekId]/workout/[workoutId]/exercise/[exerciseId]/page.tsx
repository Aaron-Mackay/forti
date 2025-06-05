import {getWorkoutExercise} from '@lib/api';
import {WorkoutExerciseClient} from "@/components/WorkoutExerciseClient";

interface Params {
  exerciseId: string;
}

export default async function WorkoutExercisePage({params}: { params: Params }) {
  const {exerciseId} = await params
  const exerciseData = await getWorkoutExercise(exerciseId);
  return <WorkoutExerciseClient initialData={exerciseData}/>;
}
