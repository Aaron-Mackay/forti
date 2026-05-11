import AppBarTitle from '@/components/shell/AppBarTitle';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';

export default async function CoachLearningPlansPage() {
  const signalEnabled = await loadSignalFlag();

  return (
    <>
      {!signalEnabled && <AppBarTitle title="Learning Plans" />}
      <SignalSurface signalEnabled={signalEnabled} surface="planning">
        <CoachLearningPlansClient signalEnabled={signalEnabled} />
      </SignalSurface>
    </>
  );
}

// Lazy import to keep page.tsx a server component wrapper
import CoachLearningPlansClient from './CoachLearningPlansClient';
