import {HEIGHT_EXC_APPBAR} from '@/components/shell/CustomAppBar';
import AppBarTitle from '@/components/shell/AppBarTitle';
import {Paper} from '@mui/material';
import SettingsClient from './SettingsClient';
import getLoggedInUser from '@lib/getLoggedInUser';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import { SignalSurface } from '@/components/signal/SignalSurface';

export default async function SettingsPage() {
  const user = await getLoggedInUser();
  const signalEnabled = await loadSignalFlag();

  if (signalEnabled) {
    return (
      <SignalSurface signalEnabled surface="planning">
        <SettingsClient
          initialName={user.name ?? ''}
          initialImage={user.image ?? null}
          signalEnabled
        />
      </SignalSurface>
    );
  }

  return (
    <>
      <AppBarTitle title="Settings" />
      <Paper
        sx={{
          px: 2,
          height: HEIGHT_EXC_APPBAR,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxSizing: 'border-box',
          pb: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        <SettingsClient
          initialName={user.name ?? ''}
          initialImage={user.image ?? null}
          signalEnabled={false}
        />
      </Paper>
    </>
  );
}
