'use client';

import { Box, Container, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import CustomAppBar from './CustomAppBar';
import { UserPrisma } from '@/types/dataTypes';

export default function WeeksListView({
  userData,
  onSelectWeek,
}: {
  userData: UserPrisma;
  onSelectWeek: (weekId: number) => void;
}) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <CustomAppBar title={`${userData.name}'s Dashboard`} />
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Weeks
        </Typography>
        <List>
          {userData.weeks.map((week) => (
            <ListItem key={week.id} disablePadding>
              <ListItemButton onClick={() => onSelectWeek(week.id)}>
                <ListItemText primary={`Week ${week.order}`} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Container>
    </Box>
  );
}