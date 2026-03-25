import CustomAppBar from '@/components/CustomAppBar';

export default function CoachLearningPlansPage() {
  return (
    <>
      <CustomAppBar title="Learning Plans" />
      <CoachLearningPlansClient />
    </>
  );
}

// Lazy import to keep page.tsx a server component wrapper
import CoachLearningPlansClient from './CoachLearningPlansClient';
