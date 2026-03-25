import CustomAppBar from '@/components/CustomAppBar';
import LearningPlansClient from './LearningPlansClient';

export default function LearningPlansPage() {
  return (
    <>
      <CustomAppBar title="Learning Plans" />
      <LearningPlansClient />
    </>
  );
}
