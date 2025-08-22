import React, {FormEvent, useState} from "react";
import {BlockSubtype, EventType} from "@prisma/client";
import {Box, Button, Collapse, Divider, TextField, ToggleButton, ToggleButtonGroup, Typography} from "@mui/material";
import {DatePicker} from '@mui/x-date-pickers';
import {getISOWeek, subDays} from 'date-fns';
import {EventPrisma} from "@/types/dataTypes";
import {createEvent} from "@lib/events";

const TIMEOUT = 300

export const EventCreationForm = (props: {
  setDrawerOpen: (open: boolean) => void,
  userId: string,
  setEventsInState: (value: (prevEvents: EventPrisma[]) => EventPrisma[]) => void,
  prefilledDateRange: { start: Date | null; endExcl: Date | null }
}) => {
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [blockSubtype, setBlockSubtype] = useState<BlockSubtype | null>(null)
  const [customEventName, setCustomEventName] = useState<string>("")
  const [customBlockName, setCustomBlockName] = useState<string>("")
  const [startDate, setStartDate] = useState<Date | null>(props.prefilledDateRange.start)
  const [endDate, setEndDate]
    = useState<Date | null>(props.prefilledDateRange.endExcl && subDays(props.prefilledDateRange.endExcl, 1))

  const handleEventTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    selection: EventType | null) => {

    setEventType(selection)
    setCustomBlockName("")
    setCustomEventName("")
    setBlockSubtype(null)
    // resetDates()
  }
  const isFormFilled = () => {
    // CustomEvent: requires a custom event name and a start date
    if (eventType === EventType.CustomEvent) {
      return Boolean(customEventName && startDate);
    }
    // BlockEvent: requires a block subtype and a start date
    if (eventType === EventType.BlockEvent && blockSubtype) {
      // Custom block subtype only: requires a custom block name and a start date
      if (blockSubtype === BlockSubtype.Custom) {
        return Boolean(customBlockName && startDate);
      }
      return Boolean(startDate);
    }
    return false;

  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    props.setDrawerOpen(false);

    if (!eventType || !startDate) {
      alert("Please fill out dates.")
      return
    }

    if (!customEventName && !customBlockName && !blockSubtype) {
      alert("Event needs a name if custom, a block name if a custom block, or to be a specified block type.")
      return
    }

    const newEvent: Omit<EventPrisma, 'id'> = {
      userId: props.userId,
      eventType,
      startDate,
      endDate: endDate || startDate,
      name: customEventName || customBlockName || blockSubtype!,
      blockSubtype,
      customColor: null,
      description: null
    }

    createEvent(newEvent)
      .then((addedEvent) => {
        props.setEventsInState((prevEvents) => {
          return [...prevEvents, addedEvent]
        })
      })
      .catch((e) => {
        console.error(e.message)
        alert(JSON.parse(e.message).error)
      })
  }

  return <Box
    component="form"
    onSubmit={handleSubmit}
    width={'calc(100dvw - 32px)'}
  >
    <ToggleButtonGroup exclusive value={eventType} fullWidth onChange={handleEventTypeChange}>
      <ToggleButton value={EventType.CustomEvent}>
        Event
      </ToggleButton>
      <ToggleButton value={EventType.BlockEvent}>
        Block
      </ToggleButton>
    </ToggleButtonGroup>
    {
      // eventType &&
      <>
        {/* Custom Event Field */}
        <Collapse in={eventType === EventType.CustomEvent} timeout={TIMEOUT} unmountOnExit>
          <TextField
            label="Event"
            fullWidth
            value={customEventName}
            onChange={(e) => setCustomEventName(e.target.value)}
            autoComplete="off"
            sx={{my: 1}}
          />
        </Collapse>
        {/* BlockSubtype Buttons */}
        <Collapse in={eventType === EventType.BlockEvent} timeout={TIMEOUT} unmountOnExit>
          <Divider sx={{my: 1}}/>
          <Typography variant={'subtitle2'} fontSize="0.75rem">Block Type</Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1,
              my: 1,
              gridAutoRows: '48px'
            }}
          >
            {Object.keys(BlockSubtype).map((subtype) => (
              <ToggleButton
                key={subtype}
                value={subtype}
                selected={blockSubtype === subtype}
                onChange={() => setBlockSubtype(subtype as BlockSubtype)}
              >
                {subtype}
              </ToggleButton>
            ))}
            <Collapse
              in={
                eventType === EventType.BlockEvent &&
                blockSubtype === BlockSubtype.Custom
              }
              onExited={() => setCustomBlockName('')}
              timeout={TIMEOUT}
              unmountOnExit
              sx={{
                gridColumn: '2 / span 2',
                transformOrigin: 'right',
                '& .MuiCollapse-wrapperInner': {
                  width: '100%', // override MUI's default
                },
              }}
              orientation={"horizontal"}
            >
              <TextField
                fullWidth
                value={customBlockName}
                onChange={(e) => setCustomBlockName(e.target.value)}
                autoComplete="off"
                sx={{
                  display: 'block',
                  height: '100%',
                  '& .MuiInputBase-root': {
                    height: '100%',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }
                }}
              />
            </Collapse>
          </Box>
        </Collapse>

        <Collapse
          in={!!(startDate || endDate) || (eventType === EventType.CustomEvent || blockSubtype !== null) && !(blockSubtype === BlockSubtype.Custom && !customBlockName)}
          timeout={TIMEOUT} unmountOnExit>
          <Divider sx={{my: 1}}/>
          <Typography variant={'subtitle2'} fontSize="0.75rem">Date Range</Typography>
          <Box display="flex" gap={2} alignItems="center" width="100%" mb={2} mt={1}>
            {/* todo use memoized function to check if dates have blocks already?*/}
            <DatePicker
              label={"Start" + (startDate ? ` - Week ${getISOWeek(startDate)}` : "")}
              value={startDate}
              onChange={(date) => setStartDate(date)}
              sx={{minWidth: 0, flexGrow: 1}}
            />
            <DatePicker
              label={(endDate ? `End - Week ${getISOWeek(endDate)}` : "End (Optional)")}
              value={endDate}
              onChange={(date) => setEndDate(date)}
              sx={{minWidth: 0, flexGrow: 1}}
            />
          </Box>
        </Collapse>

        <Collapse in={isFormFilled()} timeout={TIMEOUT} unmountOnExit>
          <Divider sx={{my: 2}}/>
          <Button type="submit" fullWidth variant="contained">
            Save
          </Button>
        </Collapse>
      </>
    }
  </Box>
}