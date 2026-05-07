'use client';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import { ProgressStatus } from './workoutProgress';

export default function ProgressIcon({ status }: { status: ProgressStatus }) {
  if (status === 'completed') {
    return <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />;
  }
  if (status === 'in_progress') {
    return <PendingIcon fontSize="small" sx={{ color: 'warning.main' }} />;
  }
  return null;
}
