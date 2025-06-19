'use client'

import React, {useEffect, useRef, useState} from 'react';
import {Box} from '@mui/material';
import {format, getWeek, getYear, startOfWeek} from 'date-fns';
import {EventPrisma} from "@/types/dataTypes";
import {generateWeeks, getMonthLabels} from './calendarUtils';
import MonthHeader from './MonthHeader';
import WeekRow from './WeekRow';
import {Loading} from "@/app/user/[userId]/calendar/Loading";

type Props = {
  events: EventPrisma[];
};

const rowHeight = 60;
const monthHeaderHeight = 32;

export default function Calendar({events}: Props) {
  console.log(events)
  const [isScrolledToCurrentWeek, setIsScrolledToCurrentWeek] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const currentWeek = getWeek(today, {weekStartsOn: 1}); // ISO week number
  const startDate = startOfWeek(new Date(getYear(today), 0, 4), {weekStartsOn: 1}); // Start of ISO week 1

  const weeks = generateWeeks(startDate, 52);
  const monthLabels = getMonthLabels(weeks);

  // State to track the current month label
  const [currentMonth, setCurrentMonth] = useState(format(weeks[currentWeek - 1][0], 'MMMM yyyy'));

  // scrolls to current week
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const totalHeight = weeks.length * rowHeight + monthHeaderHeight * Object.keys(monthLabels).length;
      const heightFromPastMonthHeaders = Object.values(monthLabels).filter(idx => idx < currentWeek).length * monthHeaderHeight;
      const desiredScrollTop = (currentWeek) * (rowHeight) + heightFromPastMonthHeaders - container.clientHeight / 2 + rowHeight / 2;
      const maxScrollTop = Math.max(0, totalHeight - container.clientHeight);
      container.scrollTop = Math.max(0, Math.min(desiredScrollTop, maxScrollTop));
      setIsScrolledToCurrentWeek(true)
    }
  }, []);

  // Update currentMonth as user scrolls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Precompute offsets for each week
    const weekOffsets = weeks.map((_, i) => {
      // Count how many month headers appear before this week
      const monthHeadersBefore = Object.values(monthLabels).filter(idx => idx < i).length;
      return i * rowHeight + monthHeadersBefore * monthHeaderHeight;
    });

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      // Find the last week whose offset is <= scrollTop
      let weekIndex = 0;
      for (let i = 0; i < weekOffsets.length; i++) {
        if (weekOffsets[i] <= scrollTop) {
          weekIndex = i;
        } else {
          break;
        }
      }
      const week = weeks[weekIndex] || weeks[0];
      setCurrentMonth(format(week[0], 'MMMM yyyy'));
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [weeks, monthLabels]);

  return (
    <Box
      sx={{
        height: '98dvh',
        width: '98dvw',
        overflowY: 'auto',
        backgroundColor: '#f4f4f4',
        position: 'fixed',
        top: "1dvh",
        left: "1dvw",
        zIndex: 1,
      }}
      ref={containerRef}
      data-testid="calendar-container"
    >
      {!isScrolledToCurrentWeek && (
        <Loading/>
      )}
      <Box visibility={!isScrolledToCurrentWeek ? 'hidden' : 'visible'}>
        {/* Single sticky header for the current month */}
        <MonthHeader month={currentMonth} height={monthHeaderHeight} sticky showDaysOfWeek/>

        {weeks.map((week, i) => {
          // Determine if this week is the first week of a new month
          const month = format(week[0], 'MMMM yyyy');
          const isFirstOfMonth = monthLabels[month] === i;

          return (
            <React.Fragment key={i}>
              {isFirstOfMonth && <MonthHeader height={monthHeaderHeight} month={month}/>}
              <WeekRow week={week} isCurrentWeek={i + 1 === currentWeek} rowHeight={rowHeight}/>
            </React.Fragment>
          );
        })
        }
      </Box>
    </Box>
  )
}