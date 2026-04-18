import AppBarTitle from '@/components/AppBarTitle';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import { Box, Paper } from '@mui/material';
import CheckInTemplateEditor from './CheckInTemplateEditor';

export default function CheckInTemplatePage() {
  return (
    <>
      <AppBarTitle title="Check-in Template" showBack />
      <Paper sx={{ minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: 6 }}>
          <CheckInTemplateEditor />
        </Box>
      </Paper>
    </>
  );
}
