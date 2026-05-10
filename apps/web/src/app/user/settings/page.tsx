import React from 'react';
import {HEIGHT_EXC_APPBAR} from '@/components/shell/CustomAppBar';
import AppBarTitle from '@/components/shell/AppBarTitle';
import {Paper} from '@mui/material';
import SettingsClient from './SettingsClient';
import getLoggedInUser from '@lib/getLoggedInUser';
import { headers } from 'next/headers';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import { SignalSurface } from '@/components/signal/SignalSurface';

export default async function SettingsPage() {
  const user = await getLoggedInUser();
  const headersList = await headers();
  const isCoachDomain = headersList.get('x-is-coach-domain') === '1';
  const signalEnabled = !isCoachDomain && await loadSignalFlag();

  if (signalEnabled) {
    return (
      <SignalSurface signalEnabled surface="planning">
        <SettingsClient
          initialName={user.name ?? ''}
          initialImage={user.image ?? null}
          isCoachDomain={isCoachDomain}
          signalEnabled
        />
      </SignalSurface>
    );
  }

  return (
    <>
      <AppBarTitle title="Settings" />
      <Paper sx={{px: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto'}}>
        <SettingsClient
          initialName={user.name ?? ''}
          initialImage={user.image ?? null}
          isCoachDomain={isCoachDomain}
          signalEnabled={false}
        />
      </Paper>
    </>
  );
}
