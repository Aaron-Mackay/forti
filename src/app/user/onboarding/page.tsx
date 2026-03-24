import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { redirect } from 'next/navigation';
import OnboardingWizard from './OnboardingWizard';

export default async function OnboardingPage() {
  const user = await getLoggedInUser();

  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, image: true, settings: true },
  });

  const settings = parseDashboardSettings(userRecord?.settings);

  // Already completed — skip to dashboard
  if (settings.registrationComplete) {
    redirect('/user');
  }

  return (
    <OnboardingWizard
      userId={user.id}
      initialName={userRecord?.name ?? ''}
      initialImage={userRecord?.image ?? null}
    />
  );
}
