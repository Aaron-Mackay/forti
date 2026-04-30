import AppBarTitle from '@/components/shell/AppBarTitle';
import PlanEditorClient from './PlanEditorClient';

export default function CoachPlanEditorPage() {
  return (
    <>
      <AppBarTitle title="Edit Plan" showBack />
      <PlanEditorClient />
    </>
  );
}
