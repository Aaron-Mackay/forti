import React from "react";
import {EventApi} from "@fullcalendar/core";
import {DrawerView} from "@/app/user/[userId]/calendar/Calendar";
import {Divider, Paper, Stack, styled, Typography} from "@mui/material";
import {EventType} from "@prisma/client";
import Button from "@mui/material/Button";
import {sub} from "date-fns";
import {dateAndWeek} from "@/app/user/[userId]/calendar/utils";

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

  const Item = styled(Paper)(({theme}) => ({
    backgroundColor: '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: (theme.vars ?? theme).palette.text.secondary,
    ...theme.applyStyles('dark', {
      backgroundColor: '#1A2027',
    }),
  }));

  const EventButtonList = ({events, title}: { events: EventApi[], title: string }) => {
    return (<>
      <Typography variant="subtitle2" fontSize="0.75rem">{title}</Typography>
      <Stack spacing={1} sx={{marginBottom: 1}}>
        {events.map((event) => (
          <Item
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
                  {event.start && dateAndWeek(event.start)}
                <br/><Divider sx={{my: 1}}/>
                {event.end && dateAndWeek(sub(event.end, {days: 1}))}
                </span>
            </div>
          </Item>
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