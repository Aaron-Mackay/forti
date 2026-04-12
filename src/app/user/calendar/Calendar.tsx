'use client'

import {MetricPrisma, EventPrisma} from "@/types/dataTypes";
import FullCalendar from "@fullcalendar/react";
import multiMonthPlugin from "@fullcalendar/multimonth";
import interactionPlugin, {DateClickArg} from "@fullcalendar/interaction";
import rrulePlugin from "@fullcalendar/rrule";
import React, {useEffect, useMemo, useRef, useState} from "react";
import './calendar.css'
import {Alert, Box, Collapse, Fab, ToggleButton, ToggleButtonGroup, useMediaQuery, useTheme} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewListIcon from '@mui/icons-material/ViewList';
import CalendarBottomDrawer from "./CalendarBottomDrawer";
import {APPBAR_HEIGHT, DRAWER_WIDTH} from "@/components/CustomAppBar";
import { useAppBar } from '@lib/providers/AppBarProvider';
import {format, isAfter, isBefore, isSameDay} from 'date-fns';
import {getEventsOnDate, parsedEvents} from "@/app/user/calendar/utils";
import {EventType} from "@/generated/prisma/browser";
import {CalendarRightDrawer} from "@/app/user/calendar/CalendarRightDrawer";
import {getMetricsCache, getEventsCache, saveMetricsCache, saveEventsCache} from "@/utils/clientDb";
import {useOfflineCache} from '@lib/hooks/useOfflineCache';
import WeekListView from "@/app/user/calendar/WeekListView";
import {useSettings} from '@lib/providers/SettingsProvider';

type CalendarViewMode = 'calendar' | 'weeks';

const TOGGLE_HEIGHT = 44;

export type BottomDrawerView = 'list' | 'details' | 'event-form' | 'daymetric-form';

type Props = {
  events: EventPrisma[];
  metrics: MetricPrisma[];
  userId: string
};


export default function Calendar({events, metrics, userId}: Props) {
  useAppBar({ title: 'Calendar' });
  const calendarRef = useRef<FullCalendar | null>(null);
  const { settings } = useSettings();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const [viewMode, setViewMode] = useState<CalendarViewMode>('calendar');
  const [eventsInState, setEventsInState] = useState<EventPrisma[]>(events);

  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const [bottomDrawerView, setBottomDrawerView] = useState<BottomDrawerView>('list');

  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const [rightDrawerView, setRightDrawerView] = useState<EventType | null>(null)

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventPrisma | null>(null);
  const [dayMetricsState, setDayMetricsState] = useState<MetricPrisma[]>(metrics);
  const [calendarUpdatedBanner, setCalendarUpdatedBanner] = useState(false);
  const [prefilledDateRange, setPrefilledDateRange] =
    useState<{ start: Date | null, endExcl: Date | null }>({start: null, endExcl: null})

  // On mount: if offline, restore cached state; if online, prime the cache.
  useOfflineCache(userId, eventsInState, setEventsInState, getEventsCache, saveEventsCache);
  useOfflineCache(userId, dayMetricsState, setDayMetricsState, getMetricsCache, saveMetricsCache);

  // On reconnect: re-fetch calendar data; show banner if events changed.
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const response = await fetch('/api/calendar-data');
        if (!response.ok) return;
        const {events: freshEvents, metrics: freshMetrics} = await response.json();
        const eventsChanged = freshEvents.length !== eventsInState.length ||
          freshEvents.some((e: EventPrisma, i: number) => e.id !== eventsInState[i]?.id);
        setEventsInState(freshEvents);
        setDayMetricsState(freshMetrics);
        await Promise.all([
          saveEventsCache(userId, freshEvents),
          saveMetricsCache(userId, freshMetrics),
        ]).catch(console.error);
        if (eventsChanged) setCalendarUpdatedBanner(true);
      } catch {
        // Server unreachable — stay with local state
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const eventsOnSelectedDate: EventPrisma[] = useMemo(() => {
    if (!selectedDate) return [];
    return eventsInState.filter(event => {
      const start = event.startDate;
      const end = event.endDate ?? start;
      return (
        (isSameDay(selectedDate, start) || isAfter(selectedDate, start)) &&
        isBefore(selectedDate, end)
      );
    });
  }, [selectedDate, eventsInState]);

  const handleFabCreateClick = () => {
    setBottomDrawerView('event-form');
    setBottomDrawerOpen(true);
  }

  const handleDateSelect = (dateInfo: DateClickArg) => {
    const eventsOnDate = getEventsOnDate(dateInfo, eventsInState);

    setSelectedDate(dateInfo.date);
    setPrefilledDateRange({start: dateInfo.date, endExcl: null})
    setSelectedEvent(eventsOnDate.length === 1 ? eventsOnDate[0] : null);
    setBottomDrawerView('list');
    setBottomDrawerOpen(true);
  }

  const handleDateRangeSelect = (start: Date, endExcl: Date) => {
    setBottomDrawerOpen(true)
    setBottomDrawerView('event-form')
    setPrefilledDateRange({start, endExcl})
  }

  const handleTodayButtonClick = () => {
    scrollToDate(new Date())
  };

  const scrollToDate = (date: Date) => {
    if (!calendarRef.current) return
    calendarRef.current.getApi().gotoDate(date);
    setTimeout(() => {
      // FullCalendar uses ISO date strings for day cell class names
      const isoDate = format(date, "yyyy-MM-dd");
      // Try to find the cell for the given date
      const cell = document.querySelector(`.fc-day[data-date="${isoDate}"]`);
      if (cell) {
        cell.scrollIntoView({behavior: 'smooth', block: 'center'});
      }
    }, 0);
  };

  const handleWeekClick = (weekStart: Date) => {
    setViewMode('calendar');
    // Double rAF lets the display change take effect before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToDate(weekStart);
      });
    });
  };

  return (
    <>
      <Collapse in={calendarUpdatedBanner}>
        <Alert
          severity="info"
          onClose={() => setCalendarUpdatedBanner(false)}
          sx={{borderRadius: 0}}
        >
          Your calendar was updated while you were offline — showing the latest version.
        </Alert>
      </Collapse>
      {/* View toggle */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: TOGGLE_HEIGHT,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_e, val) => { if (val) setViewMode(val); }}
          size="small"
        >
          <ToggleButton value="calendar" aria-label="Calendar view">
            <CalendarMonthIcon fontSize="small"/>
          </ToggleButton>
          <ToggleButton value="weeks" aria-label="Weeks view">
            <ViewListIcon fontSize="small"/>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Calendar view (kept mounted to preserve state) */}
      <Box sx={{display: viewMode === 'calendar' ? 'block' : 'none'}}>
        <FullCalendar
          ref={calendarRef}
          plugins={[multiMonthPlugin, interactionPlugin, rrulePlugin]}
          initialView="multiMonthYear"
          firstDay={1}
          multiMonthMaxColumns={1}
          height={`calc(100dvh - ${APPBAR_HEIGHT}px - ${TOGGLE_HEIGHT}px)`}
          selectable={true}
          selectLongPressDelay={400}
          dateClick={(dateInfo) => handleDateSelect(dateInfo)}
          select={({start, end}) => handleDateRangeSelect(start, end)}
          dayCellDidMount={(info) => {
            const el = document.createElement("div");
            el.className = "custom-dot";
            el.innerText = "•";
            info.el.querySelector('.fc-daygrid-day-top')?.appendChild(el);
          }}
          events={parsedEvents(eventsInState)}
          headerToolbar={{
            left: 'title',
            center: '',
            right: 'myTodayButton prev,next'
          }}
          customButtons={{
            myTodayButton: {
              text: 'Today',
              click: handleTodayButtonClick
            }
          }}
        />
      </Box>

      {/* Week list view (kept mounted to preserve scroll position) */}
      <Box sx={{display: viewMode === 'weeks' ? 'block' : 'none'}}>
        <WeekListView
          events={eventsInState}
          onWeekClick={handleWeekClick}
          height={`calc(100dvh - ${APPBAR_HEIGHT}px - ${TOGGLE_HEIGHT}px)`}
          active={viewMode === 'weeks'}
        />
      </Box>
      <Box sx={{
        position: 'absolute',
        bottom: 25,
        left: isDesktop ? DRAWER_WIDTH + 25 : 25,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 1
      }}>
        {eventsInState.filter(event => event.eventType === EventType.CustomEvent).length
          && <Fab variant="extended" size="medium" onClick={() => {
            setRightDrawerView(EventType.CustomEvent);
            setRightDrawerOpen(true);
          }}>
            Events
          </Fab>}
        {eventsInState.filter(event => event.eventType === EventType.BlockEvent).length
          && <Fab variant="extended" size="medium" onClick={() => {
            setRightDrawerView(EventType.BlockEvent);
            setRightDrawerOpen(true);
          }}>
            Blocks
          </Fab>}

      </Box>
      <Fab color="primary" aria-label="add" onClick={handleFabCreateClick}
           sx={{position: "absolute", bottom: 25, right: 25}}>
        <AddIcon/>
      </Fab>
      <CalendarBottomDrawer
        setEventsInState={setEventsInState}
        open={bottomDrawerOpen}
        drawerView={bottomDrawerView}
        setDrawerView={setBottomDrawerView}
        selectedDate={selectedDate}
        selectedEvent={selectedEvent}
        setSelectedEvent={setSelectedEvent}
        eventsOnSelectedDate={eventsOnSelectedDate}
        setDrawerOpen={setBottomDrawerOpen}
        dateMetric={
          selectedDate &&
          dayMetricsState.find(dm => isSameDay(dm.date, selectedDate))
        }
        setMetricStateCb={
          (date, newMetric: MetricPrisma | null) => {
            setDayMetricsState((prev: MetricPrisma[]): MetricPrisma[] => {
              if (!newMetric) return prev;
              const index = prev.findIndex(m => isSameDay(m.date, date));
              if (index === -1) { // if no metrics for this date, add new metrics
                return [...prev, {...newMetric, date}];
              }
              return prev.map(metric =>
                isSameDay(metric.date, date) ? {...metric, ...newMetric} : metric
              );
            });
          }
        }
        userId={userId}
        prefilledDateRange={prefilledDateRange}
        setPrefilledDateRange={setPrefilledDateRange}
        customMetricDefs={settings.customMetrics}
      />
      <CalendarRightDrawer
        rightDrawerOpen={rightDrawerOpen}
        setRightDrawerOpen={setRightDrawerOpen}
        rightDrawerView={rightDrawerView}
        eventsInState={eventsInState}
        setBottomDrawerOpen={setBottomDrawerOpen}
        setBottomDrawerView={setBottomDrawerView}
        setSelectedEvent={setSelectedEvent}
        year={calendarRef.current?.getApi().view.currentStart.getFullYear()}
        scrollToDate={scrollToDate}
      />
    </>
  )
}
