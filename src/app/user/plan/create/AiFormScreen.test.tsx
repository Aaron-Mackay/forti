import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDispatch = vi.fn()

vi.mock('@/context/WorkoutEditorContext', () => ({
  useWorkoutEditorContext: () => ({ dispatch: mockDispatch }),
}))

vi.mock('./useNewPlan', () => ({
  useNewPlan: () => ({
    statePlan: {
      id: -1,
      userId: 'user-1',
      name: 'New Plan',
      description: null,
      order: 1,
      weeks: [{ id: -1, planId: -1, order: 1, workouts: [] }],
    },
    dispatch: mockDispatch,
  }),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { AiFormScreen } from './AiFormScreen'

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderScreen(onSuccess = vi.fn()) {
  return render(<AiFormScreen onSuccess={onSuccess} />)
}

function mockFetchResponse(body: unknown, ok = true) {
  mockFetch.mockResolvedValue({
    ok,
    json: async () => body,
  })
}

const minimalParsedPlan = {
  plan: {
    name: 'PPL',
    description: null,
    order: 1,
    weeks: [
      {
        order: 1,
        workouts: [
          {
            name: 'Push Day',
            notes: null,
            order: 1,
            dateCompleted: null,
            exercises: [
              {
                exercise: { name: 'Bench Press', category: 'resistance' },
                order: 1,
                repRange: '8-12',
                restTime: '90',
                notes: null,
                sets: [{ order: 1, weight: null, reps: 8 }],
              },
            ],
          },
        ],
      },
    ],
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('AiFormScreen — rendering', () => {
  it('renders chip selectors for days, goal, and experience', () => {
    renderScreen()
    expect(screen.getByText('3 days')).toBeInTheDocument()
    expect(screen.getByText('Strength')).toBeInTheDocument()
    expect(screen.getByText('Beginner')).toBeInTheDocument()
  })

  it('Generate button is disabled when nothing is selected', () => {
    renderScreen()
    expect(screen.getByRole('button', { name: /generate my plan/i })).toBeDisabled()
  })

  it('Generate button is disabled when only days is selected', () => {
    renderScreen()
    fireEvent.click(screen.getByText('4 days'))
    expect(screen.getByRole('button', { name: /generate my plan/i })).toBeDisabled()
  })

  it('Generate button is enabled when days, goal, and level are all selected', () => {
    renderScreen()
    fireEvent.click(screen.getByText('4 days'))
    fireEvent.click(screen.getByText('Muscle'))
    fireEvent.click(screen.getByText('Intermediate'))
    expect(screen.getByRole('button', { name: /generate my plan/i })).not.toBeDisabled()
  })

  it('renders an optional notes text field', () => {
    renderScreen()
    expect(screen.getByLabelText(/additional notes/i)).toBeInTheDocument()
  })
})

// ── Success path ───────────────────────────────────────────────────────────────

describe('AiFormScreen — success', () => {
  it('calls onSuccess with week count after successful generation', async () => {
    const onSuccess = vi.fn()
    mockFetchResponse(minimalParsedPlan)

    renderScreen(onSuccess)
    fireEvent.click(screen.getByText('4 days'))
    fireEvent.click(screen.getByText('Muscle'))
    fireEvent.click(screen.getByText('Intermediate'))
    fireEvent.click(screen.getByRole('button', { name: /generate my plan/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('1')
    })
  })

  it('dispatches REPLACE_PLAN on successful generation', async () => {
    mockFetchResponse(minimalParsedPlan)

    renderScreen()
    fireEvent.click(screen.getByText('4 days'))
    fireEvent.click(screen.getByText('Muscle'))
    fireEvent.click(screen.getByText('Intermediate'))
    fireEvent.click(screen.getByRole('button', { name: /generate my plan/i }))

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REPLACE_PLAN' }),
      )
    })
  })

  it('shows a loading state while generating', async () => {
    let resolve: (v: unknown) => void
    mockFetch.mockReturnValue(new Promise((r) => { resolve = r }))

    renderScreen()
    fireEvent.click(screen.getByText('3 days'))
    fireEvent.click(screen.getByText('Strength'))
    fireEvent.click(screen.getByText('Beginner'))
    fireEvent.click(screen.getByRole('button', { name: /generate my plan/i }))

    await waitFor(() => {
      expect(screen.getByText(/building your plan/i)).toBeInTheDocument()
    })

    // Resolve to avoid dangling promise
    resolve!({ ok: true, json: async () => minimalParsedPlan })
  })
})

// ── Error handling ─────────────────────────────────────────────────────────────

describe('AiFormScreen — errors', () => {
  it('shows an error alert when the API returns a non-ok response', async () => {
    mockFetchResponse({ error: 'AI service unavailable' }, false)

    renderScreen()
    fireEvent.click(screen.getByText('4 days'))
    fireEvent.click(screen.getByText('Muscle'))
    fireEvent.click(screen.getByText('Intermediate'))
    fireEvent.click(screen.getByRole('button', { name: /generate my plan/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('AI service unavailable')
    })
  })

  it('shows a network error message when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'))

    renderScreen()
    fireEvent.click(screen.getByText('4 days'))
    fireEvent.click(screen.getByText('Muscle'))
    fireEvent.click(screen.getByText('Intermediate'))
    fireEvent.click(screen.getByRole('button', { name: /generate my plan/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/network error/i)
    })
  })

  it('includes the extra notes text in the API request', async () => {
    mockFetchResponse(minimalParsedPlan)

    renderScreen()
    fireEvent.click(screen.getByText('4 days'))
    fireEvent.click(screen.getByText('Muscle'))
    fireEvent.click(screen.getByText('Intermediate'))
    fireEvent.change(screen.getByLabelText(/additional notes/i), {
      target: { value: 'no barbell please' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate my plan/i }))

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.input).toContain('no barbell please')
    })
  })
})

// ── Freeform mode ──────────────────────────────────────────────────────────────

describe('AiFormScreen — freeform mode', () => {
  it('shows freeform textarea after clicking the toggle link', () => {
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: /prefer to describe your own plan/i }))
    expect(screen.getByLabelText(/plan description/i)).toBeInTheDocument()
  })

  it('Generate button is disabled when freeform textarea is empty', () => {
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: /prefer to describe your own plan/i }))
    expect(screen.getByRole('button', { name: /generate my plan/i })).toBeDisabled()
  })

  it('Generate button enables after typing in freeform textarea', () => {
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: /prefer to describe your own plan/i }))
    fireEvent.change(screen.getByLabelText(/plan description/i), {
      target: { value: '3 day PPL, bench 4x8-12' },
    })
    expect(screen.getByRole('button', { name: /generate my plan/i })).not.toBeDisabled()
  })

  it('sends freeform text directly as the API input', async () => {
    mockFetchResponse(minimalParsedPlan)

    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: /prefer to describe your own plan/i }))
    fireEvent.change(screen.getByLabelText(/plan description/i), {
      target: { value: '3 day PPL, bench 4x8-12' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate my plan/i }))

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.input).toBe('3 day PPL, bench 4x8-12')
    })
  })

  it('"Use guided setup instead" link returns to guided mode', () => {
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: /prefer to describe your own plan/i }))
    fireEvent.click(screen.getByRole('button', { name: /use guided setup instead/i }))
    expect(screen.getByText('3 days')).toBeInTheDocument()
    expect(screen.queryByLabelText(/plan description/i)).not.toBeInTheDocument()
  })
})
