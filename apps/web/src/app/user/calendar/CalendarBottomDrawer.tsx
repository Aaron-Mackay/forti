'use client';

import React, {useRef, useState} from "react";
import {Box, Drawer, Typography} from "@mui/material";

import {MetricPrisma, EventPrisma} from "@/types/dataTypes";
import {BottomDrawerView} from "@/app/user/calendar/Calendar";
import {MetricsBar, MetricKey} from "@/app/user/calendar/MetricBar";
import {EventCreationForm} from "@/app/user/calendar/EventCreationForm";
import {EventsList} from "@/app/user/calendar/EventsList";
import {MetricInput} from "@/app/user/calendar/MetricInput";
import {TRANSITION_MS, useAnimatedDrawerHeight} from "./useAnimatedDrawerHeight";
import {EventDetails} from "@/app/user/calendar/EventDetails";
import {CustomMetricDef} from "@/types/settingsTypes";
import {useSettings} from "@lib/providers/SettingsProvider";
import {signalTokens} from '@lib/signal/tokens';

type CalendarDrawerProps = {
  open: boolean,
  drawerView: BottomDrawerView,
  setDrawerView: (view: BottomDrawerView) => void,
  selectedDate: Date | null,
  selectedEvent: EventPrisma | null,
  setSelectedEvent: (event: EventPrisma | null) => void,
  eventsOnSelectedDate: EventPrisma[],
  setDrawerOpen: (open: boolean) => void,
  dateMetric: MetricPrisma | null | undefined,
  setMetricStateCb: (date: Date, metric: MetricPrisma | null) => void,
  userId: string,
  setEventsInState: (value: (prevEvents: EventPrisma[]) => EventPrisma[]) => void,
  prefilledDateRange: { start: Date | null; endExcl: Date | null },
  setPrefilledDateRange: (value: { start: Date | null; endExcl: Date | null }) => void,
  customMetricDefs?: CustomMetricDef[],
  signalEnabled?: boolean,
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
                                                               dateMetric,
                                                               setMetricStateCb,
                                                               userId,
                                                               setEventsInState,
                                                               prefilledDateRange,
                                                               setPrefilledDateRange,
                                                               customMetricDefs = [],
                                                               signalEnabled = false,
                                                             }) => {
  const { settings } = useSettings();
  const bodyweightUnit = settings.bodyweightUnit;

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
          borderTopLeftRadius: signalEnabled ? 18 : 16,
          borderTopRightRadius: signalEnabled ? 18 : 16,
          overflow: 'hidden',
          height: height ? `${height}px` : undefined,
          transition: height ? `height ${TRANSITION_MS}ms ease` : 'none',
          bgcolor: signalEnabled ? signalTokens.surface.planning.bg : undefined,
          color: signalEnabled ? signalTokens.surface.planning.ink : undefined,
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
      <Box ref={mainPanelRef} sx={{width: '50%', p: signalEnabled ? 1.5 : 2, bgcolor: signalEnabled ? signalTokens.surface.planning.bg : undefined}}>
        {drawerView === 'list' && (
          <>
            <Box
              mb={2}
              sx={signalEnabled ? {
                p: 1.5,
                border: `1px solid ${signalTokens.surface.planning.border}`,
                borderRadius: signalTokens.radii.cardLarge,
                bgcolor: signalTokens.surface.planning.surface,
              } : undefined}
            >
              <MetricsBar
                dateMetric={dateMetric}
                setSelectedMetric={setSelectedMetric}
                setInputValue={setInputValue}
                customMetricDefs={customMetricDefs}
                bodyweightUnit={bodyweightUnit}
              />
              <Typography
                variant={signalEnabled ? 'overline' : 'h6'}
                sx={signalEnabled ? {
                  mt: 0.5,
                  fontFamily: signalTokens.fontVar.mono,
                  color: signalTokens.surface.planning.inkLight,
                  letterSpacing: '0.08em',
                } : undefined}
              >
                {selectedDate?.toDateString()}
              </Typography>
            </Box>
            <EventsList
              eventsOnSelectedDate={eventsOnSelectedDate}
              setSelectedEvent={setSelectedEvent}
              setDrawerView={setDrawerView}
              signalEnabled={signalEnabled}
            />
          </>
        )}

        {drawerView === 'details' && selectedEvent && (
          <EventDetails
            event={selectedEvent}
            setDrawerOpen={setDrawerOpen}
            setEventsInState={setEventsInState}
            setSelectedEvent={setSelectedEvent}
          />
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
      <Box
        ref={formPanelRef}
        aria-hidden={!selectedMetric}
        sx={{
          width: '50%',
          p: signalEnabled ? 1.5 : 2,
          position: 'relative',
          pointerEvents: selectedMetric ? 'auto' : 'none',
          visibility: selectedMetric ? 'visible' : 'hidden',
          bgcolor: signalEnabled ? signalTokens.surface.planning.bg : undefined,
        }}
      >
        {selectedMetric && (
          <MetricInput
            setSelectedMetric={setSelectedMetric}
            selectedMetric={selectedMetric}
            setInputValue={setInputValue}
            inputValue={inputValue}
            setMetricStateCb={setMetricStateCb}
            selectedDate={selectedDate}
            userId={userId}
            dateMetric={dateMetric}
            customMetricDefs={customMetricDefs}
            bodyweightUnit={bodyweightUnit}
          />
        )}
      </Box>
    </Box>
  </Drawer>
}


export default CalendarBottomDrawer;
