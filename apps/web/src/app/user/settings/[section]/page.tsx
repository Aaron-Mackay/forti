import { notFound, redirect } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { SettingsShell } from '../_components/SettingsShell';
import { isSectionSlug } from '../_components/sections';

type PageProps = { params: Promise<{ section: string }> };

export default async function SettingsSectionPage({ params }: PageProps) {
  const { section } = await params;
  const signalEnabled = await loadSignalFlag();
  if (!signalEnabled) {
    redirect('/user/settings');
  }
  if (!isSectionSlug(section)) {
    notFound();
  }

  const user = await getLoggedInUser();
  return (
    <SignalSurface signalEnabled surface="planning">
      <SettingsShell
        section={section}
        initialName={user.name ?? ''}
        initialImage={user.image ?? null}
      />
    </SignalSurface>
  );
}
