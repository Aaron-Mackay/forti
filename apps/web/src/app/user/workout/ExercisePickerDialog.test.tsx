import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ExerciseCategory} from '@/generated/prisma/browser';
import ExercisePickerDialog from './ExercisePickerDialog';

const pickerState = vi.hoisted(() => ({
  exercises: [] as Array<{
    id: number;
    name: string;
    category: ExerciseCategory;
    description: string | null;
    equipment: string[];
    primaryMuscles: string[];
    secondaryMuscles: string[];
    createdByUserId: string | null;
  }>,
  addExercise: vi.fn(),
}));

vi.mock('@lib/hooks/api/useExerciseList', () => ({
  useExerciseList: () => ({
    exercises: pickerState.exercises,
    loading: false,
    addExercise: pickerState.addExercise,
  }),
}));

vi.mock('@/components/signal/overlay', () => ({
  Overlay: ({open, children, title}: {open: boolean; children: unknown; title: string}) => (
    open ? (
      <div>
        <div>{title}</div>
        {children}
      </div>
    ) : null
  ),
}));

vi.mock('@/app/exercises/AddExerciseForm', () => ({
  AddExerciseForm: ({
    open,
    category,
    initialName,
    onExerciseAdded,
  }: {
    open: boolean;
    category?: ExerciseCategory;
    initialName?: string;
    onExerciseAdded?: (exercise: {
      id: number;
      name: string;
      category: ExerciseCategory;
      description: null;
      equipment: string[];
      primaryMuscles: string[];
      secondaryMuscles: string[];
      createdByUserId: string | null;
    }) => void;
  }) => (
    open ? (
      <div>
        <div>{`create-form:${category}:${initialName}`}</div>
        <button
          type="button"
          onClick={() => onExerciseAdded?.({
            id: 99,
            name: initialName ?? '',
            category: category ?? ExerciseCategory.resistance,
            description: null,
            equipment: [],
            primaryMuscles: [],
            secondaryMuscles: [],
            createdByUserId: 'user-1',
          })}
        >
          finish-create
        </button>
      </div>
    ) : null
  ),
}));

function makeExercise(overrides: Partial<(typeof pickerState.exercises)[number]> = {}) {
  return {
    id: 1,
    name: 'Flat Dumbbell Press',
    category: ExerciseCategory.resistance,
    description: null,
    equipment: [],
    primaryMuscles: [],
    secondaryMuscles: [],
    createdByUserId: null,
    ...overrides,
  };
}

describe('ExercisePickerDialog', () => {
  beforeEach(() => {
    pickerState.exercises = [];
    pickerState.addExercise.mockReset();
  });

  it('allows creating a same-name exercise when only the opposite category exists', () => {
    pickerState.exercises = [makeExercise({category: ExerciseCategory.cardio})];

    render(
      <ExercisePickerDialog
        open
        title="Change Exercise"
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Search exercises'), {target: {value: 'Flat Dumbbell Press'}});

    expect(screen.getByText(/Create "Flat Dumbbell Press"/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Create "Flat Dumbbell Press"/));

    expect(screen.getByText('create-form:resistance:Flat Dumbbell Press')).toBeInTheDocument();
  });

  it('hides the create option when the exact name exists in the active category', () => {
    pickerState.exercises = [makeExercise()];

    render(
      <ExercisePickerDialog
        open
        title="Change Exercise"
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Search exercises'), {target: {value: 'flat dumbbell press'}});

    expect(screen.queryByText(/Create "flat dumbbell press"/i)).not.toBeInTheDocument();
  });

  it('passes the active category into create and selects the created exercise immediately', () => {
    const onSelect = vi.fn();

    render(
      <ExercisePickerDialog
        open
        title="Add Exercise"
        onClose={vi.fn()}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Cardio'}));
    fireEvent.change(screen.getByLabelText('Search exercises'), {target: {value: 'Air Bike'}});
    fireEvent.click(screen.getByText(/Create "Air Bike"/));
    fireEvent.click(screen.getByRole('button', {name: 'finish-create'}));

    expect(pickerState.addExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Air Bike',
        category: ExerciseCategory.cardio,
      }),
    );
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Air Bike',
        category: ExerciseCategory.cardio,
      }),
    );
  });
});
