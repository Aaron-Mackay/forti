import React from "react";
import {EventApi} from "@fullcalendar/core";
import {BottomDrawerView} from "@/app/user/[userId]/calendar/Calendar";
import {Divider, Stack, Typography} from "@mui/material";
import {EventType} from "@prisma/client";
import Button from "@mui/material/Button";
import {EventListItem} from "@/app/user/[userId]/calendar/EventListItem";

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
  setDrawerView: (view: BottomDrawerView) => void,
}> = ({
        eventsOnSelectedDate,
        setSelectedEvent,
        setDrawerView
      }) => {

  const [blockEvents, customEvents] = splitEventsByType(eventsOnSelectedDate)


  const EventButtonList = ({events, title}: { events: EventApi[], title: string }) => {
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
            title={event.title}
            start={event.start!}
            end={event.end!}
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