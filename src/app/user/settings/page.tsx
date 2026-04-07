import React from 'react';
import {HEIGHT_EXC_APPBAR} from '@/components/CustomAppBar';
import AppBarTitle from '@/components/AppBarTitle';
import {Paper} from '@mui/material';
import SettingsClient from './SettingsClient';
import getLoggedInUser from '@lib/getLoggedInUser';
import { headers } from 'next/headers';

export default async function SettingsPage() {
  const user = await getLoggedInUser();
  const headersList = await headers();
  const isCoachDomain = headersList.get('x-is-coach-domain') === '1';
  return (
    <>
      <AppBarTitle title="Settings" />
      <Paper sx={{px: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto'}}>
        <SettingsClient
          initialName={user.name ?? ''}
          initialImage={user.image ?? null}
          isCoachDomain={isCoachDomain}
        />
      </Paper>
    </>
  );
}
