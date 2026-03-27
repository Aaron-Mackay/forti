import { getCoachClients } from '@lib/api';
import getLoggedInUser from '@lib/getLoggedInUser';
import AppBarTitle from '@/components/AppBarTitle';
import {
  Box,
  Card,
  CardHeader,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';

const CoachClientsPage = async () => {
  const user = await getLoggedInUser();
  const clients = await getCoachClients(user.id);

  return (
    <>
      <AppBarTitle title="Clients" />
      <Card>
        <CardHeader title="Your Clients" />
        {clients.length === 0 ? (
          <Box sx={{ px: 2, pb: 3, textAlign: 'center' }}>
            <GroupIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No clients yet. Share your coach invite code from Settings to get started.
            </Typography>
          </Box>
        ) : (
          clients.map((client) => (
            <ListItem key={client.id} disablePadding>
              <ListItemButton
                component={Link}
                href={`/user/coach/clients/${client.id}`}
              >
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText primary={client.name ?? client.id} />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </Card>
    </>
  );
};

export default CoachClientsPage;
