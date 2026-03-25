'use client';

import { Box, Container, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import { UserPrisma } from '@/types/dataTypes';
import { useAppBar } from '@lib/providers/AppBarProvider';
import ProgressIcon from '@/lib/ProgressIcon';
import { getPlanStatus } from '@/lib/workoutProgress';

export default function PlansListView({
  userData,
  onSelectPlan,
}: {
  userData: UserPrisma;
  onSelectPlan: (planId: number) => void;
}) {
  useAppBar({ title: 'Training' });
  return (
    <Box sx={{ minHeight: '100dvh', color: 'text.primary' }}>
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Plans
        </Typography>
        <List>
          {userData.plans.map((plan) => (
            <ListItem key={plan.id} disablePadding secondaryAction={
              <ProgressIcon status={getPlanStatus(plan)} />
            }>
              <ListItemButton onClick={() => onSelectPlan(plan.id)}>
                <ListItemText primary={`Plan ${plan.order} - ${plan.name}`} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Container>
    </Box>
  );
}
