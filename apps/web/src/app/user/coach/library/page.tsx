import { LibraryPageContent } from '@/app/library/LibraryPageContent';
import AppBarTitle from '@/components/shell/AppBarTitle';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';

export default async function CoachLibraryPage() {
  const signalEnabled = await loadSignalFlag();

  return (
    <>
      {!signalEnabled && <AppBarTitle title="Library" />}
      <SignalSurface signalEnabled={signalEnabled} surface="planning">
        <LibraryPageContent showAppBarTitle={false} />
      </SignalSurface>
    </>
  );
}
