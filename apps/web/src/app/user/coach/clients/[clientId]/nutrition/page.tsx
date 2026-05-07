import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import { getCoachClientNutritionData } from '@lib/coachNutrition';
import NutritionClient from '@/app/user/nutrition/NutritionClient';

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function ClientNutritionPage({ params }: Props) {
  const { clientId } = await params;
  const user = await getLoggedInUser();

  const nutritionData = await getCoachClientNutritionData(user.id, clientId);
  if (!nutritionData) {
    notFound();
  }

  return (
    <NutritionClient
      userId={clientId}
      initialMetrics={nutritionData.metrics}
      initialEvents={nutritionData.events}
      initialTemplates={nutritionData.targetTemplates}
      canEditActuals={false}
      canEditTargets
    />
  );
}
