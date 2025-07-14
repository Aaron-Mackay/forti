import React from "react";
import {EventApi} from "@fullcalendar/core";
import {DrawerView} from "@/app/user/[userId]/calendar/Calendar";
import {Button, List, ListItemButton} from "@mui/material";

export const EventsList: React.FC<{
  eventsOnSelectedDate: EventApi[],
  setSelectedEvent: (event: EventApi) => void,
  setDrawerView: (view: DrawerView) => void,
}> = ({
        eventsOnSelectedDate,
        setSelectedEvent,
        setDrawerView
      }) => {
  return (<>
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
    <Button fullWidth variant="contained" onClick={() => setDrawerView('event-form')}>
      + Add Event
    </Button>
  </>)
}