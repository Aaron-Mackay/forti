import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequireSession,
  mockUserFindUnique,
  mockGetCoachClientHealthSummary,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockGetCoachClientHealthSummary: vi.fn(),
}));

vi.mock('@lib/requireSession', () => ({
  requireSession: mockRequireSession,
}));

vi.mock('@lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock('@lib/coachService', () => ({
  getCoachClientHealthSummary: mockGetCoachClientHealthSummary,
}));

import { GET } from './route';

describe('GET /api/coach/clients/health-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ user: { id: 'coach-1' } });
  });

  it('returns forbidden when coach mode is not active', async () => {
    mockUserFindUnique.mockResolvedValue({ settings: { coachModeActive: false } });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json).toEqual({
      error: 'You do not have permission to perform this action.',
      code: 'FORBIDDEN',
    });
    expect(mockGetCoachClientHealthSummary).not.toHaveBeenCalled();
  });

  it('returns aggregated client health summaries when coach mode is active', async () => {
    const clients = [{ clientId: 'client-1', clientName: 'Alice' }];
    mockUserFindUnique.mockResolvedValue({ settings: { coachModeActive: true } });
    mockGetCoachClientHealthSummary.mockResolvedValue(clients);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ clients });
    expect(mockGetCoachClientHealthSummary).toHaveBeenCalledWith('coach-1');
  });
});
