import Link from 'next/link';
import type { CoachHomeData } from '@lib/coachService';
import AppBarTitle from '@/components/shell/AppBarTitle';
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';

type Props = {
  data: CoachHomeData;
};

export function LegacyCoachHome({ data }: Props) {
  return (
    <>
      <AppBarTitle title="Coach Home" />
      <Paper sx={{ px: 2, py: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" sx={{ mb: 1 }}>Coach inbox</Typography>
            <Typography variant="body2" color="text.secondary">
              {data.summary.submittedCheckInCount} submitted check-in{data.summary.submittedCheckInCount === 1 ? '' : 's'} waiting on review,
              {' '}
              {data.summary.maintenanceCount} plan task{data.summary.maintenanceCount === 1 ? '' : 's'},
              {' '}
              {data.summary.clientCount} client{data.summary.clientCount === 1 ? '' : 's'} linked.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }} useFlexGap>
              <Button component={Link} href="/user/coach/check-ins" variant="contained">Check-ins</Button>
              <Button component={Link} href="/user/coach/clients" variant="outlined">Clients</Button>
              <Button component={Link} href="/user/coach/check-in-template" variant="outlined">Template</Button>
            </Stack>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>Submitted check-ins</Typography>
            <Stack spacing={1}>
              {data.submittedCheckIns.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Nothing is waiting for review.</Typography>
              ) : (
                data.submittedCheckIns.map(item => (
                  <Box key={item.checkInId} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography fontWeight={600}>{item.clientName ?? 'Client'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Week of {item.weekStartDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </Typography>
                      </Box>
                      <Button component={Link} href={`/user/coach/check-ins/${item.checkInId}`} size="small">Review</Button>
                    </Stack>
                  </Box>
                ))
              )}
            </Stack>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>Plan maintenance</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }} useFlexGap>
              <Chip size="small" label={`No active plan: ${data.planMaintenance.filter(item => item.kind === 'no_active_plan').length}`} />
              <Chip size="small" label={`Block ending: ${data.planMaintenance.filter(item => item.kind === 'block_ending').length}`} />
              <Chip size="small" label={`Stale plans: ${data.planMaintenance.filter(item => item.kind === 'plan_stale').length}`} />
            </Stack>
            <Stack spacing={1}>
              {data.planMaintenance.length === 0 ? (
                <Typography variant="body2" color="text.secondary">All active plans look current.</Typography>
              ) : (
                data.planMaintenance.map(item => (
                  <Box key={`${item.clientId}-${item.kind}`} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography fontWeight={600}>{item.clientName ?? 'Client'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.planName ?? 'No active plan'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.kind === 'block_ending'
                            ? item.daysUntilBlockEnd === 0
                              ? 'Block ends today'
                              : item.daysUntilBlockEnd === 1
                                ? 'Block ends tomorrow'
                                : `Block ends in ${item.daysUntilBlockEnd} days`
                            : item.kind === 'plan_stale'
                              ? item.lastPlanActivityDate
                                ? `Last plan edit ${item.staleDays} days ago`
                                : 'Plan has never been edited'
                              : 'Assign a plan to this client'}
                        </Typography>
                      </Box>
                      <Button
                        component={Link}
                        href={item.planId ? `/user/coach/clients/${item.clientId}/plans` : `/user/coach/clients/${item.clientId}`}
                        size="small"
                      >
                        Open
                      </Button>
                    </Stack>
                  </Box>
                ))
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </>
  );
}
