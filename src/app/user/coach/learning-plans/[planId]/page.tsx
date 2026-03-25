import CustomAppBar from '@/components/CustomAppBar';
import PlanEditorClient from './PlanEditorClient';

export default function CoachPlanEditorPage() {
  return (
    <>
      <CustomAppBar title="Edit Plan" showBack />
      <PlanEditorClient />
    </>
  );
}
