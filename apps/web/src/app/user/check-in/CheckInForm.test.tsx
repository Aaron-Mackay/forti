import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CheckInForm from './CheckInForm';
import type { CheckInTemplate } from '@/types/checkInTemplateTypes';

const push = vi.fn();
const updateMetricClient = vi.fn(() => Promise.resolve());

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@lib/providers/SettingsProvider', () => ({
  useSettings: () => ({ settings: { bodyweightUnit: 'kg', customMetrics: [] } }),
}));
vi.mock('@lib/firstWeekEvents', () => ({ trackFirstWeekEvent: vi.fn() }));
vi.mock('@lib/metrics', () => ({ updateMetricClient: (...args: unknown[]) => updateMetricClient(...args) }));

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    currentWeek: [],
    weekPrior: [],
    checkIn: {
      id: 1,
      userId: 'u1',
      weekStartDate: new Date('2026-01-05T00:00:00.000Z'),
      completedAt: null,
      frontPhotoUrl: null,
      backPhotoUrl: null,
      sidePhotoUrl: null,
      energyLevel: null,
      moodRating: null,
      stressLevel: null,
      sleepQuality: null,
      recoveryRating: null,
      adherenceRating: null,
      weekReview: '',
      coachMessage: '',
      goalsNextWeek: '',
      customResponses: null,
    },
    previousPhotos: null,
    weekTargets: null,
    completedWorkoutsCount: 1,
    plannedWorkoutsCount: 2,
    workoutSummaries: [],
    activePlanId: 7,
    template: null,
    onSubmitted: vi.fn(),
    ...overrides,
  } as never;
}

describe('CheckInForm', () => {
  it('legacy mode renders expected fields and submit button', () => {
    render(<CheckInForm {...makeProps()} />);

    expect(screen.getByText('How was your week?')).toBeInTheDocument();
    expect(screen.getByLabelText('How did your week go overall?')).toBeInTheDocument();
    expect(screen.getByLabelText('Goals / focus for next week')).toBeInTheDocument();
    expect(screen.getByLabelText('Message to your coach (optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Check-in' })).toBeInTheDocument();
  });

  it('editing mode hides submit button', () => {
    render(<CheckInForm {...makeProps({ checkIn: { ...makeProps().checkIn, completedAt: new Date('2026-01-06T00:00:00.000Z') } })} />);
    expect(screen.queryByRole('button', { name: 'Submit Check-in' })).not.toBeInTheDocument();
  });

  it('template mode renders cards in template order and clears hidden conditional fields', async () => {
    const template: CheckInTemplate = {
      version: 2,
      cards: [
        {
          id: 'c1',
          kind: 'custom',
          title: 'Q1',
          columnSpan: 1,
          fields: [
            { id: 'f1', type: 'rating', label: 'Field 1', minScale: 1, maxScale: 5 },
            { id: 'f2', type: 'text', label: 'Field 2', showIf: { fieldId: 'f1', operator: 'eq', value: 3 } },
          ],
        },
        { id: 'm', kind: 'system', systemType: 'metrics', columnSpan: 1 },
        { id: 'p', kind: 'system', systemType: 'photos', columnSpan: 1 },
        { id: 'w', kind: 'system', systemType: 'workouts', columnSpan: 1 },
      ],
    };

    render(<CheckInForm {...makeProps({ template })} />);

    const q1 = screen.getByText('Q1');
    const metricTitle = screen.getByText('Last 2 weeks of metrics');
    expect(q1.compareDocumentPosition(metricTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    const field2 = await screen.findByLabelText('Field 2');
    fireEvent.change(field2, { target: { value: 'temp' } });
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    await waitFor(() => {
      expect(screen.queryByLabelText('Field 2')).not.toBeInTheDocument();
    });
  });
});
