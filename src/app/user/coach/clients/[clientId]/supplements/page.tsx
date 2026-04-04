import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import SupplementsClient from '@/app/user/supplements/SupplementsClient';
import { supplementWithVersions } from '@lib/supplementVersions';

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function ClientSupplementsPage({ params }: Props) {
  const { clientId } = await params;
  const user = await getLoggedInUser();

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, coachId: true },
  });

  if (!client || client.coachId !== user.id) {
    notFound();
  }

  const supplements = await prisma.supplement.findMany({
    where: { userId: clientId },
    orderBy: { startDate: 'desc' },
    include: supplementWithVersions,
  });

  return (
    <SupplementsClient
      apiBase={`/api/coach/clients/${clientId}/supplements`}
      initialSupplements={supplements.map(s => ({
        ...s,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        versions: s.versions.map(v => ({
          ...v,
          effectiveFrom: v.effectiveFrom.toISOString(),
        })),
      }))}
    />
  );
}
