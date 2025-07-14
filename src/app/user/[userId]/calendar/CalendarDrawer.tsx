import React, {useEffect, useRef, useState} from "react";
import {Box, Button, Drawer, IconButton, List, ListItemButton, TextField, Typography} from "@mui/material";
import {EventApi} from "@fullcalendar/core";
import {sub} from "date-fns";
import WeightIcon from '@mui/icons-material/Scale';
import FoodIcon from '@mui/icons-material/RestaurantRounded';
import StepsIcon from '@mui/icons-material/DirectionsWalkRounded';
import WorkoutIcon from '@mui/icons-material/FitnessCenterRounded';
import SleepIcon from '@mui/icons-material/HotelRounded';
import {DayMetricPrisma} from "@/types/dataTypes";
import {DrawerView} from "@/app/user/[userId]/calendar/Calendar";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {hhMmToMin, minToHhMm} from "@/app/user/[userId]/calendar/utils";
import DayMetricButton from "@/app/user/[userId]/calendar/DayMetricButton";
import {updateDayMetricClient} from "@lib/dayMetrics";

type MetricKey = keyof DayMetricPrisma
type CalendarDrawerProps = {
  open: boolean;
  drawerView: DrawerView;
  setDrawerView: (view: DrawerView) => void;
  selectedDate: Date | null;
  selectedEvent: EventApi | null;
  setSelectedEvent: (event: EventApi | null) => void;
  eventsOnSelectedDate: EventApi[];
  setDrawerOpen: (open: boolean) => void;
  dateDayMetrics: DayMetricPrisma | null | undefined;
  setDayMetricsStateCb: (date: Date, metrics: DayMetricPrisma | null) => void;
};

const CalendarDrawer: React.FC<CalendarDrawerProps> = ({
                                                         open,
                                                         drawerView,
                                                         setDrawerView,
                                                         selectedDate,
                                                         selectedEvent,
                                                         setSelectedEvent,
                                                         eventsOnSelectedDate,
                                                         setDrawerOpen,
                                                         dateDayMetrics,
                                                         setDayMetricsStateCb
                                                       }) => {
  const {weight = null, calories = null, steps = null, workout = null, sleepMins = null} = dateDayMetrics || {};
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);
  const [inputValue, setInputValue] = useState<string | number | null>('');
  const mainPanelRef = useRef<HTMLDivElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);
  const drawerPaperRef = useRef<HTMLDivElement>(null);
  const [initialHeight, setInitialHeight] = useState<number | null>(null);

// Before opening drawer, measure and store height
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => {
        const panel = selectedMetric ? formPanelRef.current : mainPanelRef.current;
        if (panel) setInitialHeight(panel.offsetHeight);
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [open, selectedMetric, initialHeight]);

  useEffect(() => {
    const panel = selectedMetric ? formPanelRef.current : mainPanelRef.current;
    const drawer = drawerPaperRef.current;

    if (!panel || !drawer) return;

    const targetHeight = panel.offsetHeight;

    drawer.style.transition = 'height 250ms ease-in-out';
    drawer.style.height = `${targetHeight}px`;
  }, [selectedMetric]);

  const handleSubmit = () => {
    if (!selectedDate || !selectedMetric) {
      console.warn("handleSubmit called with null selectedDate or selectedMetric");
      return;
    }
    const prevMetrics = dateDayMetrics ? {...dateDayMetrics} : null;

    const updatedMetrics: DayMetricPrisma = {
      ...(dateDayMetrics as DayMetricPrisma),
      [selectedMetric]: selectedMetric === 'sleepMins' ? inputValue : Number(inputValue)
    };

    setDayMetricsStateCb(selectedDate, updatedMetrics);

    updateDayMetricClient(updatedMetrics)
      .then(() => setSelectedMetric(null))
      .catch(() => {
        alert("Failed to update value")
        setDayMetricsStateCb(selectedDate, prevMetrics || null)
      })
  }

  return <Drawer
    anchor="bottom"
    open={open}
    onClose={() => {
      setDrawerOpen(false)
      setSelectedMetric(null)
    }}
    slotProps={{
      paper: {
        ref: drawerPaperRef,
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflow: 'hidden',
          height: initialHeight ? `${initialHeight}px` : undefined,
          transition: initialHeight ? 'height 500ms ease' : 'none',
        }
      }
    }}
  >
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: '200%',
        transform: `translateX(${selectedMetric ? '-50%' : '0%'})`,
        transition: 'transform 300ms ease'
      }}
    >
      {/* Main Panel */}
      <Box ref={mainPanelRef} sx={{width: '50%', p: 2}}>
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <DayMetricButton value={weight} icon={<WeightIcon/>} onClick={() => {
              setSelectedMetric('weight')
              setInputValue(weight)
            }}/>
            <DayMetricButton value={calories} icon={<FoodIcon/>} onClick={() => {
              setSelectedMetric('calories')
              setInputValue(calories)
            }}/>
            <DayMetricButton value={steps} icon={<StepsIcon/>} onClick={() => {
              setSelectedMetric('steps')
              setInputValue(steps)
            }}/>
            <DayMetricButton value={sleepMins && minToHhMm(sleepMins)} icon={<SleepIcon/>} onClick={() => {
              setSelectedMetric('sleepMins')
              setInputValue(sleepMins)
            }}/>
            <DayMetricButton value={workout} icon={<WorkoutIcon/>}/>
            {/* todo: this should just show if a workout happened, and link to it */}
          </Box>
          <Typography variant="h6">{selectedDate?.toDateString()}</Typography>
        </Box>

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
            <Button fullWidth variant="contained" onClick={() => setDrawerView('event-form')}>
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

        {drawerView === 'event-form' && (
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              setDrawerOpen(false);
            }}
          >
            <TextField label="Title" fullWidth sx={{my: 1}}/>
            <Button type="submit" fullWidth variant="contained">
              Save
            </Button>
            <Button fullWidth variant="text" onClick={() => setDrawerView('list')} sx={{mt: 1}}>
              Cancel
            </Button>
          </Box>
        )}
      </Box>

      {/* Form Panel */}
      <Box ref={formPanelRef} sx={{width: '50%', p: 2, position: 'relative'}}>
        {/* Back Arrow in top left */}
        <IconButton
          onClick={() => setSelectedMetric(null)}
          sx={{position: 'absolute', top: 8, left: 8, zIndex: 1}}
          aria-label="Back"
        >
          <ArrowBackIcon/>
        </IconButton>
        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1}}>
          <Typography variant="subtitle1" mb={1}>Update {selectedMetric}</Typography>
          <Box sx={{display: 'flex', flexDirection: 'row', gap: 2, width: '100%'}}>
            {selectedMetric === 'sleepMins' ?
              <TextField label="Enter Sleep Time"
                         type={"time"}
                         value={(inputValue && minToHhMm(Number(inputValue))) ?? ""}
                         onChange={(e) => setInputValue(hhMmToMin(e.target.value))}
                         sx={{mb: 2, width: '100%'}}
              />
              : <TextField
                type={'number'}
                label={`Enter ${selectedMetric}`}
                value={inputValue ?? ""}
                onChange={(e) => setInputValue(e.target.value)}
                sx={{mb: 2, width: '100%'}}
              />}

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={inputValue === null}
              sx={{flex: 1, height: "56px"}}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  </Drawer>
}


export default CalendarDrawer;