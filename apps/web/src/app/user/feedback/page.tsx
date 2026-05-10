import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import FeedbackClient from './FeedbackClient';

export default async function FeedbackPage() {
  const signalEnabled = await loadSignalFlag();

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="calm">
      <FeedbackClient signalEnabled={signalEnabled} />
    </SignalSurface>
  );
}
