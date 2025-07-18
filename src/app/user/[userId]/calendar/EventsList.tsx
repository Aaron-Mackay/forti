import React from "react";
import {EventApi} from "@fullcalendar/core";
import {DrawerView} from "@/app/user/[userId]/calendar/Calendar";
import {Divider, List, ListItemButton, Typography} from "@mui/material";
import {EventType} from "@prisma/client";
import Button from "@mui/material/Button";
import {getISOWeek, sub} from "date-fns";

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

  const EventButtonList = ({events, title}: { events: EventApi[], title: string }) => {
    return events.map((event) => (
      <>
        <Typography variant="subtitle2" fontSize="0.75rem">{title}</Typography>
        <ListItemButton
          key={event.id}
          onClick={() => {
            setSelectedEvent(event);
            setDrawerView('details');
          }}
          sx={{backgroundColor: 'rgba(200,238,255,0.1)', borderRadius: '1em'}}
        >
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
            <span>{event.title}</span>
            <span style={{textAlign: 'center'}}>
                  {event.start && `${event.start?.toDateString()} (Wk ${getISOWeek(event.start)})`}
              <br/><Divider sx={{my: 1}}/>
              {event.end && `${sub(event.end, {days: 1}).toDateString()} (Wk ${getISOWeek(event.end)})`}
                </span>
          </div>
        </ListItemButton>
      </>


    ))
  }

  return (<>
    <List>
      {blockEvents.length > 0 && <EventButtonList events={blockEvents} title={'Block'}/>}
      {blockEvents.length > 0 && customEvents.length > 0 && <Divider sx={{my: 1}}/>}
      {customEvents.length > 0 && <EventButtonList events={customEvents} title={'Events'}/>}
    </List>
    <Button fullWidth variant="contained" onClick={() => setDrawerView('event-form')}>
      + Add Event
    </Button>
  </>)
}