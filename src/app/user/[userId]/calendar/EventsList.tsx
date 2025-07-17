import React from "react";
import {EventApi} from "@fullcalendar/core";
import {DrawerView} from "@/app/user/[userId]/calendar/Calendar";
import {Divider, List, ListItemButton, Typography} from "@mui/material";
import {EventType} from "@prisma/client";
import Button from "@mui/material/Button";

const splitEventsByType = (events: EventApi[]) => {
  const blockEvents: EventApi[] = [];
  const customEvents: EventApi[] = [];
  events.forEach((event) => {
    const typedEvent = event as EventApi & { extendedProps: { type: EventType } };
    if (typedEvent.extendedProps.eventType === EventType.BlockEvent) {
      blockEvents.push(typedEvent);
    }
    if (typedEvent.extendedProps.eventType === EventType.CustomEvent) {
      customEvents.push(typedEvent);
    }
  });
  return [blockEvents, customEvents];
}

export const EventsList: React.FC<{
  eventsOnSelectedDate: EventApi[],
  setSelectedEvent: (event: EventApi) => void,
  setDrawerView: (view: DrawerView) => void,
}> = ({
        eventsOnSelectedDate,
        setSelectedEvent,
        setDrawerView
      }) => {

  const [blockEvents, customEvents] = splitEventsByType(eventsOnSelectedDate)

  return (<>
    <List>
      {blockEvents.length > 0 && (
        <>
          <Typography variant="subtitle2" fontSize="0.75rem">Block</Typography>
          {blockEvents.map((event) => (
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
        </>
      )}
      {blockEvents.length > 0 && customEvents.length > 0 && <Divider sx={{my: 1}}/>}

      {customEvents.length > 0 && (
        <>
          <Typography variant="subtitle2" fontSize="0.75rem">Custom</Typography>
          {customEvents.map((event) => (
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
        </>
      )}
    </List>
    <Button fullWidth variant="contained" onClick={() => setDrawerView('event-form')}>
      + Add Event
    </Button>
  </>)
}