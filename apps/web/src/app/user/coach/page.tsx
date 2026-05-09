import getLoggedInUser from '@lib/getLoggedInUser';
import { getCoachHomeData } from '@lib/coachService';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { LegacyCoachHome } from './_components/LegacyCoachHome';
import { SignalCoachHome } from './_components/SignalCoachHome';

export default async function CoachHomePage() {
  const user = await getLoggedInUser();
  const [signalEnabled, data] = await Promise.all([
    loadSignalFlag(),
    getCoachHomeData(user.id),
  ]);

  if (!signalEnabled) {
    return <LegacyCoachHome data={data} />;
  }

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      <SignalCoachHome coachName={user.name} data={data} today={new Date()} />
    </SignalSurface>
  );
}
