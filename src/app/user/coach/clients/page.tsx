import { getCoachClientHealthSummary } from '@lib/coachService';
import getLoggedInUser from '@lib/getLoggedInUser';
import AppBarTitle from '@/components/AppBarTitle';
import {
  Box,
  Card,
  CardHeader,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';

const formatDate = (date: Date | null): string => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const statusChipColor = (status: 'submitted' | 'pending') => (status === 'submitted' ? 'success' : 'warning');

const CoachClientsPage = async () => {
  const user = await getLoggedInUser();
  const clients = await getCoachClientHealthSummary(user.id);

  return (
    <>
      <AppBarTitle title="Clients" />
      <Card>
        <CardHeader title="Client Health Summary" subheader="Quick weekly pulse across all assigned clients" />

        {clients.length === 0 ? (
          <Box sx={{ px: 2, pb: 3, textAlign: 'center' }}>
            <GroupIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No clients yet. Share your coach invite code from Settings to get started.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {clients.map((client, index) => (
              <Box key={client.clientId}>
                <ListItem disablePadding>
                  <ListItemButton href={`/user/coach/clients/${client.clientId}`} sx={{ py: 1.5, alignItems: 'flex-start' }}>
                    <ListItemIcon sx={{ mt: 0.5 }}>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={client.clientName ?? client.clientId}
                      secondary={
                        <Stack spacing={1} sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Active plan: {client.activePlan?.name ?? 'No active plan'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Last workout: {formatDate(client.lastWorkoutDate)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Last metric entry: {formatDate(client.lastMetricEntryDate)}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip
                              size="small"
                              label={`Check-in: ${client.currentWeekCheckInStatus === 'submitted' ? 'Submitted' : 'Pending'}`}
                              color={statusChipColor(client.currentWeekCheckInStatus)}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={
                                client.latestCoachReviewStatus === 'reviewed'
                                  ? `Review: Reviewed (${formatDate(client.latestCoachReviewAt)})`
                                  : client.latestCoachReviewStatus === 'awaiting_review'
                                    ? 'Review: Awaiting coach review'
                                    : 'Review: No check-ins yet'
                              }
                              color={client.latestCoachReviewStatus === 'reviewed' ? 'success' : 'default'}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={`Unread notifications: ${client.unreadClientNotifications}`}
                              color={client.unreadClientNotifications > 0 ? 'warning' : 'default'}
                              variant="outlined"
                            />
                          </Stack>
                          {client.riskFlags.length > 0 && (
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {client.riskFlags.map(flag => (
                                <Chip key={flag} size="small" label={flag} color="error" />
                              ))}
                            </Stack>
                          )}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                {index < clients.length - 1 && <Divider component="li" />}
              </Box>
            ))}
          </List>
        )}
      </Card>
    </>
  );
};

export default CoachClientsPage;
