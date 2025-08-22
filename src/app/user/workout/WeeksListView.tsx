'use client';

import { Box, Container, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import {PlanPrisma, UserPrisma} from '@/types/dataTypes';
import CustomAppBar from "@/components/CustomAppBar";

export default function WeeksListView({
  userData,
  onSelectWeek,
  plan,
  onBack
}: {
  userData: UserPrisma;
  onSelectWeek: (weekId: number) => void;
  plan: PlanPrisma,
  onBack: () => void;
}) {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary' }}>
      <CustomAppBar title={`${userData.name}'s Dashboard`} onBack={onBack} showBack/>
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Weeks
        </Typography>
        <List>
          {plan.weeks.map((week) => (
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