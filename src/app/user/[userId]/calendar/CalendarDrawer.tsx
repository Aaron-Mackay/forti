import React from "react";
import {Box, Button, Drawer, List, ListItemButton, TextField, Typography} from "@mui/material";
import {EventApi} from "@fullcalendar/core";
import {sub} from "date-fns";

type DrawerView = 'list' | 'details' | 'form';

type CalendarDrawerProps = {
  open: boolean;
  onClose: () => void;
  drawerView: DrawerView;
  setDrawerView: (view: DrawerView) => void;
  selectedDate: Date | null;
  selectedEvent: EventApi | null;
  setSelectedEvent: (event: EventApi | null) => void;
  eventsOnSelectedDate: EventApi[];
  setDrawerOpen: (open: boolean) => void;
};

const CalendarDrawer: React.FC<CalendarDrawerProps> = ({
  open,
  onClose,
  drawerView,
  setDrawerView,
  selectedDate,
  selectedEvent,
  setSelectedEvent,
  eventsOnSelectedDate,
  setDrawerOpen,
}) => (
  <Drawer
    anchor="bottom"
    open={open}
    onClose={onClose}
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
          {/* Todo Add other fields here */}
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
);

export default CalendarDrawer;