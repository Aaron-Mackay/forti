import { beforeEach, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/prisma';
import * as eventService from './eventService';
import * as metricService from './metricService';
import { getCoachClientCalendarData } from './coachCalendar';

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('./eventService', () => ({
  getUserEvents: vi.fn(),
}));

vi.mock('./metricService', () => ({
  getUserMetrics: vi.fn(),
}));

describe('getCoachClientCalendarData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the client is not coached by the caller', async () => {
    (prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ coachId: 'coach-2' });

    await expect(getCoachClientCalendarData('coach-1', 'client-1')).resolves.toBeNull();
    expect(eventService.getUserEvents).not.toHaveBeenCalled();
    expect(metricService.getUserMetrics).not.toHaveBeenCalled();
  });

  it('returns the coached client calendar data', async () => {
    (prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ coachId: 'coach-1' });
    (eventService.getUserEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    (metricService.getUserMetrics as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 2 }]);

    await expect(getCoachClientCalendarData('coach-1', 'client-1')).resolves.toEqual({
      events: [{ id: 1 }],
      metrics: [{ id: 2 }],
    });
  });
});
