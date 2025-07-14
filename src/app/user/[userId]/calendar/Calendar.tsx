'use client'

import {DayMetricPrisma, EventPrisma} from "@/types/dataTypes";
import FullCalendar from "@fullcalendar/react";
import multiMonthPlugin from "@fullcalendar/multimonth";
import interactionPlugin, {DateClickArg} from "@fullcalendar/interaction";
import React, {RefObject, useMemo, useRef, useState} from "react";
import './calendar.css'
import {EventApi} from "@fullcalendar/core";
import {SpeedDial, SpeedDialAction, SpeedDialIcon} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import {EventType} from "@prisma/client";
import CalendarDrawer from "./CalendarDrawer";
import CustomAppBar from "@/components/CustomAppBar";
import {isSameDay} from 'date-fns';

export type DrawerView = 'list' | 'details' | 'event-form' | 'daymetric-form';

type Props = {
  events: EventPrisma[];
  dayMetrics: DayMetricPrisma[];
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

export default function Calendar({events, dayMetrics}: Props) {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerView, setDrawerView] = useState<DrawerView>('list');
  const [selectedEvent, setSelectedEvent] = useState<EventApi | null>(null);
  const [dayMetricsState, setDayMetricsState] = useState<DayMetricPrisma[]>(dayMetrics);

  const eventsOnSelectedDate = useMemo(() => {
    if (!selectedDate || !calendarRef.current) return [];
    return calendarRef.current.getApi().getEvents().filter(event => {
      const start = event.start;
      const end = event.end ?? start;
      return start && end && start <= selectedDate && selectedDate < end;
    });
  }, [selectedDate]);

  const handleDateClick = (dateInfo: DateClickArg, calendarRef: RefObject<FullCalendar | null>) => {
    const events = getEventsOnDate(dateInfo, calendarRef);

    setSelectedDate(dateInfo.date);
    setSelectedEvent(events.length === 1 ? events[0] : null);
    setDrawerView('list');
    setDrawerOpen(true);
  }

  // const handleFabCreateClick = () => {
  //   setDrawerView('event-form');
  //   setDrawerOpen(true);
  // }

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

  const actions = [
    {icon: <AddIcon/>, name: 'Copy'},
    {icon: <AddIcon/>, name: 'Save'},
    {icon: <AddIcon/>, name: 'Print'},
    {icon: <AddIcon/>, name: 'Share'},
  ];

  return (
    <>
      <CustomAppBar title={"Calendar"} showBack/>
      <FullCalendar
        ref={calendarRef}
        plugins={[multiMonthPlugin, interactionPlugin]}
        initialView="multiMonthYear"
        multiMonthMaxColumns={1}
        height={"calc(100dvh - 56px)"}
        editable={true}
        selectable={true}
        selectLongPressDelay={400}
        dateClick={(dateInfo) => handleDateClick(dateInfo, calendarRef)}
        select={({start, end}) => createEvent(start, end)}
        dayCellDidMount={(info) => {
          const el = document.createElement("div");
          el.className = "custom-dot";
          el.innerText = "•";
          info.el.querySelector('.fc-daygrid-day-top')?.appendChild(el);
        }}
        events={parsedEvents(events)}
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
      {/*<Fab color="primary" aria-label="add" onClick={handleFabCreateClick}*/}
      {/*     sx={{position: "absolute", bottom: 25, right: 25}}>*/}
      {/*  <AddIcon/>*/}
      {/*</Fab>*/}
      <SpeedDial
        ariaLabel="SpeedDial basic example"
        sx={{position: 'absolute', bottom: 16, right: 16}}
        icon={<SpeedDialIcon/>}
      >
        <SpeedDialAction
          key={actions[0].name}
          icon={actions[0].icon}
          slotProps={
            {
              tooltip: {
                open: true,
                title: actions[0].name
              }
            }
          }
        />
      </SpeedDial>
      <CalendarDrawer
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
      />
    </>
  )
}

const parsedEvents = (events: EventPrisma[]): FullCalendarIngestableEvent[] => {
  return events.map(event => {
    return {
      allDay: true,
      title: event.name,
      start: event.startDate,
      end: event.endDate,
      id: event.id.toString(),
      color: event.color || undefined,
      display: event.eventType === EventType.CustomEvent ? 'auto' : 'background'
    }
  })
}

const createEvent = (start: Date, end?: Date) => {
  if (typeof end === "undefined") {
    end = start
  }

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

// TODO set up create form, extract drawer out