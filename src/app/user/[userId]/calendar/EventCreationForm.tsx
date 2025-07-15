import React, {FormEvent, useState} from "react";
import {EventType} from "@prisma/client";
import {Box, Button, TextField, ToggleButton, ToggleButtonGroup} from "@mui/material";

export const EventCreationForm = (props: {
  setDrawerOpen: (open: boolean) => void
}) => {
  const [eventType, setEventType] = useState<EventType | null>(null)

  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    selection: EventType | null) => {
    setEventType(selection)
  }

  const handleSubmit = (e: FormEvent) => {
    console.log(e)
    e.preventDefault();
    props.setDrawerOpen(false);
  }

  return <Box
    component="form"
    onSubmit={handleSubmit}
  >
    <ToggleButtonGroup exclusive value={eventType} fullWidth onChange={handleChange}>
      <ToggleButton value={EventType.CustomEvent}>
        Event
      </ToggleButton>
      <ToggleButton value={EventType.BlockEvent}>
        Block
      </ToggleButton>
    </ToggleButtonGroup>
    {eventType &&
      <>
        <TextField label="Title" fullWidth sx={{my: 1}}/>
        <Button type="submit" fullWidth variant="contained">
          Save
        </Button>
      </>
    }
  </Box>;
}