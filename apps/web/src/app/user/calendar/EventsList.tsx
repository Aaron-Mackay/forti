import React from "react";
import {BottomDrawerView} from "@/app/user/calendar/Calendar";
import {Divider, Stack, Typography, Button} from "@mui/material";
import {EventType} from "@/generated/prisma/browser";
import {EventListItem} from "@/app/user/calendar/EventListItem";
import {EventPrisma} from "@/types/dataTypes";
import {signalTokens} from '@lib/signal/tokens';

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
  signalEnabled?: boolean,
}> = ({
        eventsOnSelectedDate,
        setSelectedEvent,
        setDrawerView,
        signalEnabled = false,
      }) => {

  const [blockEvents, customEvents] = splitEventsByType(eventsOnSelectedDate)

  const EventButtonList = ({events, title}: { events: EventPrisma[], title: string }) => {
    return (<>
      <Typography
        variant="subtitle2"
        sx={{
          fontFamily: signalEnabled ? signalTokens.fontVar.mono : undefined,
          fontSize: signalEnabled ? 11 : '0.75rem',
          color: signalEnabled ? signalTokens.surface.planning.inkLight : undefined,
          letterSpacing: signalEnabled ? '0.08em' : undefined,
        }}
      >
        {title}
      </Typography>
      <Stack spacing={1} sx={{marginBottom: 1}}>
        {events.map((event) => (
          <EventListItem
            key={event.id}
            onClick={() => {
              setSelectedEvent(event);
              setDrawerView('details');
            }}
            event={event}
            signalEnabled={signalEnabled}
          />
        ))}
      </Stack>
    </>)
  }

  return (<>
    {blockEvents.length > 0 && <EventButtonList events={blockEvents} title={'Block'}/>}
    {blockEvents.length > 0 && customEvents.length > 0 && <Divider sx={{my: 1}}/>}
    {customEvents.length > 0 && <EventButtonList events={customEvents} title={'Events'}/>}
    <Button
      fullWidth
      variant={signalEnabled ? 'outlined' : 'contained'}
      onClick={() => setDrawerView('event-form')}
      sx={signalEnabled ? { borderColor: signalTokens.surface.planning.borderStrong, color: signalTokens.surface.planning.ink } : undefined}
    >
      + Add Event
    </Button>
  </>)
}
