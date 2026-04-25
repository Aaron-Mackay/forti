import {describe, expect, it} from "vitest";
import {eventOccursInYear} from "@/app/user/calendar/utils";
import {EventPrisma} from "@/types/dataTypes";
import {EventType} from "@/generated/prisma/browser";

const buildEvent = (overrides: Partial<EventPrisma>): EventPrisma => ({
  id: 1,
  userId: "user-1",
  name: "Event",
  description: null,
  startDate: new Date("2024-01-01"),
  endDate: new Date("2024-01-02"),
  customColor: null,
  eventType: EventType.CustomEvent,
  blockSubtype: null,
  recurrenceFrequency: null,
  recurrenceEnd: null,
  ...overrides,
});

describe("eventOccursInYear", () => {
  it("includes non-recurring events that overlap the selected year", () => {
    const event = buildEvent({
      startDate: new Date("2023-12-28"),
      endDate: new Date("2024-01-03"),
    });

    expect(eventOccursInYear(event, 2024)).toBe(true);
    expect(eventOccursInYear(event, 2023)).toBe(true);
    expect(eventOccursInYear(event, 2025)).toBe(false);
  });

  it("includes recurring events with recurrence windows spanning multiple years", () => {
    const recurringEvent = buildEvent({
      startDate: new Date("2022-10-01"),
      endDate: new Date("2022-10-01"),
      recurrenceFrequency: "MONTHLY",
      recurrenceEnd: new Date("2025-03-31"),
    });

    expect(eventOccursInYear(recurringEvent, 2021)).toBe(false);
    expect(eventOccursInYear(recurringEvent, 2022)).toBe(true);
    expect(eventOccursInYear(recurringEvent, 2023)).toBe(true);
    expect(eventOccursInYear(recurringEvent, 2024)).toBe(true);
    expect(eventOccursInYear(recurringEvent, 2025)).toBe(true);
    expect(eventOccursInYear(recurringEvent, 2026)).toBe(false);
  });

  it("treats recurring events without recurrenceEnd as ongoing", () => {
    const recurringEvent = buildEvent({
      startDate: new Date("2020-06-15"),
      endDate: new Date("2020-06-15"),
      recurrenceFrequency: "YEARLY",
      recurrenceEnd: null,
    });

    expect(eventOccursInYear(recurringEvent, 2019)).toBe(false);
    expect(eventOccursInYear(recurringEvent, 2020)).toBe(true);
    expect(eventOccursInYear(recurringEvent, 2035)).toBe(true);
  });
});
