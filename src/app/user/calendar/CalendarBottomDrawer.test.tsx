import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CalendarBottomDrawer from './CalendarBottomDrawer';

const updateMetricClient = vi.fn(() => Promise.resolve());
window.scrollTo = vi.fn();

vi.mock('@lib/providers/SettingsProvider', () => ({
  useSettings: () => ({ settings: { bodyweightUnit: 'kg' } }),
}));

vi.mock('./useAnimatedDrawerHeight', () => ({
  TRANSITION_MS: 0,
  useAnimatedDrawerHeight: () => undefined,
}));

vi.mock('@lib/metrics', () => ({
  updateMetricClient: (...args: unknown[]) => updateMetricClient(...args),
}));

vi.mock('@/app/user/calendar/EventsList', () => ({
  EventsList: () => <div>Events List</div>,
}));

vi.mock('@/app/user/calendar/EventCreationForm', () => ({
  EventCreationForm: () => <div>Event Form</div>,
}));

vi.mock('@/app/user/calendar/EventDetails', () => ({
  EventDetails: () => <div>Event Details</div>,
}));

function props() {
  return {
    open: true,
    drawerView: 'list' as const,
    setDrawerView: vi.fn(),
    selectedDate: new Date('2026-01-02T00:00:00.000Z'),
    selectedEvent: null,
    setSelectedEvent: vi.fn(),
    eventsOnSelectedDate: [],
    setDrawerOpen: vi.fn(),
    dateMetric: {
      id: 1,
      userId: 'user-1',
      date: new Date('2026-01-02T00:00:00.000Z'),
      weight: null,
      calories: null,
      steps: 1234,
      sleepMins: null,
      protein: null,
      carbs: null,
      fat: null,
      customMetrics: null,
    },
    setMetricStateCb: vi.fn(),
    userId: 'user-1',
    setEventsInState: vi.fn(),
    prefilledDateRange: { start: null, endExcl: null },
    setPrefilledDateRange: vi.fn(),
    customMetricDefs: [],
  };
}

describe('CalendarBottomDrawer metric flow', () => {
  it('selects a metric from metrics bar and saves through metric update path', async () => {
    const p = props();
    render(<CalendarBottomDrawer {...p} />);

    fireEvent.click(screen.getByTestId('DirectionsWalkRoundedIcon').closest('button') as HTMLButtonElement);
    await screen.findByText('Update steps');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(p.setMetricStateCb).toHaveBeenCalled();
      expect(updateMetricClient).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText('Update steps')).not.toBeInTheDocument();
    });
  });

  it('closing the drawer resets selected metric state', async () => {
    const p = props();
    const { rerender } = render(<CalendarBottomDrawer {...p} />);

    fireEvent.click(screen.getByTestId('DirectionsWalkRoundedIcon').closest('button') as HTMLButtonElement);
    await screen.findByText('Update steps');

    fireEvent.click(document.querySelector('.MuiBackdrop-root') as Element);

    await waitFor(() => {
      expect(p.setDrawerOpen).toHaveBeenCalledWith(false);
      expect(p.setPrefilledDateRange).toHaveBeenCalledWith({ start: null, endExcl: null });
    });

    rerender(<CalendarBottomDrawer {...p} open={false} />);
    rerender(<CalendarBottomDrawer {...p} open={true} />);

    expect(screen.queryByText('Update steps')).not.toBeInTheDocument();
  });
});
