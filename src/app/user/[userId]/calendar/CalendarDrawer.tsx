import React, {useEffect, useRef, useState} from "react";
import {Box, Drawer, Typography} from "@mui/material";
import {EventApi} from "@fullcalendar/core";
import {sub} from "date-fns";

import {DayMetricPrisma} from "@/types/dataTypes";
import {DrawerView} from "@/app/user/[userId]/calendar/Calendar";
import {DayMetricsBar, MetricKey} from "@/app/user/[userId]/calendar/DayMetricBar";
import {EventCreationForm} from "@/app/user/[userId]/calendar/EventCreationForm";
import {EventsList} from "@/app/user/[userId]/calendar/EventsList";
import {DayMetricInput} from "@/app/user/[userId]/calendar/DayMetricInput";

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
  userId: string
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
                                                         setDayMetricsStateCb,
                                                         userId
                                                       }) => {
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
        {drawerView === 'list' && (
          <>
            <Box mb={2}>
              <DayMetricsBar
                dateDayMetrics={dateDayMetrics}
                setSelectedMetric={setSelectedMetric}
                setInputValue={setInputValue}
              />
              <Typography variant="h6">{selectedDate?.toDateString()}</Typography>
            </Box>
            <EventsList
              eventsOnSelectedDate={eventsOnSelectedDate}
              setSelectedEvent={setSelectedEvent}
              setDrawerView={setDrawerView}/>
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
          <EventCreationForm
            setDrawerOpen={setDrawerOpen}/>
        )}
      </Box>

      {/* Form Panel */}
      <Box ref={formPanelRef} sx={{width: '50%', p: 2, position: 'relative'}}>
        <DayMetricInput
          setSelectedMetric={setSelectedMetric}
          selectedMetric={selectedMetric}
          setInputValue={setInputValue}
          inputValue={inputValue}
          setDayMetricsStateCb={setDayMetricsStateCb}
          selectedDate={selectedDate}
          userId={userId}
          dateDayMetrics={dateDayMetrics}
        />
      </Box>
    </Box>
  </Drawer>
}


export default CalendarDrawer;