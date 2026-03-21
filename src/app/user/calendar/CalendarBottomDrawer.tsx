'use client';

import React, {useRef, useState} from "react";
import {Box, Drawer, Typography} from "@mui/material";

import {DayMetricPrisma, EventPrisma} from "@/types/dataTypes";
import {BottomDrawerView} from "@/app/user/calendar/Calendar";
import {DayMetricsBar, MetricKey} from "@/app/user/calendar/DayMetricBar";
import {EventCreationForm} from "@/app/user/calendar/EventCreationForm";
import {EventsList} from "@/app/user/calendar/EventsList";
import {DayMetricInput} from "@/app/user/calendar/DayMetricInput";
import {TRANSITION_MS, useAnimatedDrawerHeight} from "./useAnimatedDrawerHeight";
import {EventDetails} from "@/app/user/calendar/EventDetails";
import {CustomMetricDef} from "@/types/settingsTypes";
import {useSettings} from "@lib/providers/SettingsProvider";

type CalendarDrawerProps = {
  open: boolean,
  drawerView: BottomDrawerView,
  setDrawerView: (view: BottomDrawerView) => void,
  selectedDate: Date | null,
  selectedEvent: EventPrisma | null,
  setSelectedEvent: (event: EventPrisma | null) => void,
  eventsOnSelectedDate: EventPrisma[],
  setDrawerOpen: (open: boolean) => void,
  dateDayMetrics: DayMetricPrisma | null | undefined,
  setDayMetricsStateCb: (date: Date, metrics: DayMetricPrisma | null) => void,
  userId: string,
  setEventsInState: (value: (prevEvents: EventPrisma[]) => EventPrisma[]) => void,
  prefilledDateRange: { start: Date | null; endExcl: Date | null },
  setPrefilledDateRange: (value: { start: Date | null; endExcl: Date | null }) => void,
  customMetricDefs?: CustomMetricDef[],
};

const CalendarBottomDrawer: React.FC<CalendarDrawerProps> = ({
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
                                                               userId,
                                                               setEventsInState,
                                                               prefilledDateRange,
                                                               setPrefilledDateRange,
                                                               customMetricDefs = [],
                                                             }) => {
  const { settings } = useSettings();
  const weightUnit = settings.weightUnit;

  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);
  const [inputValue, setInputValue] = useState<string | number | null>('');
  const mainPanelRef = useRef<HTMLDivElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);
  const drawerPaperRef = useRef<HTMLDivElement>(null);
  const height = useAnimatedDrawerHeight({
    open,
    selectedMetric,
    mainPanelRef,
    formPanelRef,
    drawerPaperRef
  });

  return <Drawer
    anchor="bottom"
    open={open}
    onClose={() => {
      setDrawerOpen(false)
      setSelectedMetric(null)
      setPrefilledDateRange({start: null, endExcl: null})
    }}
    slotProps={{
      paper: {
        ref: drawerPaperRef,
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflow: 'hidden',
          height: height ? `${height}px` : undefined,
          transition: height ? `height ${TRANSITION_MS}ms ease` : 'none',
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
        transition: `transform 300ms linear`
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
                customMetricDefs={customMetricDefs}
                weightUnit={weightUnit}
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
          <EventDetails event={selectedEvent} setDrawerOpen={setDrawerOpen} setEventsInState={setEventsInState}/>
        )}

        {drawerView === 'event-form' && (
          <EventCreationForm
            setDrawerOpen={setDrawerOpen}
            userId={userId}
            setEventsInState={setEventsInState}
            prefilledDateRange={prefilledDateRange}
          />
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
          customMetricDefs={customMetricDefs}
          weightUnit={weightUnit}
        />
      </Box>
    </Box>
  </Drawer>
}


export default CalendarBottomDrawer;