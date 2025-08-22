import React from "react";
import {BottomDrawerView} from "@/app/user/calendar/Calendar";
import {Divider, Stack, Typography} from "@mui/material";
import {EventType} from "@prisma/client";
import Button from "@mui/material/Button";
import {EventListItem} from "@/app/user/calendar/EventListItem";
import {EventPrisma} from "@/types/dataTypes";

const splitEventsByType = (events: EventPrisma[]) => {
  const blockEvents: EventPrisma[] = [];
  const customEvents: EventPrisma[] = [];
  events.forEach((event) => {
    if (event.eventType === EventType.BlockEvent) {
      blockEvents.push(event);
    }
    if (event.eventType === EventType.CustomEvent) {
      customEvents.push(event);
    }
  });
  return [blockEvents, customEvents];
}

export const EventsList: React.FC<{
  eventsOnSelectedDate: EventPrisma[],
  setSelectedEvent: (event: EventPrisma) => void,
  setDrawerView: (view: BottomDrawerView) => void,
}> = ({
        eventsOnSelectedDate,
        setSelectedEvent,
        setDrawerView
      }) => {

  const [blockEvents, customEvents] = splitEventsByType(eventsOnSelectedDate)

  const EventButtonList = ({events, title}: { events: EventPrisma[], title: string }) => {
    return (<>
      <Typography variant="subtitle2" fontSize="0.75rem">{title}</Typography>
      <Stack spacing={1} sx={{marginBottom: 1}}>
        {events.map((event) => (
          <EventListItem
            key={event.id}
            onClick={() => {
              setSelectedEvent(event);
              setDrawerView('details');
            }}
            event={event}
          />
        ))}
      </Stack>
    </>)
  }

  return (<>
    {blockEvents.length > 0 && <EventButtonList events={blockEvents} title={'Block'}/>}
    {blockEvents.length > 0 && customEvents.length > 0 && <Divider sx={{my: 1}}/>}
    {customEvents.length > 0 && <EventButtonList events={customEvents} title={'Events'}/>}
    <Button fullWidth variant="contained" onClick={() => setDrawerView('event-form')}>
      + Add Event
    </Button>
  </>)
}