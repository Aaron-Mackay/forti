import AppBarTitle from '@/components/shell/AppBarTitle';
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import { Box } from '@mui/material';
import { notFound } from 'next/navigation';
import CoachCheckInDetailPageClient from '@/app/user/coach/check-ins/CoachCheckInDetailPageClient';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';

interface Props {
  params: Promise<{ clientId: string; id: string }>;
}

export default async function ClientCheckInDetailPage({ params }: Props) {
  const { clientId, id } = await params;
  const checkInId = Number(id);

  if (Number.isNaN(checkInId)) {
    notFound();
  }

  const signalEnabled = await loadSignalFlag();

  return (
    <>
      <AppBarTitle
        title="Check-in Review"
        showBack
        backHref={`/user/coach/clients/${clientId}/check-ins`}
      />
      <SignalSurface signalEnabled={signalEnabled} surface="calm">
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 }, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
          <CoachCheckInDetailPageClient checkInId={checkInId} lockedClientId={clientId} signalEnabled={signalEnabled} />
        </Box>
      </SignalSurface>
    </>
  );
}
