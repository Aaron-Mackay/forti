'use client'

import {DayMetricPrisma, EventPrisma} from "@/types/dataTypes";
import FullCalendar from "@fullcalendar/react";
import multiMonthPlugin from "@fullcalendar/multimonth";
import interactionPlugin, {DateClickArg} from "@fullcalendar/interaction";
import React, {useEffect, useMemo, useRef, useState} from "react";
import './calendar.css'
import {Alert, Box, Collapse, Fab, ToggleButton, ToggleButtonGroup} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewListIcon from '@mui/icons-material/ViewList';
import CalendarBottomDrawer from "./CalendarBottomDrawer";
import CustomAppBar, {APPBAR_HEIGHT} from "@/components/CustomAppBar";
import {format, isAfter, isBefore, isSameDay} from 'date-fns';
import {getEventsOnDate, parsedEvents} from "@/app/user/calendar/utils";
import {EventType} from "@prisma/client";
import {CalendarRightDrawer} from "@/app/user/calendar/CalendarRightDrawer";
import {getDayMetricsCache, getEventsCache, saveDayMetricsCache, saveEventsCache} from "@/utils/clientDb";
import {useOfflineCache} from '@lib/hooks/useOfflineCache';
import WeekListView from "@/app/user/calendar/WeekListView";

type CalendarViewMode = 'calendar' | 'weeks';

const TOGGLE_HEIGHT = 44;

export type BottomDrawerView = 'list' | 'details' | 'event-form' | 'daymetric-form';

type Props = {
  events: EventPrisma[];
  dayMetrics: DayMetricPrisma[];
  userId: string
};


export default function Calendar({events, dayMetrics, userId}: Props) {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [viewMode, setViewMode] = useState<CalendarViewMode>('calendar');
  const [eventsInState, setEventsInState] = useState<EventPrisma[]>(events);

  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const [bottomDrawerView, setBottomDrawerView] = useState<BottomDrawerView>('list');

  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const [rightDrawerView, setRightDrawerView] = useState<EventType | null>(null)

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventPrisma | null>(null);
  const [dayMetricsState, setDayMetricsState] = useState<DayMetricPrisma[]>(dayMetrics);
  const [calendarUpdatedBanner, setCalendarUpdatedBanner] = useState(false);
  const [prefilledDateRange, setPrefilledDateRange] =
    useState<{ start: Date | null, endExcl: Date | null }>({start: null, endExcl: null})

  // On mount: if offline, restore cached state; if online, prime the cache.
  useOfflineCache(userId, eventsInState, setEventsInState, getEventsCache, saveEventsCache);
  useOfflineCache(userId, dayMetricsState, setDayMetricsState, getDayMetricsCache, saveDayMetricsCache);

  // On reconnect: re-fetch calendar data; show banner if events changed.
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const response = await fetch('/api/calendar-data');
        if (!response.ok) return;
        const {events: freshEvents, dayMetrics: freshDayMetrics} = await response.json();
        const eventsChanged = freshEvents.length !== eventsInState.length ||
          freshEvents.some((e: EventPrisma, i: number) => e.id !== eventsInState[i]?.id);
        setEventsInState(freshEvents);
        setDayMetricsState(freshDayMetrics);
        await Promise.all([
          saveEventsCache(userId, freshEvents),
          saveDayMetricsCache(userId, freshDayMetrics),
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
      <CustomAppBar title={"Calendar"}/>
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
          <ToggleButton value="calendar">
            <CalendarMonthIcon fontSize="small" sx={{mr: 0.5}}/>
            Calendar
          </ToggleButton>
          <ToggleButton value="weeks">
            <ViewListIcon fontSize="small" sx={{mr: 0.5}}/>
            Weeks
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Calendar view (kept mounted to preserve state) */}
      <Box sx={{display: viewMode === 'calendar' ? 'block' : 'none'}}>
        <FullCalendar
          ref={calendarRef}
          plugins={[multiMonthPlugin, interactionPlugin]}
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
        />
      </Box>
      <Box sx={{
        position: 'absolute',
        bottom: 25,
        left: 25,
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
        dateDayMetrics={
          selectedDate &&
          dayMetricsState.find(dm => isSameDay(dm.date, selectedDate))
        }
        setDayMetricsStateCb={
          (date, newMetrics: DayMetricPrisma | null) => {
            setDayMetricsState((prev: DayMetricPrisma[]): DayMetricPrisma[] => {
              if (!newMetrics) return prev;
              const index = prev.findIndex(m => isSameDay(m.date, date));
              if (index === -1) { // if no metrics for this date, add new metrics
                return [...prev, {...newMetrics, date}];
              }
              return prev.map(metric =>
                isSameDay(metric.date, date) ? {...metric, ...newMetrics} : metric
              );
            });
          }
        }
        userId={userId}
        prefilledDateRange={prefilledDateRange}
        setPrefilledDateRange={setPrefilledDateRange}
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