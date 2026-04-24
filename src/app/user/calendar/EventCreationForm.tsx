import React, {FormEvent, useState} from "react";
import {BlockSubtype, EventType} from "@/generated/prisma/browser";
import {
  Box,
  Button,
  Collapse,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import {DatePicker} from '@mui/x-date-pickers';
import {getISOWeek, subDays} from 'date-fns';
import {EventPrisma} from "@/types/dataTypes";
import {
  BlockOverlapConflictError,
  BlockOverlapResolution,
  createEvent,
  reconcileEventMutation
} from "@lib/events";
import {RecurrenceFrequency} from "@lib/apiSchemas";
import {BlockOverlapConfirmationDialog} from "@/app/user/calendar/BlockOverlapConfirmationDialog";

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
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency | null>(null)
  const [recurrenceEnd, setRecurrenceEnd] = useState<Date | null>(null)
  const [pendingEvent, setPendingEvent] = useState<Omit<EventPrisma, 'id'> | null>(null)
  const [overlapResolution, setOverlapResolution] = useState<BlockOverlapResolution[]>([])
  const [confirmingOverlap, setConfirmingOverlap] = useState(false)

  const handleEventTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    selection: EventType | null) => {

    setEventType(selection)
    setCustomBlockName("")
    setCustomEventName("")
    setBlockSubtype(null)
    setRecurrenceFrequency(null)
    setRecurrenceEnd(null)
  }

  const isFormFilled = () => {
    if (eventType === EventType.CustomEvent) {
      return Boolean(customEventName && startDate);
    }
    if (eventType === EventType.BlockEvent && blockSubtype) {
      if (blockSubtype === BlockSubtype.Custom) {
        return Boolean(customBlockName && startDate);
      }
      return Boolean(startDate);
    }
    return false;
  };

  const submitEvent = (newEvent: Omit<EventPrisma, 'id'>, resolveBlockOverlaps = false) => {
    setConfirmingOverlap(resolveBlockOverlaps);
    createEvent(newEvent, {resolveBlockOverlaps})
      .then((response) => {
        props.setEventsInState((prevEvents) => reconcileEventMutation(prevEvents, response));
        setPendingEvent(null);
        setOverlapResolution([]);
        props.setDrawerOpen(false);
      })
      .catch((error) => {
        if (error instanceof BlockOverlapConflictError) {
          setPendingEvent(newEvent);
          setOverlapResolution(error.overlapResolution);
          return;
        }
        console.error(error);
        alert(error instanceof Error ? error.message : 'Failed to create event');
      })
      .finally(() => setConfirmingOverlap(false));
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!eventType || !startDate) {
      alert("Please fill out dates.")
      return
    }

    if (!customEventName && !customBlockName && !blockSubtype) {
      alert("Event needs a name if custom, a block name if a custom block, or to be a specified block type.")
      return
    }

    const isBlock = eventType === EventType.BlockEvent;
    const newEvent: Omit<EventPrisma, 'id'> = {
      userId: props.userId,
      eventType,
      startDate,
      endDate: endDate || startDate,
      name: customEventName || customBlockName || blockSubtype!,
      blockSubtype,
      customColor: null,
      description: null,
      recurrenceFrequency: isBlock ? null : recurrenceFrequency,
      recurrenceEnd: isBlock ? null : recurrenceEnd,
    }

    submitEvent(newEvent);
  }

  const showDateSection = !!(startDate || endDate) ||
    (eventType === EventType.CustomEvent || blockSubtype !== null) &&
    !(blockSubtype === BlockSubtype.Custom && !customBlockName);

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
                  width: '100%',
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

        <Collapse in={showDateSection} timeout={TIMEOUT} unmountOnExit>
          <Divider sx={{my: 1}}/>
          <Typography variant={'subtitle2'} fontSize="0.75rem">Date Range</Typography>
          <Box display="flex" gap={2} alignItems="center" width="100%" mb={2} mt={1}>
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
          {eventType === EventType.CustomEvent && (
            <>
              <Divider sx={{my: 1}}/>
              <Typography variant={'subtitle2'} fontSize="0.75rem">Repeat</Typography>
              <FormControl fullWidth sx={{mt: 1}}>
                <InputLabel id="recurrence-label">Frequency</InputLabel>
                <Select
                  labelId="recurrence-label"
                  label="Frequency"
                  value={recurrenceFrequency ?? ''}
                  onChange={(e) => setRecurrenceFrequency((e.target.value as RecurrenceFrequency) || null)}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="DAILY">Daily</MenuItem>
                  <MenuItem value="WEEKLY">Weekly</MenuItem>
                  <MenuItem value="MONTHLY">Monthly</MenuItem>
                  <MenuItem value="YEARLY">Yearly</MenuItem>
                </Select>
              </FormControl>
              <Collapse in={!!recurrenceFrequency} timeout={TIMEOUT} unmountOnExit>
                <DatePicker
                  label="Ends on (optional)"
                  value={recurrenceEnd}
                  onChange={(date) => setRecurrenceEnd(date)}
                  sx={{width: '100%', mt: 1}}
                  slotProps={{field: {clearable: true}}}
                />
              </Collapse>
            </>
          )}
        </Collapse>

        <Collapse in={isFormFilled()} timeout={TIMEOUT} unmountOnExit>
          <Divider sx={{my: 2}}/>
          <Button type="submit" fullWidth variant="contained">
            Save
          </Button>
        </Collapse>
      </>
    }
    <BlockOverlapConfirmationDialog
      open={overlapResolution.length > 0}
      resolutions={overlapResolution}
      loading={confirmingOverlap}
      onCancel={() => {
        setPendingEvent(null);
        setOverlapResolution([]);
      }}
      onConfirm={() => {
        if (pendingEvent) submitEvent(pendingEvent, true);
      }}
    />
  </Box>
}
