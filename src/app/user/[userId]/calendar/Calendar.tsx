'use client'

import {EventPrisma} from "@/types/dataTypes";
import FullCalendar from "@fullcalendar/react";
import multiMonthPlugin from "@fullcalendar/multimonth";
import interactionPlugin, {DateClickArg} from "@fullcalendar/interaction";
import React, {RefObject, useMemo, useRef, useState} from "react";
import './calendar.css'
import {EventApi, EventClickArg} from "@fullcalendar/core";
import {Box, Button, Drawer, Fab, List, ListItemButton, TextField, Typography} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import CustomAppBar from "@/app/user/[userId]/dashboard/CustomAppBar";
import {sub} from "date-fns";
import {EventType} from "@prisma/client";

type Props = {
  events: EventPrisma[];
};

type FullCalendarIngestableEvent = {
  allDay: boolean,
  title: string,
  start: Date,
  end: Date,
  id: string,
  color?: string,
  display: string
}

export default function Calendar({events}: Props) {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerView, setDrawerView] = useState<'list' | 'details' | 'form'>('list');
  const [selectedEvent, setSelectedEvent] = useState<EventApi | null>(null);

  const eventsOnSelectedDate = useMemo(() => {
    if (!selectedDate || !calendarRef.current) return [];
    return calendarRef.current.getApi().getEvents().filter(event => {
      const start = event.start;
      const end = event.end ?? start;
      return start && end && start <= selectedDate && selectedDate < end;
    });
  }, [selectedDate]);

  const handleDateClick = (dateInfo: DateClickArg, calendarRef: RefObject<FullCalendar | null>) => {
    const events = getEventsOnDate(dateInfo, calendarRef);

    setSelectedDate(dateInfo.date);
    setSelectedEvent(events.length === 1 ? events[0] : null);
    setDrawerView('list');
    setDrawerOpen(true);
  }

  const handleEventClick = (eventInfo: EventClickArg) => {
    setSelectedEvent(eventInfo.event);
    setDrawerView('details');
    setDrawerOpen(true);
  }

  const handleFabCreateClick = () => {
    setDrawerView('form');
    setDrawerOpen(true);
  }

  const handleTodayButtonClick = () => {
    if (!calendarRef.current) return
    calendarRef.current.getApi().gotoDate(new Date());
    setTimeout(() => {
      const todayCell = document.querySelector('.fc-day-today');
      if (todayCell) {
        todayCell.scrollIntoView({behavior: 'smooth', block: 'center'});
      }
    }, 0);
  };

  return (
    <>
      <CustomAppBar title={"Calendar"} showBack/>
      <FullCalendar
        ref={calendarRef}
        plugins={[multiMonthPlugin, interactionPlugin]}
        initialView="multiMonthYear"
        multiMonthMaxColumns={1}
        height={"calc(100vh - 56px)"}
        editable={true}
        selectable={true}
        selectLongPressDelay={400}
        dateClick={(dateInfo) => handleDateClick(dateInfo, calendarRef)}
        select={({start, end}) => createEvent(start, end)}
        eventClick={handleEventClick}
        events={parsedEvents(events)}
        headerToolbar={{
          left: 'title',
          center: '',
          right: 'myTodayButton prev,next'
        }}
        customButtons={{
          myTodayButton: {
            text: 'Today',
            click: handleTodayButtonClick
          }
        }}
      />
      <Fab color="primary" aria-label="add" onClick={handleFabCreateClick}
           sx={{position: "absolute", bottom: 25, right: 25}}>
        <AddIcon/>
      </Fab>

      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '75vh'
          }
        }}
      >
        <Box p={2}>
          <Box sx={{width: 40, height: 4, bgcolor: 'grey.400', borderRadius: 2, mx: 'auto', my: 1}}/>
          <Typography variant="h6" gutterBottom>
            {selectedDate?.toDateString()}
          </Typography>

          {drawerView === 'list' && (
            <>
              <List>
                {eventsOnSelectedDate.map((event) => (
                  <ListItemButton
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                      setDrawerView('details');
                    }}
                  >
                    {event.title}
                  </ListItemButton>
                ))}
              </List>
              <Button fullWidth variant="contained" onClick={() => setDrawerView('form')}>
                + Add Event
              </Button>
            </>
          )}

          {drawerView === 'details' && selectedEvent && (
            <Box>
              <Typography variant="subtitle1">{selectedEvent.title}</Typography>
              <Typography variant="body2">
                {selectedEvent.start?.toDateString()}
                {selectedEvent.end && ` — ${sub(selectedEvent.end, {days: 1}).toDateString()}`}
              </Typography>
            </Box>
          )}

          {drawerView === 'form' && (
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                // Handle form submit
                setDrawerOpen(false);
              }}
            >
              <TextField label="Title" fullWidth sx={{my: 1}}/>
              {/* Add other fields here */}
              <Button type="submit" fullWidth variant="contained">
                Save
              </Button>
              <Button fullWidth variant="text" onClick={() => setDrawerView('list')} sx={{mt: 1}}>
                Cancel
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>
    </>
  )
}

const parsedEvents = (events: EventPrisma[]): FullCalendarIngestableEvent[] => {
  return events.map(event => {
    return {
      allDay: true,
      title: event.name,
      start: event.startDate,
      end: event.endDate,
      id: event.id.toString(),
      color: event.color || undefined,
      display: event.eventType === EventType.CustomEvent ? 'auto' : 'background'
    }
  })
}

const createEvent = (start: Date, end?: Date) => {
  if (typeof end === "undefined") {
    end = start
  }

}

const getEventsOnDate = (dateInfo: DateClickArg, calendarRef: RefObject<FullCalendar | null>): EventApi[] => {
  const clickedDate = dateInfo.date;
  const calendarApi = calendarRef.current?.getApi();
  if (!calendarApi) return [];
  return calendarApi.getEvents().filter(event => {
    const start = event.start;
    const end = event.end ?? start;
    return start && end && start <= clickedDate && clickedDate < end;
  });
}

// TODO set up create form, extract drawer out