import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import AppBarTitle from '@/components/AppBarTitle';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import { Paper } from '@mui/material';
import CoachCheckInsClient from '@/app/user/coach/check-ins/CoachCheckInsClient';

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function ClientCheckInsPage({ params }: Props) {
  const { clientId } = await params;
  const user = await getLoggedInUser();

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, coachId: true },
  });

  if (!client || client.coachId !== user.id) {
    notFound();
  }

  return (
    <>
      <AppBarTitle title="Check-ins" showBack backHref={`/user/coach/clients/${clientId}`} />
      <Paper sx={{ px: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        <CoachCheckInsClient lockedClientId={clientId} />
      </Paper>
    </>
  );
}
