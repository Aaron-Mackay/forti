import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import FeedbackClient from '../../feedback/FeedbackClient';

export default async function CoachFeedbackPage() {
  const signalEnabled = await loadSignalFlag();

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      <FeedbackClient signalEnabled={signalEnabled} />
    </SignalSurface>
  );
}
