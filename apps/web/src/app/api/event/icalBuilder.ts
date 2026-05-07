import {Event} from '@/generated/prisma/browser';
import {addDays, format} from 'date-fns';

const formatIcalDate = (date: Date): string => format(date, 'yyyyMMdd');

const escapeIcalText = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

const buildVEvent = (event: Event): string => {
  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:forti-event-${event.id}@forti`,
    `DTSTART;VALUE=DATE:${formatIcalDate(event.startDate)}`,
    // iCal DTEND is exclusive, so add 1 day to the inclusive endDate
    `DTEND;VALUE=DATE:${formatIcalDate(addDays(event.endDate, 1))}`,
    `SUMMARY:${escapeIcalText(event.name)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcalText(event.description)}`);
  }

  if (event.recurrenceFrequency) {
    let rrule = `RRULE:FREQ=${event.recurrenceFrequency}`;
    if (event.recurrenceEnd) {
      rrule += `;UNTIL=${formatIcalDate(event.recurrenceEnd)}`;
    }
    lines.push(rrule);
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
};

export const buildIcalString = (events: Event[]): string => {
  const vevents = events.map(buildVEvent).join('\r\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Forti//Forti Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n');
};
