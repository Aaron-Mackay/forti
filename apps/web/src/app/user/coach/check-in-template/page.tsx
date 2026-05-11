import AppBarTitle from '@/components/shell/AppBarTitle';
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { SignalBackLink } from '@/components/signal/SignalBackLink';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import { Box, Paper } from '@mui/material';
import CheckInTemplateEditor from './CheckInTemplateEditor';

export default async function CheckInTemplatePage() {
  const signalEnabled = await loadSignalFlag();

  return (
    <>
      {!signalEnabled && <AppBarTitle title="Check-in Template" showBack />}
      <SignalSurface signalEnabled={signalEnabled} surface="planning">
        {signalEnabled && <SignalBackLink href="/user/coach" label="Coach home" />}
        <Paper sx={{ minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
          <Box sx={{ px: { xs: 2, sm: 3 }, pb: 6 }}>
            <CheckInTemplateEditor signalEnabled={signalEnabled} />
          </Box>
        </Paper>
      </SignalSurface>
    </>
  );
}
