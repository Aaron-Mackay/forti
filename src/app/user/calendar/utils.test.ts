import {describe, expect, it} from 'vitest';
import {BlockSubtype, EventType} from '@/generated/prisma/browser';
import type {EventPrisma} from '@/types/dataTypes';
import {
  eventOccursInYear,
  getEventsOnDate,
  parsedEvents,
  toExclusiveEndDate,
  toInclusiveEndDate,
} from './utils';

const makeEvent = (overrides: Partial<EventPrisma> = {}): EventPrisma => ({
  id: 1,
  userId: 'user-1',
  name: 'Event',
  description: null,
  startDate: new Date('2024-01-10T00:00:00.000Z'),
  endDate: new Date('2024-01-11T00:00:00.000Z'),
  customColor: null,
  eventType: EventType.CustomEvent,
  blockSubtype: null,
  recurrenceFrequency: null,
  recurrenceEnd: null,
  ...overrides,
});

describe('eventOccursInYear', () => {
  it('includes non-recurring events that overlap the selected year', () => {
    const event = makeEvent({
      startDate: new Date('2023-12-28T00:00:00.000Z'),
      endDate: new Date('2024-01-03T00:00:00.000Z'),
    });

    expect(eventOccursInYear(event, 2024)).toBe(true);
    expect(eventOccursInYear(event, 2023)).toBe(true);
    expect(eventOccursInYear(event, 2025)).toBe(false);
  });

  it('treats the event end date as exclusive at year boundaries', () => {
    const event = makeEvent({
      startDate: new Date('2023-12-31T00:00:00.000Z'),
      endDate: new Date('2024-01-01T00:00:00.000Z'),
    });

    expect(eventOccursInYear(event, 2023)).toBe(true);
    expect(eventOccursInYear(event, 2024)).toBe(false);
  });

  it('includes recurring events with recurrence windows spanning multiple years', () => {
    const recurringEvent = makeEvent({
      startDate: new Date('2022-10-01T00:00:00.000Z'),
      endDate: new Date('2022-10-02T00:00:00.000Z'),
      recurrenceFrequency: 'MONTHLY',
      recurrenceEnd: new Date('2025-03-31T00:00:00.000Z'),
    });

    expect(eventOccursInYear(recurringEvent, 2021)).toBe(false);
    expect(eventOccursInYear(recurringEvent, 2022)).toBe(true);
    expect(eventOccursInYear(recurringEvent, 2023)).toBe(true);
    expect(eventOccursInYear(recurringEvent, 2024)).toBe(true);
    expect(eventOccursInYear(recurringEvent, 2025)).toBe(true);
    expect(eventOccursInYear(recurringEvent, 2026)).toBe(false);
  });

  it('treats recurring events without recurrenceEnd as ongoing', () => {
    const recurringEvent = makeEvent({
      startDate: new Date('2020-06-15T00:00:00.000Z'),
      endDate: new Date('2020-06-16T00:00:00.000Z'),
      recurrenceFrequency: 'YEARLY',
      recurrenceEnd: null,
    });

    expect(eventOccursInYear(recurringEvent, 2019)).toBe(false);
    expect(eventOccursInYear(recurringEvent, 2020)).toBe(true);
    expect(eventOccursInYear(recurringEvent, 2035)).toBe(true);
  });
});

describe('calendar date range invariant helpers', () => {
  it('maps single-day UI date range to exclusive end for create/edit payloads', () => {
    const start = new Date('2024-01-10T00:00:00.000Z');

    const exclusiveEnd = toExclusiveEndDate(start);

    expect(exclusiveEnd.toISOString()).toBe('2024-01-11T00:00:00.000Z');
  });

  it('maps multi-day UI inclusive end to exclusive end for create/edit payloads', () => {
    const inclusiveEnd = new Date('2024-01-12T00:00:00.000Z');

    const exclusiveEnd = toExclusiveEndDate(inclusiveEnd);

    expect(exclusiveEnd.toISOString()).toBe('2024-01-13T00:00:00.000Z');
    expect(toInclusiveEndDate(exclusiveEnd).toISOString()).toBe('2024-01-12T00:00:00.000Z');
  });
});

describe('getEventsOnDate', () => {
  it('returns event on its start date but not on its exclusive end date', () => {
    const event = makeEvent({
      startDate: new Date('2024-01-10T00:00:00.000Z'),
      endDate: new Date('2024-01-13T00:00:00.000Z'),
    });

    const onStart = getEventsOnDate({date: new Date('2024-01-10T00:00:00.000Z')} as never, [event]);
    const onFinalIncludedDay = getEventsOnDate({date: new Date('2024-01-12T00:00:00.000Z')} as never, [event]);
    const onExclusiveEnd = getEventsOnDate({date: new Date('2024-01-13T00:00:00.000Z')} as never, [event]);

    expect(onStart).toHaveLength(1);
    expect(onFinalIncludedDay).toHaveLength(1);
    expect(onExclusiveEnd).toHaveLength(0);
  });
});

describe('parsedEvents', () => {
  it('passes through exclusive end date for non-recurring events', () => {
    const event = makeEvent({
      startDate: new Date('2024-01-10T00:00:00.000Z'),
      endDate: new Date('2024-01-13T00:00:00.000Z'),
      eventType: EventType.BlockEvent,
      blockSubtype: BlockSubtype.Bulk,
    });

    const [parsed] = parsedEvents([event]);

    expect('start' in parsed && parsed.start.toISOString()).toBe('2024-01-10T00:00:00.000Z');
    expect('end' in parsed && parsed.end.toISOString()).toBe('2024-01-13T00:00:00.000Z');
  });

  it('uses exclusive range length for recurring event duration', () => {
    const recurring = makeEvent({
      startDate: new Date('2024-01-10T00:00:00.000Z'),
      endDate: new Date('2024-01-13T00:00:00.000Z'),
      recurrenceFrequency: 'WEEKLY',
    });

    const [parsed] = parsedEvents([recurring]);

    expect('duration' in parsed && parsed.duration.days).toBe(3);
  });
});
