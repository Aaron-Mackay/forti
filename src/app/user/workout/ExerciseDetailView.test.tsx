import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach} from 'vitest';

vi.mock('next-auth/react', () => ({useSession: () => ({data: null, status: 'unauthenticated'})}));
vi.mock('next/navigation', () => ({usePathname: () => '/user/workout', useRouter: () => ({push: vi.fn()})}));

import ExerciseDetailView from './ExerciseDetailView';
import {WorkoutPrisma} from '@/types/dataTypes';

// Swiper doesn't render well in jsdom — mock the parts we need
vi.mock('swiper/react', () => ({
  Swiper: ({children}: {children: React.ReactNode}) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({children}: {children: React.ReactNode}) => <div data-testid="swiper-slide">{children}</div>,
}));
vi.mock('swiper/modules', () => ({Pagination: {}}));
vi.mock('swiper/css', () => ({}));
vi.mock('swiper/css/pagination', () => ({}));

const stopwatchProps = {
  stopwatchIsRunning: false,
  stopwatchStartTimestamp: null,
  stopwatchPausedTime: 0,
  onStopwatchStartStop: vi.fn(),
  onStopwatchReset: vi.fn(),
  isStopwatchVisible: false,
  setIsStopwatchVisible: vi.fn(),
};

function buildWorkout(): WorkoutPrisma {
  return {
    id: 1,
    weekId: 1,
    name: 'Push Day',
    order: 1,
    notes: '',
    dateCompleted: null,
    exercises: [
      {
        id: 10,
        workoutId: 1,
        exerciseId: 100,
        order: 1,
        repRange: '8-12',
        restTime: '90s',
        notes: '',
        exercise: {id: 100, name: 'Bench Press', category: 'Chest', description: null, equipment: [], muscles: []},
        sets: [
          {id: 1, workoutExerciseId: 10, order: 1, reps: 8, weight: '100'},
          {id: 2, workoutExerciseId: 10, order: 2, reps: 6, weight: '90'},
        ],
      },
    ],
  };
}

const defaultProps = {
  workout: buildWorkout(),
  currentWorkoutId: 1,
  activeExerciseId: 10,
  userExerciseNotes: [],
  onBack: vi.fn(),
  onSlideChange: vi.fn(),
  handleSetUpdate: vi.fn(),
  onFormCueBlur: vi.fn(),
  snackbar: {open: false, message: '', severity: 'success' as const},
  handleSnackbarClose: vi.fn(),
  ...stopwatchProps,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([]),
  }));
});

describe('ExerciseDetailView', () => {
  it('renders set weight and reps inputs', () => {
    render(<ExerciseDetailView {...defaultProps} />);
    expect(screen.getAllByLabelText(/weight/i)).toHaveLength(2);
    expect(screen.getAllByLabelText(/reps/i)).toHaveLength(2);
  });

  it('fetches previous sets on mount for the active exercise', async () => {
    render(<ExerciseDetailView {...defaultProps} />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/exercises/100/previous-sets?currentWorkoutId=1')
      );
    });
  });

  it('displays previous set data when fetch returns results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {weight: '80', reps: 10, order: 1},
        {weight: '80', reps: 9, order: 2},
      ]),
    }));

    render(<ExerciseDetailView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText(/last:/i)).toHaveLength(2);
    });
    expect(screen.getByText('Last: 80 × 10')).toBeInTheDocument();
    expect(screen.getByText('Last: 80 × 9')).toBeInTheDocument();
  });

  it('shows — for null previous weight or reps', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {weight: null, reps: null, order: 1},
      ]),
    }));

    render(<ExerciseDetailView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Last: — × —')).toBeInTheDocument();
    });
  });

  it('does not show previous set rows when fetch returns empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));

    render(<ExerciseDetailView {...defaultProps} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    expect(screen.queryByText(/last:/i)).not.toBeInTheDocument();
  });

  it('does not show previous set rows when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    render(<ExerciseDetailView {...defaultProps} />);

    // Give it time to settle
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    expect(screen.queryByText(/last:/i)).not.toBeInTheDocument();
  });
});
