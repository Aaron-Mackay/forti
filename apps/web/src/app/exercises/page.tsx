import { headers } from 'next/headers';
import { ExercisesPageContent } from './ExercisesPageContent';

export default async function ExercisesPage() {
  const headersList = await headers();
  const isCoachPortal = headersList.get('x-is-coach-domain') === '1';
  return <ExercisesPageContent isCoachPortal={isCoachPortal} />;
}
