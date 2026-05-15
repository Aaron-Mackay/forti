import AppBarTitle from '@/components/shell/AppBarTitle';
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import { Box } from '@mui/material';
import { notFound } from 'next/navigation';
import CoachCheckInDetailPageClient from '../CoachCheckInDetailPageClient';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { SignalBackLink } from '@/components/signal/SignalBackLink';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CoachCheckInDetailPage({ params }: Props) {
  const { id } = await params;
  const checkInId = Number(id);

  if (Number.isNaN(checkInId)) {
    notFound();
  }

  const signalEnabled = await loadSignalFlag();

  return (
    <>
      {!signalEnabled && <AppBarTitle title="Check-in Review" showBack backHref="/user/coach" />}
      <SignalSurface signalEnabled={signalEnabled} surface="planning">
        {signalEnabled && <SignalBackLink href="/user/coach" label="Coach home" surface="planning" />}
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 }, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
          <CoachCheckInDetailPageClient checkInId={checkInId} signalEnabled={signalEnabled} />
        </Box>
      </SignalSurface>
    </>
  );
}
