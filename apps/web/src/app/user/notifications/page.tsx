import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import NotificationsClient from './NotificationsClient';

export default async function NotificationsPage() {
  const signalEnabled = await loadSignalFlag();

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      <NotificationsClient signalEnabled={signalEnabled} />
    </SignalSurface>
  );
}
