import {
  Box,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@mui/material";
import React, {useState} from "react";
import DeleteIcon from '@mui/icons-material/Delete';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import Button from "@mui/material/Button";
import SaveIcon from '@mui/icons-material/Save';
import RepeatIcon from '@mui/icons-material/Repeat';
import {dateAndWeek, toExclusiveEndDate, toInclusiveEndDate} from "@/app/user/calendar/utils";
import {DatePicker} from "@mui/x-date-pickers";
import {EventPrisma} from "@/types/dataTypes";
import {
  BlockOverlapConflictError,
  BlockOverlapResolution,
  deleteEvent,
  reconcileEventMutation,
  updateEvent
} from "@lib/events";
import {RecurrenceFrequency} from "@lib/apiSchemas";
import {EventType} from "@/generated/prisma/browser";
import {BlockOverlapConfirmationDialog} from "@/app/user/calendar/BlockOverlapConfirmationDialog";

const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

const TIMEOUT = 300;

export const EventDetails = (
  {
    event,
    setDrawerOpen,
    setEventsInState,
    setSelectedEvent,
  }: {
    event: EventPrisma,
    setDrawerOpen: (open: boolean) => void
    setEventsInState: (value: (prevEvents: EventPrisma[]) => EventPrisma[]) => void
    setSelectedEvent: (event: EventPrisma | null) => void
  },
) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingPatch, setPendingPatch] = useState<Partial<EventPrisma> | null>(null);
  const [overlapResolution, setOverlapResolution] = useState<BlockOverlapResolution[]>([]);
  const [confirmingOverlap, setConfirmingOverlap] = useState(false);

  const [title, setTitle] = useState<string>(event.name ?? '')
  const [startDate, setStartDate] = useState<Date>(event.startDate!)
  const [endDate, setEndDate] = useState<Date>(toInclusiveEndDate(event.endDate!))
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<RecurrenceFrequency | null>((event.recurrenceFrequency as RecurrenceFrequency) ?? null)
  const [recurrenceEnd, setRecurrenceEnd] = useState<Date | null>(event.recurrenceEnd ?? null)

  const handleDelete = async () => {
    setShowDeleteConfirm(false)
    setDrawerOpen(false)

    let prevEvents: EventPrisma[] = [];
    setEventsInState((prev) => {
      prevEvents = prev;
      return prev.filter((e) => e.id !== Number(event.id))
    })

    deleteEvent(Number(event.id))
      .then(() => {
        alert("Event deleted")
      })
      .catch((err) => {
        console.error(err)
        setEventsInState(() => prevEvents);
        alert("Failed to update value")
      })
  }

  const submitPatch = (patch: Partial<EventPrisma>, resolveBlockOverlaps = false) => {
    setConfirmingOverlap(resolveBlockOverlaps);
    updateEvent(Number(event.id), patch, {resolveBlockOverlaps})
      .then((response) => {
        setEventsInState((prev) => reconcileEventMutation(prev, response));
        setSelectedEvent(response.event);
        setPendingPatch(null);
        setOverlapResolution([]);
        setMode('view');
        alert("Event updated");
      })
      .catch((error) => {
        if (error instanceof BlockOverlapConflictError) {
          setPendingPatch(patch);
          setOverlapResolution(error.overlapResolution);
          return;
        }
        console.error(error)
        alert(error instanceof Error ? error.message : "Failed to update event")
      })
      .finally(() => setConfirmingOverlap(false));
  }

  const handleSave = async () => {
    const isBlock = event.eventType === EventType.BlockEvent;
    submitPatch({
      name: title,
      startDate,
      endDate: toExclusiveEndDate(endDate),
      recurrenceFrequency: isBlock ? null : recurrenceFrequency,
      recurrenceEnd: isBlock ? null : recurrenceEnd,
    });
  }

  const handleExport = () => {
    window.location.href = `/api/event/${event.id}/export`;
  }

  return (<>
    {mode === 'view' &&
      <Box>
        <Typography variant="h5" gutterBottom sx={{paddingBottom: 1}}>{title}</Typography>
        <Typography variant="subtitle2" sx={{textAlign: 'center', py: 1}}>
          <span style={{textAlign: 'center'}}>
            {dateAndWeek(startDate)} - {dateAndWeek(endDate)}
          </span>
        </Typography>
        {event.recurrenceFrequency && (
          <Box sx={{display: 'flex', justifyContent: 'center', pb: 1}}>
            <Chip
              icon={<RepeatIcon fontSize="small"/>}
              label={`Repeats ${RECURRENCE_LABELS[event.recurrenceFrequency as RecurrenceFrequency]}${event.recurrenceEnd ? ` · until ${new Date(event.recurrenceEnd).toLocaleDateString()}` : ''}`}
              size="small"
              variant="outlined"
            />
          </Box>
        )}
        <Divider sx={{my: 1}}/>
        <Box sx={{p: 1, display: 'flex', justifyContent: 'space-evenly'}}>
          <RoundIconButton onClick={() => setMode('edit')} icon={<EditCalendarIcon/>}/>
          <RoundIconButton onClick={() => setShowDeleteConfirm(true)} icon={<DeleteIcon/>}/>
          <RoundIconButton onClick={handleExport} icon={<FileDownloadOutlinedIcon/>}/>
        </Box>
      </Box>
    }

    {mode === 'edit' &&
      <Box>
        <TextField required variant={'standard'} sx={{
          paddingBottom: 1,
          '& .MuiInputBase-input': {
            fontSize: '1.5rem',
            fontWeight: 400,
            lineHeight: 1.334,
          },
          '& .MuiInputLabel-root': {
            fontSize: '1.5rem',
          },
        }}
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
        />
        <span style={{textAlign: 'center', display: 'flex', justifyContent: 'space-evenly', alignItems: 'baseline'}}>
          {<CustomDatePicker date={startDate} onChange={(date) => setStartDate(date)}/>}
          &nbsp;-&nbsp;
          {<CustomDatePicker date={endDate} onChange={(date) => setEndDate(date)}/>}
        </span>
        {event.eventType === EventType.CustomEvent && (
          <Box sx={{mt: 2}}>
            <FormControl fullWidth size="small">
              <InputLabel id="edit-recurrence-label">Repeat</InputLabel>
              <Select
                labelId="edit-recurrence-label"
                label="Repeat"
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
          </Box>
        )}
        <Divider sx={{my: 1}}/>
        <Box sx={{p: 1, display: 'flex', justifyContent: 'space-evenly'}}>
          <RoundIconButton onClick={handleSave} icon={<SaveIcon/>}/>
        </Box>
      </Box>
    }

    <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
      <DialogTitle>Delete Event?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {event.recurrenceFrequency
            ? 'Are you sure you want to delete this recurring event? All occurrences will be removed.'
            : 'Are you sure you want to delete this event? This action cannot be undone.'}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
        <Button color="error" onClick={handleDelete}>Delete</Button>
      </DialogActions>
    </Dialog>
    <BlockOverlapConfirmationDialog
      open={overlapResolution.length > 0}
      resolutions={overlapResolution}
      loading={confirmingOverlap}
      onCancel={() => {
        setPendingPatch(null);
        setOverlapResolution([]);
      }}
      onConfirm={() => {
        if (pendingPatch) submitPatch(pendingPatch, true);
      }}
    />
  </>)
};

const RoundIconButton = ({onClick, icon}: { onClick: () => void, icon: React.ReactNode }) => {
  return (<IconButton
    onClick={onClick}
    sx={{
      width: 50,
      height: 50,
      borderRadius: '50%',
    }}
  >
    {icon}
  </IconButton>)
}

type CustomDatePickerProps = {
  date: Date;
  onChange: (date: Date) => void;
};
const CustomDatePicker: React.FC<CustomDatePickerProps> = ({date, onChange}) => {
  return (<DatePicker
    label="Select date"
    value={date}
    // @ts-expect-error Latest MUI Date Picker wants some extra types that are not in the docs
    onChange={onChange}
    slotProps={{
      textField: {
        variant: 'standard',
        InputProps: {
          sx: {
            maxWidth: '40dvw',
            fontSize: '0.875rem',
            fontWeight: 500,
            lineHeight: 1.57,
            letterSpacing: '0.00714em',
          },
        },
        InputLabelProps: {
          sx: {
            fontSize: '0.875rem',
            fontWeight: 500,
            lineHeight: 1.57,
            letterSpacing: '0.00714em',
          },
        },
      },
    }}
  />)
}
