import {addDays, differenceInDays, format, getISOWeek, subDays} from "date-fns";
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

export const toInclusiveEndDate = (exclusiveEndDate: Date): Date => subDays(exclusiveEndDate, 1);

export const toExclusiveEndDate = (inclusiveEndDate: Date): Date => addDays(inclusiveEndDate, 1);

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
        duration: { days: differenceInDays(event.endDate, event.startDate) },
      };
    }

    return {
      ...base,
      start: event.startDate,
      end: event.endDate,
    };
  });
}

export const getEventsOnDate = (dateInfo: DateClickArg, eventsInState: EventPrisma[]): EventPrisma[] => {
  const clickedDate = dateInfo.date;
  return eventsInState.filter(event => {
    const start = event.startDate;
    const end = event.endDate ?? addDays(start, 1);
    return start && end && start <= clickedDate && clickedDate < end;
  });
}

export const dateRangesOverlap = (
  rangeAStart: Date,
  rangeAEnd: Date | null,
  rangeBStart: Date,
  rangeBEnd: Date | null,
): boolean => {
  const rangeAEndTime = rangeAEnd ? rangeAEnd.getTime() : Number.POSITIVE_INFINITY;
  const rangeBEndTime = rangeBEnd ? rangeBEnd.getTime() : Number.POSITIVE_INFINITY;
  return rangeAStart.getTime() < rangeBEndTime && rangeBStart.getTime() < rangeAEndTime;
}

export const eventOccursInYear = (event: EventPrisma, year: number): boolean => {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  if (event.recurrenceFrequency) {
    return dateRangesOverlap(
      event.startDate,
      event.recurrenceEnd,
      yearStart,
      yearEnd,
    );
  }

  return dateRangesOverlap(
    event.startDate,
    event.endDate,
    yearStart,
    yearEnd,
  );
}
const eventDateKey = (date: Date | null): string => date ? format(date, 'yyyy-MM-dd') : '';

const eventContentKey = (event: EventPrisma): string => [
  event.id,
  eventDateKey(event.startDate),
  eventDateKey(event.endDate),
  event.name,
  event.recurrenceFrequency ?? '',
  eventDateKey(event.recurrenceEnd),
  event.blockSubtype ?? '',
  event.eventType,
].join('|');

export const hasMeaningfulEventChanges = (currentEvents: EventPrisma[], freshEvents: EventPrisma[]): boolean => {
  if (currentEvents.length !== freshEvents.length) return true;

  const currentKeys = currentEvents.map(eventContentKey).sort();
  const freshKeys = freshEvents.map(eventContentKey).sort();

  return currentKeys.some((key, index) => key !== freshKeys[index]);
};

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
