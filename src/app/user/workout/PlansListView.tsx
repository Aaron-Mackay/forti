'use client';

import { Box, Container, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import { UserPrisma } from '@/types/dataTypes';
import CustomAppBar from "@/components/CustomAppBar";

export default function PlansListView({
  userData,
  onSelectPlan,
}: {
  userData: UserPrisma;
  onSelectPlan: (planId: number) => void;
}) {
  return (
    <Box sx={{ minHeight: '100dvh', color: 'text.primary' }}>
      <CustomAppBar title={`${userData.name}'s Dashboard`} />
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Plans
        </Typography>
        <List>
          {userData.plans.map((plan) => (
            <ListItem key={plan.id} disablePadding>
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