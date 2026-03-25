import AppBarTitle from '@/components/AppBarTitle';

export default function CoachLearningPlansPage() {
  return (
    <>
      <AppBarTitle title="Learning Plans" />
      <CoachLearningPlansClient />
    </>
  );
}

// Lazy import to keep page.tsx a server component wrapper
import CoachLearningPlansClient from './CoachLearningPlansClient';
