import {EventPrisma} from "@/types/dataTypes";
import {Box, Button, Divider, Drawer, Stack, Typography} from "@mui/material";
import {EventType} from "@/generated/prisma/browser";
import {EventListItem} from "@/app/user/calendar/EventListItem";
import React from "react";
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {BottomDrawerView} from "@/app/user/calendar/Calendar";
import {eventOccursInYear} from "@/app/user/calendar/utils";
import {signalTokens} from '@lib/signal/tokens';

const sortByStartDateAsc = (a: EventPrisma, b: EventPrisma) => {
  const dateA = new Date(a.startDate).getTime();
  const dateB = new Date(b.startDate).getTime();
  return dateA - dateB;
};
type CalendarRightDrawerProps = {
  rightDrawerOpen: boolean;
  setRightDrawerOpen: (open: boolean) => void;
  rightDrawerView: EventType | null;
  eventsInState: EventPrisma[];
  year?: number;
  setSelectedEvent: (event: EventPrisma | null) => void,
  setBottomDrawerOpen: (open: boolean) => void,
  setBottomDrawerView: (view: BottomDrawerView) => void,
  scrollToDate: (date: Date) => void;
  signalEnabled?: boolean;
};
export const CalendarRightDrawer = ({
                                      rightDrawerOpen,
                                      setRightDrawerOpen,
                                      rightDrawerView,
                                      eventsInState,
                                      year,
                                      setBottomDrawerOpen,
                                      setSelectedEvent,
                                      setBottomDrawerView,
                                      scrollToDate,
                                      signalEnabled = false,
                                    }: CalendarRightDrawerProps) => {
  return (<Drawer
    anchor={'right'}
    open={rightDrawerOpen}
    onClose={() => setRightDrawerOpen(false)}
    slotProps={signalEnabled ? {
      paper: {
        sx: {
          bgcolor: signalTokens.surface.planning.bg,
          color: signalTokens.surface.planning.ink,
          borderLeft: `1px solid ${signalTokens.surface.planning.border}`,
          width: { xs: '100%', sm: 420 },
        }
      }
    } : undefined}
  >
    <Box sx={{
      width: 'auto',
      p: signalEnabled ? 1.5 : 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minWidth: { xs: '100vw', sm: 360 },
      background: signalEnabled ? signalTokens.surface.planning.bg : undefined,
      color: signalEnabled ? signalTokens.surface.planning.ink : undefined,
    }}>
      <Box onClick={() => setRightDrawerOpen(false)}>
        <Typography
          variant={signalEnabled ? 'overline' : 'h5'}
          sx={signalEnabled ? {
            fontFamily: signalTokens.fontVar.mono,
            color: signalTokens.surface.planning.inkLight,
            letterSpacing: '0.08em',
          } : undefined}
        >
          {rightDrawerView === EventType.CustomEvent ? "Events" : "Blocks"}
        </Typography>
        {signalEnabled && (
          <Typography variant="h5" sx={{ fontFamily: signalTokens.fontVar.cond, fontWeight: 700, mt: 0.5 }}>
            Open the list
          </Typography>
        )}
        <Divider sx={{my: 1}}/>
        <Stack spacing={1}>
          {eventsInState
            .filter(event => {
              if (year === undefined) return event.eventType === rightDrawerView;
              return event.eventType === rightDrawerView && eventOccursInYear(event, year);
            })
            .sort(sortByStartDateAsc)
            .map(event => {
              return (
                <EventListItem
                  key={event.id}
                  onClick={() => {
                    scrollToDate(event.startDate)
                    setSelectedEvent(event)
                    setBottomDrawerView('details')
                    setBottomDrawerOpen(true)
                    setRightDrawerOpen(false)
                  }}
                  event={event}
                  signalEnabled={signalEnabled}
                />)
            })}
        </Stack>
      </Box>
      <Box sx={{mt: 'auto', pt: 2}}>
        <Divider sx={{mb: 1}}/>
        <Button
          fullWidth
          variant={signalEnabled ? 'contained' : 'outlined'}
          startIcon={<FileDownloadOutlinedIcon/>}
          onClick={() => { window.location.href = '/api/event/export'; }}
          sx={signalEnabled ? { bgcolor: signalTokens.surface.planning.ink, color: signalTokens.surface.planning.surface, '&:hover': { bgcolor: signalTokens.surface.planning.inkMid } } : undefined}
        >
          Export calendar
        </Button>
      </Box>
    </Box>
  </Drawer>)
}
