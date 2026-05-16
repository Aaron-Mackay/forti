import { ExercisesPageContent } from '@/app/exercises/ExercisesPageContent';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';

export default async function CoachExercisesPage() {
  const signalEnabled = await loadSignalFlag();

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      <ExercisesPageContent isCoachPortal />
    </SignalSurface>
  );
}
