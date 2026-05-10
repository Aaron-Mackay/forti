import AppBarTitle from '@/components/shell/AppBarTitle';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import PlanEditorClient from './PlanEditorClient';

export default async function CoachPlanEditorPage() {
  const signalEnabled = await loadSignalFlag();

  return (
    <>
      <AppBarTitle title="Edit Plan" showBack />
      <SignalSurface signalEnabled={signalEnabled} surface="planning">
        <PlanEditorClient signalEnabled={signalEnabled} />
      </SignalSurface>
    </>
  );
}
