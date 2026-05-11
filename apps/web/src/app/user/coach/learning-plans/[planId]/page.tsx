import AppBarTitle from '@/components/shell/AppBarTitle';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { SignalBackLink } from '@/components/signal/SignalBackLink';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import PlanEditorClient from './PlanEditorClient';

export default async function CoachPlanEditorPage() {
  const signalEnabled = await loadSignalFlag();

  return (
    <>
      {!signalEnabled && <AppBarTitle title="Edit Plan" showBack />}
      <SignalSurface signalEnabled={signalEnabled} surface="planning">
        {signalEnabled && <SignalBackLink href="/user/coach/learning-plans" label="Learning plans" />}
        <PlanEditorClient signalEnabled={signalEnabled} />
      </SignalSurface>
    </>
  );
}
