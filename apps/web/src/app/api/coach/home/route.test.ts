import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequireSession,
  mockUserFindUnique,
  mockGetCoachHomeData,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockGetCoachHomeData: vi.fn(),
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
  getCoachHomeData: mockGetCoachHomeData,
}));

import { GET } from './route';

describe('GET /api/coach/home', () => {
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
    expect(mockGetCoachHomeData).not.toHaveBeenCalled();
  });

  it('returns the coach home inbox payload when coach mode is active', async () => {
    const data = {
      summary: { clientCount: 2, submittedCheckInCount: 1, maintenanceCount: 1 },
      submittedCheckIns: [],
      planMaintenance: [],
    };
    mockUserFindUnique.mockResolvedValue({ settings: { coachModeActive: true } });
    mockGetCoachHomeData.mockResolvedValue(data);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(data);
    expect(mockGetCoachHomeData).toHaveBeenCalledWith('coach-1');
  });
});
