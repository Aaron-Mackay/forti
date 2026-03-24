import React from 'react';
import CustomAppBar, {HEIGHT_EXC_APPBAR} from '@/components/CustomAppBar';
import {Paper} from '@mui/material';
import SettingsClient from './SettingsClient';
import getLoggedInUser from '@lib/getLoggedInUser';

export default async function SettingsPage() {
  const user = await getLoggedInUser();
  return (
    <>
      <CustomAppBar title="Settings"/>
      <Paper sx={{px: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto'}}>
        <SettingsClient initialName={user.name ?? ''} initialImage={user.image ?? null}/>
      </Paper>
    </>
  );
}
