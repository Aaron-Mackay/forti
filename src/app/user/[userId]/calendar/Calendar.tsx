'use client'

import {DayMetricPrisma, EventPrisma} from "@/types/dataTypes";
import FullCalendar from "@fullcalendar/react";
import multiMonthPlugin from "@fullcalendar/multimonth";
import interactionPlugin, {DateClickArg} from "@fullcalendar/interaction";
import React, {RefObject, useMemo, useRef, useState} from "react";
import './calendar.css'
import {EventApi} from "@fullcalendar/core";
import {Fab} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import {BlockSubtype, EventType} from "@prisma/client";
import CalendarDrawer from "./CalendarDrawer";
import CustomAppBar from "@/components/CustomAppBar";
import {addDays, isSameDay} from 'date-fns';

export type DrawerView = 'list' | 'details' | 'event-form' | 'daymetric-form';

type Props = {
  events: EventPrisma[];
  dayMetrics: DayMetricPrisma[];
  userId: string
};

type FullCalendarIngestableEvent = {
  allDay: boolean,
  title: string,
  start: Date,
  end: Date,
  id: string,
  color?: string,
  display: string
}

export default function Calendar({events, dayMetrics, userId}: Props) {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [eventsInState, setEventsInState] = useState<EventPrisma[]>(events);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerView, setDrawerView] = useState<DrawerView>('list');
  const [selectedEvent, setSelectedEvent] = useState<EventApi | null>(null);
  const [dayMetricsState, setDayMetricsState] = useState<DayMetricPrisma[]>(dayMetrics);
  const [prefilledDateRange, setPrefilledDateRange] =
    useState<{ start: Date | null, endExcl: Date | null }>({start: null, endExcl: null})

  const eventsOnSelectedDate = useMemo(() => {
    if (!selectedDate || !calendarRef.current) return [];
    return calendarRef.current.getApi().getEvents().filter(event => {
      const start = event.start;
      const end = event.end ?? start;
      return start && end && start <= selectedDate && selectedDate < end;
    });
  }, [selectedDate]);

  const handleFabCreateClick = () => {
    setDrawerView('event-form');
    setDrawerOpen(true);
  }

  const handleDateSelect = (dateInfo: DateClickArg, calendarRef: RefObject<FullCalendar | null>) => {
    const eventsOnDate = getEventsOnDate(dateInfo, calendarRef);

    setSelectedDate(dateInfo.date);
    setPrefilledDateRange({start: dateInfo.date, endExcl: null})
    console.log(eventsOnDate)
    setSelectedEvent(eventsOnDate.length === 1 ? eventsOnDate[0] : null);
    setDrawerView('list');
    setDrawerOpen(true);
  }

  const handleDateRangeSelect = (start: Date, endExcl: Date) => {
    setDrawerOpen(true)
    setDrawerView('event-form')
    setPrefilledDateRange({start, endExcl})

    // todo open create event drawer, with start and end dates prefilled
  }

  const handleTodayButtonClick = () => {
    if (!calendarRef.current) return
    calendarRef.current.getApi().gotoDate(new Date());
    setTimeout(() => {
      const todayCell = document.querySelector('.fc-day-today');
      if (todayCell) {
        todayCell.scrollIntoView({behavior: 'smooth', block: 'center'});
      }
    }, 0);
  };

  return (
    <>
      <CustomAppBar title={"Calendar"} showBack/>
      <FullCalendar
        ref={calendarRef}
        plugins={[multiMonthPlugin, interactionPlugin]}
        initialView="multiMonthYear"
        firstDay={1}
        multiMonthMaxColumns={1}
        height={"calc(100dvh - 56px)"}
        editable={true}
        selectable={true}
        selectLongPressDelay={400}
        dateClick={(dateInfo) => handleDateSelect(dateInfo, calendarRef)}
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
      <Fab color="primary" aria-label="add" onClick={handleFabCreateClick}
           sx={{position: "absolute", bottom: 25, right: 25}}>
        <AddIcon/>
      </Fab>
      <CalendarDrawer
        setEventsInState={setEventsInState}
        open={drawerOpen}
        drawerView={drawerView}
        setDrawerView={setDrawerView}
        selectedDate={selectedDate}
        selectedEvent={selectedEvent}
        setSelectedEvent={setSelectedEvent}
        eventsOnSelectedDate={eventsOnSelectedDate}
        setDrawerOpen={setDrawerOpen}
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
    </>
  )
}

const getDefinedBlockColor = (blockSubtype: BlockSubtype): string => {
  // todo pick readable colors
  const BLOCK_COLORS: Record<BlockSubtype, string> = {
    Bulk: 'green',
    Cut: 'yellow',
    Maintenance: 'darkgreen',
    Deload: 'lightblue',
    Prep: 'red',
    Refeed: 'orange',
    Custom: 'purple',
  };

  return BLOCK_COLORS[blockSubtype] || 'gray'
}

const getEventColor = (event: EventPrisma): string | undefined => {
  if (event.eventType === EventType.CustomEvent) return undefined;
  if (event.customColor) return event.customColor;
  if (event.blockSubtype) return getDefinedBlockColor(event.blockSubtype);
  return undefined;
};

const parsedEvents = (events: EventPrisma[]): FullCalendarIngestableEvent[] => {
  return events.map(event => {
    return {
      allDay: true,
      title: event.name,
      start: event.startDate,
      end: addDays(event.endDate,1), // add day as end is natively exclusive
      id: event.id.toString(),
      color: getEventColor(event),
      display: event.eventType === EventType.CustomEvent ? 'auto' : 'background'
    }
  })
}

const getEventsOnDate = (dateInfo: DateClickArg, calendarRef: RefObject<FullCalendar | null>): EventApi[] => {
  const clickedDate = dateInfo.date;
  const calendarApi = calendarRef.current?.getApi();
  if (!calendarApi) return [];
  return calendarApi.getEvents().filter(event => {
    const start = event.start;
    const end = event.end ?? start;
    return start && end && start <= clickedDate && clickedDate < end;
  });
}