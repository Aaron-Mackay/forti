import AppBarTitle from '@/components/AppBarTitle';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import { Box } from '@mui/material';
import { notFound } from 'next/navigation';
import CoachCheckInDetailPageClient from '@/app/user/coach/check-ins/CoachCheckInDetailPageClient';

interface Props {
  params: Promise<{ clientId: string; id: string }>;
}

export default async function ClientCheckInDetailPage({ params }: Props) {
  const { clientId, id } = await params;
  const checkInId = Number(id);

  if (Number.isNaN(checkInId)) {
    notFound();
  }

  return (
    <>
      <AppBarTitle
        title="Check-in Review"
        showBack
        backHref={`/user/coach/clients/${clientId}/check-ins`}
      />
      <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 }, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        <CoachCheckInDetailPageClient checkInId={checkInId} lockedClientId={clientId} />
      </Box>
    </>
  );
}
