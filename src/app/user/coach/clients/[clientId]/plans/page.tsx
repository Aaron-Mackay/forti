import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import AppBarTitle from '@/components/AppBarTitle';
import PlansListCard from '@/app/user/plan/PlansListCard';

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function ClientPlansPage({ params }: Props) {
  const { clientId } = await params;
  const user = await getLoggedInUser();

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, coachId: true, activePlanId: true },
  });

  if (!client || client.coachId !== user.id) {
    notFound();
  }

  const plans = await prisma.plan.findMany({
    where: { userId: clientId },
    select: {
      id: true,
      name: true,
      order: true,
      lastActivityDate: true,
      _count: {
        select: {
          weeks: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  });

  return (
    <>
      <AppBarTitle title="Plans" showBack backHref={`/user/coach/clients/${clientId}`} />
      <PlansListCard
        title={`${client.name ?? 'Client'}'s Plans`}
        emptyMessage="No plans yet."
        createHref={`/user/plan/create?forUserId=${clientId}`}
        planHrefBase="/user/plan"
        targetUserId={clientId}
        plans={plans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          order: plan.order,
          weekCount: plan._count.weeks,
          lastActivityDate: plan.lastActivityDate,
          isActive: plan.id === client.activePlanId,
        }))}
      />
    </>
  );
}
