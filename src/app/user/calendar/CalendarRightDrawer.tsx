import {EventPrisma} from "@/types/dataTypes";
import {Box, Button, Divider, Drawer, Stack, Typography} from "@mui/material";
import {EventType} from "@/generated/prisma/browser";
import {EventListItem} from "@/app/user/calendar/EventListItem";
import React from "react";
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {BottomDrawerView} from "@/app/user/calendar/Calendar";

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
                                      scrollToDate
                                    }: CalendarRightDrawerProps) => {
  return (<Drawer
    anchor={'right'}
    open={rightDrawerOpen}
    onClose={() => setRightDrawerOpen(false)}
  >
    <Box sx={{width: 'auto', p: 1, display: 'flex', flexDirection: 'column', height: '100%'}}>
      <Box onClick={() => setRightDrawerOpen(false)}>
        <Typography variant={"h5"}>{rightDrawerView === EventType.CustomEvent ? "Events" : "Blocks"}</Typography>
        <Divider sx={{my: 1}}/>
        <Stack spacing={1}>
          {eventsInState
            .filter(event => {
              return (event.eventType === rightDrawerView)
                && (event.startDate.getFullYear() === year || event.endDate.getFullYear() === year)
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
                />)
            })}
        </Stack>
      </Box>
      <Box sx={{mt: 'auto', pt: 2}}>
        <Divider sx={{mb: 1}}/>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<FileDownloadOutlinedIcon/>}
          onClick={() => { window.location.href = '/api/event/export'; }}
        >
          Export calendar
        </Button>
      </Box>
    </Box>
  </Drawer>)
}