import {describe, expect, it} from 'vitest';
import {BlockSubtype, EventType} from '@/generated/prisma/browser';
import {EventPrisma} from '@/types/dataTypes';
import {
  eventOccursInYear,
  getEventsOnDate,
  hasMeaningfulEventChanges,
  parsedEvents,
  toExclusiveEndDate,
  toInclusiveEndDate,
} from './utils';

const makeEvent = (overrides: Partial<EventPrisma> = {}): EventPrisma => ({
  id: 1,
  userId: 'user-1',
  name: 'Original event',
  description: null,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-02'),
  customColor: null,
  eventType: EventType.CustomEvent,
  blockSubtype: null,
  recurrenceFrequency: null,
  recurrenceEnd: null,
  ...overrides,
});

describe('hasMeaningfulEventChanges', () => {
  it('returns true when same ids have changed content', () => {
    const current = [makeEvent({id: 1, name: 'A'})];
    const fresh = [makeEvent({id: 1, name: 'B'})];

    expect(hasMeaningfulEventChanges(current, fresh)).toBe(true);

    const changedDate = [makeEvent({id: 1, startDate: new Date('2026-01-03')})];
    expect(hasMeaningfulEventChanges(current, changedDate)).toBe(true);
  });

  it('returns false when only order changes', () => {
    const eventA = makeEvent({id: 1, name: 'A'});
    const eventB = makeEvent({id: 2, name: 'B', startDate: new Date('2026-02-01'), endDate: new Date('2026-02-03')});

    expect(hasMeaningfulEventChanges([eventA, eventB], [eventB, eventA])).toBe(false);
  });

  it('returns true when event is added or removed', () => {
    const eventA = makeEvent({id: 1, name: 'A'});
    const eventB = makeEvent({id: 2, name: 'B'});

    expect(hasMeaningfulEventChanges([eventA], [eventA, eventB])).toBe(true);
    expect(hasMeaningfulEventChanges([eventA, eventB], [eventA])).toBe(true);
  });
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

  it('treats event end dates as exclusive at year boundaries', () => {
    const event = makeEvent({
      startDate: new Date('2023-12-31T00:00:00.000Z'),
      endDate: new Date('2024-01-01T00:00:00.000Z'),
    });

    expect(eventOccursInYear(event, 2023)).toBe(true);
    expect(eventOccursInYear(event, 2024)).toBe(false);
  });
});

describe('calendar date range helpers', () => {
  it('maps inclusive UI dates to exclusive payload dates and back', () => {
    const inclusiveEnd = new Date('2024-01-12T00:00:00.000Z');
    const exclusiveEnd = toExclusiveEndDate(inclusiveEnd);

    expect(exclusiveEnd.toISOString()).toBe('2024-01-13T00:00:00.000Z');
    expect(toInclusiveEndDate(exclusiveEnd).toISOString()).toBe('2024-01-12T00:00:00.000Z');
  });
});

describe('getEventsOnDate', () => {
  it('returns event on start date and final included day, but not exclusive end', () => {
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
