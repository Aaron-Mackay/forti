'use client';

import {Box, Container, List, ListItem, ListItemButton, ListItemText} from '@mui/material';
import {PlanPrisma} from '@/types/dataTypes';
import { useAppBar } from '@lib/providers/AppBarProvider';
import ProgressIcon from '@/lib/ProgressIcon';
import { getWeekStatus } from '@/lib/workoutProgress';

export default function WeeksListView({
                                        onSelectWeek,
                                        plan,
                                        onBack
                                      }: {
  onSelectWeek: (weekId: number) => void;
  plan: PlanPrisma,
  onBack: () => void;
}) {
  useAppBar({ title: 'Weeks', showBack: true, onBack });
  return (
    <Box sx={{minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary'}}>
      <Container maxWidth="sm" sx={{py: 1}}>
        <List>
          {plan.weeks.map((week) => (
            <ListItem key={week.id} disablePadding secondaryAction={
              <ProgressIcon status={getWeekStatus(week)} />
            }>
              <ListItemButton onClick={() => onSelectWeek(week.id)}>
                <ListItemText primary={`Week ${week.order}`}/>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Container>
    </Box>
  );
}
