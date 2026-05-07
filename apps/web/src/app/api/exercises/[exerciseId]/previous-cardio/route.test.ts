import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/prisma', () => ({
  default: {
    workout: {
      findUnique: vi.fn(),
    },
    workoutExercise: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@lib/requireSession', () => ({
  requireSession: vi.fn(),
  isAuthenticationError: (error: unknown) => error instanceof Error && error.name === 'AuthenticationError',
  authenticationErrorResponse: () => Response.json({ error: 'Unauthorized' }, { status: 401 }),
}))

import prisma from '@/lib/prisma'
import { requireSession } from '@lib/requireSession'

const mockFindUnique = prisma.workout.findUnique as ReturnType<typeof vi.fn>
const mockFindMany = prisma.workoutExercise.findMany as ReturnType<typeof vi.fn>
const mockRequireSession = requireSession as ReturnType<typeof vi.fn>

function makeRequest(
  exerciseId: string,
  currentWorkoutId?: number,
): [NextRequest, { params: Promise<{ exerciseId: string }> }] {
  const url = new URL(`http://localhost/api/exercises/${exerciseId}/previous-cardio`)
  if (currentWorkoutId !== undefined) {
    url.searchParams.set('currentWorkoutId', String(currentWorkoutId))
  }
  return [new NextRequest(url.toString()), { params: Promise.resolve({ exerciseId }) }]
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } })
  mockFindUnique.mockResolvedValue({ dateCompleted: null })
})

describe('GET /api/exercises/[exerciseId]/previous-cardio', () => {
  it('returns the closest prior tracked cardio workout', async () => {
    mockFindMany.mockResolvedValue([
      {
        workoutId: 2,
        workout: { dateCompleted: new Date('2026-01-10T10:00:00Z') },
        cardioDuration: 21,
        cardioDistance: null,
        cardioResistance: null,
      },
      {
        workoutId: 1,
        workout: { dateCompleted: new Date('2026-01-07T10:00:00Z') },
        cardioDuration: 20,
        cardioDistance: null,
        cardioResistance: null,
      },
    ])

    const [req, props] = makeRequest('5', 99)
    const res = await GET(req, props)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      cardioDuration: 21,
      cardioDistance: null,
      cardioResistance: null,
    })
  })

  it('returns null when no prior tracked cardio data exists', async () => {
    mockFindMany.mockResolvedValue([])
    const [req, props] = makeRequest('5', 99)
    const res = await GET(req, props)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toBeNull()
  })

  it('applies completed-workout filters from shared exercise query helper', async () => {
    const currentDate = new Date('2026-01-15T12:00:00Z')
    mockFindUnique.mockResolvedValue({ dateCompleted: currentDate })
    mockFindMany.mockResolvedValue([])

    const [req, props] = makeRequest('5', 2)
    await GET(req, props)

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workout: expect.objectContaining({
            dateCompleted: { not: null, lt: currentDate },
          }),
        }),
      }),
    )
  })
})
