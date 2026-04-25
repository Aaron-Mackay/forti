import {describe, expect, it} from 'vitest';
import {EventType} from '@/generated/prisma/browser';
import {EventPrisma} from '@/types/dataTypes';
import {hasMeaningfulEventChanges} from './utils';

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
