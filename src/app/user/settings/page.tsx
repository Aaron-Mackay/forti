import React from 'react';
import CustomAppBar, {HEIGHT_EXC_APPBAR} from '@/components/CustomAppBar';
import {Paper} from '@mui/material';
import SettingsClient from './SettingsClient';

export default function SettingsPage() {
  return (
    <>
      <CustomAppBar title="Settings"/>
      <Paper sx={{px: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto'}}>
        <SettingsClient/>
      </Paper>
    </>
  );
}
