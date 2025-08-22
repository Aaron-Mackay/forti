import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Typography
} from "@mui/material";
import {addDays, sub, subDays} from "date-fns";
import React, {useState} from "react";
import DeleteIcon from '@mui/icons-material/Delete';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import Button from "@mui/material/Button";
import SaveIcon from '@mui/icons-material/Save';
import {dateAndWeek} from "@/app/user/calendar/utils";
import {DatePicker} from "@mui/x-date-pickers";
import {EventPrisma} from "@/types/dataTypes";
import {deleteEvent, updateEvent} from "@lib/events";

export const EventDetails = (
  {
    event,
    setDrawerOpen,
    setEventsInState
  }: {
    event: EventPrisma,
    setDrawerOpen: (open: boolean) => void
    setEventsInState: (value: (prevEvents: EventPrisma[]) => EventPrisma[]) => void
  },
) => {
  // todo link to workout block?
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [title, setTitle] = useState<string>(event.name ?? '')
  const [startDate, setStartDate] = useState<Date>(event.startDate!)
  const [endDate, setEndDate] = useState<Date>(subDays(event.endDate!, 1))

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

  const handleSave = async () => {
    updateEvent(Number(event.id), {
      name: title,
      startDate: addDays(startDate, 1),
      endDate: addDays(endDate, 1),
    })
      .then((updated) => {
        setEventsInState((prev) =>
          prev.map((e) => (e.id === updated.id ? {...e, ...updated} : e))
        );
        setMode('view');
        alert("Event updated");
      })
      .catch((err) => {
        console.error(err)
        alert("Failed to update event")
      })
  }

  return (<>
    {mode === 'view' &&
      <Box>
        <Typography variant="h5" gutterBottom sx={{paddingBottom: 1}}>{title}</Typography>
        <Typography variant="subtitle2" sx={{textAlign: 'center', py: 1}}>
        <span style={{textAlign: 'center'}}>
                  {dateAndWeek(startDate)} - {dateAndWeek(sub(endDate, {days: 1}))}
                </span>
        </Typography>
        <Divider sx={{my: 1}}/>
        <Box sx={{p: 1, display: 'flex', justifyContent: 'space-evenly'}}>
          <RoundIconButton onClick={() => setMode('edit')} icon={<EditCalendarIcon/>}/>
          <RoundIconButton onClick={() => setShowDeleteConfirm(true)} icon={<DeleteIcon/>}/>
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
          Are you sure you want to delete this event? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
        <Button color="error" onClick={handleDelete}>Delete</Button>
      </DialogActions>
    </Dialog>
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
            fontSize: '0.875rem',         // subtitle2 font size
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