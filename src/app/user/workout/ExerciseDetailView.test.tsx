import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach} from 'vitest';

vi.mock('next-auth/react', () => ({useSession: () => ({data: null, status: 'unauthenticated'})}));
vi.mock('next/navigation', () => ({usePathname: () => '/user/workout', useRouter: () => ({push: vi.fn()})}));
vi.mock('@lib/providers/SettingsProvider', () => ({
  useSettings: () => ({
    settings: {showStopwatch: true, weightUnit: 'kg', exerciseUnitOverrides: {}, effortMetric: 'none'},
    loading: false, error: null, clearError: vi.fn(), updateSetting: vi.fn(), setExerciseUnitOverride: vi.fn(),
  }),
}));
vi.mock('@lib/providers/AppBarProvider', () => ({ useAppBar: vi.fn() }));

import ExerciseDetailView from './ExerciseDetailView';
import {StopwatchProvider} from './StopwatchContext';
import {ExerciseCategory} from '@/generated/prisma/browser';
import {WorkoutPrisma} from '@/types/dataTypes';

// Swiper doesn't render well in jsdom — mock the parts we need
vi.mock('swiper/react', () => ({
  Swiper: ({children}: {children: React.ReactNode}) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({children}: {children: React.ReactNode}) => <div data-testid="swiper-slide">{children}</div>,
}));
vi.mock('swiper/modules', () => ({Pagination: {}}));
vi.mock('swiper/css', () => ({}));
vi.mock('swiper/css/pagination', () => ({}));
vi.mock('@/components/fitness/MuscleHighlight', () => ({
  default: ({primaryMuscles, exerciseId}: {primaryMuscles: string[]; secondaryMuscles?: string[]; exerciseId: number}) =>
    primaryMuscles.length > 0 ? <div data-testid={`anatomy-${exerciseId}`}/> : null,
}));
vi.mock('./E1rmSparkline', () => ({
  default: () => <div data-testid="e1rm-sparkline"/>,
}));

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
        exercise: {id: 100, name: 'Bench Press', category: ExerciseCategory.resistance, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [], createdByUserId: null},
        targetRpe: null,
        targetRir: null,
        substitutedForId: null,
        substitutedFor: null,
        isAdded: false,
        isBfr: false,
        requiresRecording: false,
        sets: [
          {id: 1, workoutExerciseId: 10, order: 1, reps: 8, weight: 100, e1rm: null, rpe: null, rir: null, isDropSet: false, parentSetId: null},
          {id: 2, workoutExerciseId: 10, order: 2, reps: 6, weight: 90, e1rm: null, rpe: null, rir: null, isDropSet: false, parentSetId: null},
        ],
        cardioDuration: null,
        cardioDistance: null,
        cardioResistance: null,
      },
    ],
  };
}

const defaultProps = {
  workout: buildWorkout(),
  currentWorkoutId: 1,
  activeExerciseId: 10,
  previousSetsMap: new Map(),
  fetchPreviousSets: vi.fn(),
  userExerciseNotes: [],
  onBack: vi.fn(),
  onSlideChange: vi.fn(),
  handleSetUpdate: vi.fn(),
  handleEffortUpdate: vi.fn(),
  onFormCueBlur: vi.fn(),
  onCardioUpdate: vi.fn(),
  onSubstituteExercise: vi.fn(),
  snackbar: {open: false, message: '', severity: 'success' as const},
  handleSnackbarClose: vi.fn(),
  onRemoveExercise: vi.fn(),
};

function renderView(props: React.ComponentProps<typeof ExerciseDetailView>) {
  return render(
    <StopwatchProvider>
      <ExerciseDetailView {...props}/>
    </StopwatchProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockImplementation((input: string | URL | Request) => {
    const url = String(input);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(url.includes('/previous-sets')
        ? {workouts: []}
        : []),
    });
  }));
});

describe('ExerciseDetailView', () => {
  it('renders duplicate exercise items as one grouped swiper slide', () => {
    const workout = buildWorkout();
    workout.exercises.push({
      ...workout.exercises[0],
      id: 11,
      repRange: '10-12',
      restTime: '75s',
      sets: [
        {id: 3, workoutExerciseId: 11, order: 1, reps: 12, weight: 60, e1rm: null, rpe: null, rir: null, isDropSet: false, parentSetId: null},
      ],
    });
    renderView({...defaultProps, workout});
    expect(screen.getAllByTestId('swiper-slide')).toHaveLength(1);
  });

  it('renders set weight and reps inputs', () => {
    renderView(defaultProps);
    expect(screen.getAllByLabelText(/Weight set/i)).toHaveLength(2);
    expect(screen.getAllByLabelText(/Reps set/i)).toHaveLength(2);
  });

  it('fetches previous sets on mount for the active exercise', async () => {
    const fetchPreviousSets = vi.fn();
    renderView({...defaultProps, fetchPreviousSets});
    await waitFor(() => {
      expect(fetchPreviousSets).toHaveBeenCalledWith(1, 10, 100);
    });
  });

  it('does not fetch previous sets on mount when active exercise is already cached', async () => {
    const fetchPreviousSets = vi.fn();
    renderView({
      ...defaultProps,
      fetchPreviousSets,
      previousSetsMap: new Map([[10, {workouts: []}]]),
    });
    await waitFor(() => {
      expect(fetchPreviousSets).not.toHaveBeenCalled();
    });
  });

  it('displays previous workout data when cache contains results', async () => {
    renderView({
      ...defaultProps,
      previousSetsMap: new Map([[10, {
        workouts: [
          {
            completedAt: '2026-01-14T12:00:00.000Z',
            sets: [
              {weight: 80, reps: 10, order: 1, e1rm: 106.7},
              {weight: 80, reps: 9, order: 2, e1rm: 104},
            ],
            workoutName: 'Push Day',
          },
          {
            completedAt: '2026-01-07T12:00:00.000Z',
            sets: [
              {weight: 77.5, reps: 9, order: 1, e1rm: 100.8},
            ],
            workoutName: 'Push Day',
          },
        ],
      }]]),
    });

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /previous workouts/i})).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', {name: /previous workouts/i}));

    expect(screen.getByLabelText('Previous workout table 1')).toBeInTheDocument();
    expect(screen.getByText(/Jan.*14.*2026/)).toBeInTheDocument();
    expect(screen.getByText(/Jan.*7.*2026/)).toBeInTheDocument();
    expect(screen.getByText('106.7')).toBeInTheDocument();
  });

  it('shows — for null previous weight or reps', async () => {
    renderView({
      ...defaultProps,
      previousSetsMap: new Map([[10, {
        workouts: [
          {
            completedAt: '2026-01-14T12:00:00.000Z',
            sets: [{weight: null, reps: null, order: 1, e1rm: null}],
            workoutName: 'Push Day',
          },
        ],
      }]]),
    });

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /previous workouts/i})).toBeInTheDocument();
    });
    screen.getByRole('button', {name: /previous workouts/i}).click();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('does not show previous workout controls when cache is empty', async () => {
    renderView({...defaultProps, previousSetsMap: new Map([[10, {workouts: []}]])});

    await waitFor(() => {
      expect(screen.getByTestId('swiper')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', {name: /previous workouts/i})).not.toBeInTheDocument();
  });

  it('renders the anatomy diagram when the exercise has muscles', () => {
    const workout = buildWorkout();
    workout.exercises[0].exercise.primaryMuscles = ['sternal-pec', 'triceps'];
    renderView({...defaultProps, workout});
    expect(screen.getByTestId('anatomy-100')).toBeInTheDocument();
  });

  it('does not render the anatomy diagram when the exercise has no muscles', () => {
    renderView(defaultProps);
    expect(screen.queryByTestId('anatomy-100')).not.toBeInTheDocument();
  });
});
