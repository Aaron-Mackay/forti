'use client';

import {Box, Container, List, ListItem, ListItemButton, ListItemText} from '@mui/material';
import {PlanPrisma} from '@/types/dataTypes';
import { useAppBar } from '@lib/providers/AppBarProvider';
import ProgressIcon from '@/lib/ProgressIcon';
import { getWeekStatus } from '@/lib/workoutProgress';
import { signalTokens } from '@lib/signal/tokens';

const gymPalette = signalTokens.surface.gym;

export default function WeeksListView({
                                        onSelectWeek,
                                        plan,
                                        onBack,
                                        signalEnabled = false,
                                      }: {
  onSelectWeek: (weekId: number) => void;
  plan: PlanPrisma;
  onBack: () => void;
  signalEnabled?: boolean;
}) {
  useAppBar({ title: 'Weeks', showBack: true, onBack });

  if (signalEnabled) {
    return (
      <div style={{ minHeight: '100dvh', background: gymPalette.bg, color: gymPalette.ink, fontFamily: signalTokens.fontVar.body, padding: '14px 16px 28px' }}>
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: gymPalette.inkLight, marginBottom: 6 }}>
          {plan.name}
        </div>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 26, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 18 }}>
          Select a week
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {plan.weeks.map((week) => {
            const status = getWeekStatus(week);
            const done = status === 'completed';
            return (
              <button
                key={week.id}
                type="button"
                onClick={() => onSelectWeek(week.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: gymPalette.surface,
                  border: `1px solid ${gymPalette.border}`,
                  borderRadius: signalTokens.radii.card,
                  padding: '14px 16px',
                  color: gymPalette.ink,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: signalTokens.fontVar.body, fontSize: 15, fontWeight: 500 }}>
                  Week {week.order}
                </span>
                <span style={{
                  fontFamily: signalTokens.fontVar.mono,
                  fontSize: 11,
                  color: done ? signalTokens.signal.deep : gymPalette.inkLight,
                }}>
                  {done ? 'done' : `${week.workouts.length} session${week.workouts.length !== 1 ? 's' : ''}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

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
