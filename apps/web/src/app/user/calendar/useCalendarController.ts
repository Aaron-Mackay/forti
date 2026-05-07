import { useMemo, useState } from 'react';
import { addDays, isAfter, isBefore, isSameDay, startOfDay } from 'date-fns';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventPrisma, MetricPrisma } from '@/types/dataTypes';
import { EventType } from '@/generated/prisma/browser';
import type { BottomDrawerView } from './Calendar';
import { getEventsOnDate } from './utils';

export type CalendarViewMode = 'calendar' | 'weeks';

type DateRange = { start: Date | null; endExcl: Date | null };

export function useCalendarController(initialEvents: EventPrisma[], initialMetrics: MetricPrisma[]) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('calendar');
  const [eventsInState, setEventsInState] = useState<EventPrisma[]>(initialEvents);
  const [dayMetricsState, setDayMetricsState] = useState<MetricPrisma[]>(initialMetrics);
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const [bottomDrawerView, setBottomDrawerView] = useState<BottomDrawerView>('list');
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [rightDrawerView, setRightDrawerView] = useState<EventType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventPrisma | null>(null);
  const [prefilledDateRange, setPrefilledDateRange] = useState<DateRange>({ start: null, endExcl: null });
  const [calendarUpdatedBanner, setCalendarUpdatedBanner] = useState(false);

  const eventsOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const normalizedSelectedDate = startOfDay(selectedDate);
    return eventsInState.filter((event) => {
      const start = startOfDay(event.startDate);
      const end = event.endDate ? startOfDay(event.endDate) : addDays(start, 1);
      return (
        (isSameDay(normalizedSelectedDate, start) || isAfter(normalizedSelectedDate, start)) &&
        isBefore(normalizedSelectedDate, end)
      );
    });
  }, [selectedDate, eventsInState]);

  function openDay(dateInfo: DateClickArg) {
    const eventsOnDate = getEventsOnDate(dateInfo, eventsInState);
    setSelectedDate(dateInfo.date);
    setPrefilledDateRange({ start: dateInfo.date, endExcl: null });
    setSelectedEvent(eventsOnDate.length === 1 ? eventsOnDate[0] : null);
    setBottomDrawerView('list');
    setBottomDrawerOpen(true);
  }

  function openEventForm(range?: DateRange) {
    setBottomDrawerOpen(true);
    setBottomDrawerView('event-form');
    if (range) setPrefilledDateRange(range);
  }

  function closeBottomDrawer() {
    setBottomDrawerOpen(false);
    setPrefilledDateRange({ start: null, endExcl: null });
  }

  function openRightDrawer(type: EventType) {
    setRightDrawerView(type);
    setRightDrawerOpen(true);
  }

  function closeRightDrawer() {
    setRightDrawerOpen(false);
  }

  return {
    viewMode,
    setViewMode,
    eventsInState,
    setEventsInState,
    dayMetricsState,
    setDayMetricsState,
    bottomDrawerOpen,
    bottomDrawerView,
    setBottomDrawerView,
    rightDrawerOpen,
    rightDrawerView,
    selectedDate,
    selectedEvent,
    setSelectedEvent,
    prefilledDateRange,
    setPrefilledDateRange,
    calendarUpdatedBanner,
    setCalendarUpdatedBanner,
    eventsOnSelectedDate,
    openDay,
    openEventForm,
    closeBottomDrawer,
    openRightDrawer,
    closeRightDrawer,
  };
}
