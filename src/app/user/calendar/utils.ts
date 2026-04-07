import {addDays, differenceInDays, format, getISOWeek} from "date-fns";
import {BlockSubtype, EventType} from "@/generated/prisma/browser";
import {EventPrisma} from "@/types/dataTypes";
import {DateClickArg} from "@fullcalendar/interaction";

export const minToHhMm = (timeInMinutes: number): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(timeInMinutes / 60);
  const m = timeInMinutes % 60;
  return `${pad(h)}:${pad(m)}`;
}
export const hhMmToMin = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export const dateAndWeek = (date: Date) => {
  const typedDate: Date = typeof date === "string" ? new Date(date) : date
  return `${typedDate.toDateString()} (Wk ${getISOWeek(typedDate)})`
}
export const getDefinedBlockColor = (blockSubtype: BlockSubtype): string => {
  const BLOCK_COLORS: Record<BlockSubtype, string> = {
    Bulk: 'green',
    Cut: 'lightblue',
    Maintenance: 'pink',
    Deload: 'lightgreen',
    Prep: 'purple',
    Refeed: 'orange',
    Custom: 'purple',
  };

  return BLOCK_COLORS[blockSubtype] || 'gray'
}
export const getEventColor = (event: EventPrisma): string | undefined => {
  if (event.eventType === EventType.CustomEvent) return undefined;
  if (event.customColor) return event.customColor;
  if (event.blockSubtype) return getDefinedBlockColor(event.blockSubtype);
  return undefined;
};

type FullCalendarBaseProps = {
  id: string,
  allDay: boolean,
  title: string,
  color?: string,
  display: string,
  extendedProps: { eventType: EventType, blockSubtype: BlockSubtype | null },
}

type FullCalendarRegularEvent = FullCalendarBaseProps & {
  start: Date,
  end: Date,
}

type FullCalendarRruleEvent = FullCalendarBaseProps & {
  rrule: string,       // "DTSTART:YYYYMMDD\nRRULE:FREQ=WEEKLY;UNTIL=YYYYMMDD"
  duration: { days: number },
}

type FullCalendarIngestableEvent = FullCalendarRegularEvent | FullCalendarRruleEvent;

const formatIcalDate = (date: Date): string => format(date, 'yyyyMMdd');

export const parsedEvents = (events: EventPrisma[]): FullCalendarIngestableEvent[] => {
  return events.map(event => {
    const base: FullCalendarBaseProps = {
      allDay: true,
      title: event.name,
      id: event.id.toString(),
      color: getEventColor(event),
      display: event.eventType === EventType.CustomEvent ? 'auto' : 'background',
      extendedProps: {eventType: event.eventType, blockSubtype: event.blockSubtype},
    };

    if (event.recurrenceFrequency) {
      let rrule = `DTSTART:${formatIcalDate(event.startDate)}\nRRULE:FREQ=${event.recurrenceFrequency}`;
      if (event.recurrenceEnd) {
        rrule += `;UNTIL=${formatIcalDate(event.recurrenceEnd)}`;
      }
      return {
        ...base,
        rrule,
        duration: { days: differenceInDays(event.endDate, event.startDate) + 1 },
      };
    }

    return {
      ...base,
      start: event.startDate,
      end: addDays(event.endDate, 1), // FullCalendar uses exclusive end
    };
  });
}

export const getEventsOnDate = (dateInfo: DateClickArg, eventsInState: EventPrisma[]): EventPrisma[] => {
  const clickedDate = dateInfo.date;
  return eventsInState.filter(event => {
    const start = event.startDate;
    const end = event.endDate ?? start;
    return start && end && start <= clickedDate && clickedDate < end;
  });
}

const colorCache = new Map<string, string>();

export function withOpacity(colorName: string, opacity: number): string {
  const cacheKey = `${colorName}_${opacity}`;
  if (colorCache.has(cacheKey)) return colorCache.get(cacheKey)!;

  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return colorName;

  ctx.fillStyle = colorName;
  const computed = ctx.fillStyle;

  // Try rgb format
  let match = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (match) {
    const [_, r, g, b] = match;
    const rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    colorCache.set(cacheKey, rgba);
    return rgba;
  }

  // Try hex format (#rrggbb)
  match = computed.match(/^#([0-9a-f]{6})$/i);
  if (match) {
    const hex = match[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    colorCache.set(cacheKey, rgba);
    return rgba;
  }

  // If format is not recognized, return the original color
  return colorName;
}