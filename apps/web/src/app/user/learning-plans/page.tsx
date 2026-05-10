import AppBarTitle from '@/components/shell/AppBarTitle';
import LearningPlansClient from './LearningPlansClient';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import { SignalSurface } from '@/components/signal/SignalSurface';

export default async function LearningPlansPage() {
  const signalEnabled = await loadSignalFlag();

  if (signalEnabled) {
    return (
      <SignalSurface signalEnabled surface="planning">
        <LearningPlansClient signalEnabled />
      </SignalSurface>
    );
  }

  return (
    <>
      <AppBarTitle title="Learning Plans" />
      <LearningPlansClient />
    </>
  );
}
