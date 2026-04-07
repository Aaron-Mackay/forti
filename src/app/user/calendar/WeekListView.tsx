'use client'

import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import {
  addDays,
  addWeeks,
  format,
  getISOWeek,
  isSameDay,
  startOfISOWeek,
  startOfDay,
} from 'date-fns';
import { EventPrisma } from '@/types/dataTypes';
import { EventType } from '@/generated/prisma/browser';
import { getEventColor } from './utils';

type Props = {
  events: EventPrisma[];
  onWeekClick: (weekStart: Date) => void;
  height: string;
  active: boolean;
};

type WeekGroup = {
  monthKey: string;
  monthLabel: string;
  weeks: Date[];
};

function getWeeksInRange(start: Date, end: Date): Date[] {
  const weeks: Date[] = [];
  let current = startOfISOWeek(start);
  while (current <= end) {
    weeks.push(current);
    current = addWeeks(current, 1);
  }
  return weeks;
}

function groupWeeksByMonth(weeks: Date[]): WeekGroup[] {
  const groups: WeekGroup[] = [];
  for (const week of weeks) {
    const monthKey = format(week, 'yyyy-MM');
    const last = groups[groups.length - 1];
    if (!last || last.monthKey !== monthKey) {
      groups.push({
        monthKey,
        monthLabel: format(week, 'MMMM yyyy').toUpperCase(),
        weeks: [week],
      });
    } else {
      last.weeks.push(week);
    }
  }
  return groups;
}

function getBlockEventsForWeek(events: EventPrisma[], weekStart: Date, weekEnd: Date): EventPrisma[] {
  return events.filter(e => {
    if (e.eventType !== EventType.BlockEvent) return false;
    return new Date(e.startDate) < weekEnd && new Date(e.endDate) >= weekStart;
  });
}

function getCustomEventsForWeek(events: EventPrisma[], weekStart: Date, weekEnd: Date): EventPrisma[] {
  return events.filter(e => {
    if (e.eventType !== EventType.CustomEvent) return false;
    return new Date(e.startDate) < weekEnd && new Date(e.endDate) >= weekStart;
  });
}

export default function WeekListView({ events, onWeekClick, height, active }: Props) {
  const today = startOfDay(new Date());
  const currentWeekStart = startOfISOWeek(today);

  // Show 26 weeks before today through 52 weeks after
  const rangeStart = addWeeks(currentWeekStart, -26);
  const rangeEnd = addWeeks(currentWeekStart, 52);

  const weeks = getWeeksInRange(rangeStart, rangeEnd);
  const groups = groupWeeksByMonth(weeks);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentWeekRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  // Scroll to current week the first time the view becomes visible.
  // Use manual scrollTop instead of scrollIntoView — scrollIntoView also
  // scrolls ancestor elements (including the page), which pushes the
  // toggle bar out of view.
  useEffect(() => {
    if (!active || scrolledRef.current) return;
    scrolledRef.current = true;
    const container = containerRef.current;
    const el = currentWeekRef.current;
    if (!container || !el) return;
    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    container.scrollTop += elTop - containerTop - container.clientHeight / 2 + el.clientHeight / 2;
  }, [active]);

  return (
    <Box ref={containerRef} sx={{ overflowY: 'auto', height, pb: 10 }}>
      {groups.map(({ monthKey, monthLabel, weeks: monthWeeks }) => (
        <Box key={monthKey}>
          <Typography
            variant="caption"
            component="div"
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              px: 2,
              py: 0.75,
              bgcolor: 'background.default',
              color: 'text.secondary',
              fontWeight: 700,
              letterSpacing: '0.08em',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            {monthLabel}
          </Typography>

          {monthWeeks.map(weekStart => {
            const weekEnd = addDays(weekStart, 7);
            const isCurrentWeek = isSameDay(weekStart, currentWeekStart);
            const blockEvents = getBlockEventsForWeek(events, weekStart, weekEnd);
            const customEvents = getCustomEventsForWeek(events, weekStart, weekEnd);
            const primaryBlock = blockEvents[0] ?? null;
            const blockColor = primaryBlock ? getEventColor(primaryBlock) : undefined;
            const weekNum = getISOWeek(weekStart);
            const dateRange = `${format(weekStart, 'MMM d')} – ${format(addDays(weekEnd, -1), 'MMM d')}`;

            return (
              <Box
                key={weekStart.toISOString()}
                ref={isCurrentWeek ? currentWeekRef : undefined}
                onClick={() => onWeekClick(weekStart)}
                sx={{
                  mx: 2,
                  my: 1,
                  p: 1.5,
                  borderRadius: 2,
                  cursor: 'pointer',
                  bgcolor: isCurrentWeek ? 'action.selected' : 'background.paper',
                  borderLeft: `4px solid ${blockColor ?? 'transparent'}`,
                  boxShadow: isCurrentWeek ? 2 : 1,
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: isCurrentWeek ? 'action.selected' : 'action.hover' },
                }}
              >
                <Typography variant="body2" fontWeight={isCurrentWeek ? 700 : 500}>
                  W{weekNum} · {dateRange}
                  {isCurrentWeek && (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ ml: 1, color: 'primary.main', fontWeight: 700 }}
                    >
                      This week
                    </Typography>
                  )}
                </Typography>
                {primaryBlock && (
                  <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mt: 0.25 }}>
                    {primaryBlock.name}
                  </Typography>
                )}
                {customEvents.map(e => (
                  <Typography key={e.id} variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                    • {e.name}
                  </Typography>
                ))}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
