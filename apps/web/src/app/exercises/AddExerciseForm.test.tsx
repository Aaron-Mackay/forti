import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ExerciseCategory} from '@/generated/prisma/browser';
import {createExercise} from '@lib/clientApi';
import {AddExerciseForm} from './AddExerciseForm';

vi.mock('@/components/fitness/MuscleHighlight', () => ({
  default: () => <div data-testid="muscle-highlight" />,
}));

vi.mock('@lib/clientApi', () => ({
  createExercise: vi.fn(),
}));

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material');
  return {
    ...actual,
    Autocomplete: ({
      onChange,
      options,
      renderInput,
    }: {
      onChange: (_event: unknown, value: string[]) => void;
      options: string[];
      renderInput: (params: Record<string, unknown>) => {props: {label?: string}};
    }) => {
      const label = renderInput({}).props.label ?? 'Autocomplete';
      return (
        <button type="button" aria-label={label} onClick={() => onChange(null, [options[0]])}>
          {label}
        </button>
      );
    },
  };
});

describe('AddExerciseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits the provided category when creating a new exercise', async () => {
    (createExercise as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      name: 'Air Bike',
      category: ExerciseCategory.cardio,
      description: null,
      equipment: ['barbell'],
      primaryMuscles: ['abs'],
      secondaryMuscles: [],
      createdByUserId: 'user-1',
    });

    render(
      <AddExerciseForm
        open
        onClose={vi.fn()}
        initialName="Air Bike"
        category={ExerciseCategory.cardio}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Equipment (required)'}));
    fireEvent.click(screen.getByRole('button', {name: 'Primary Muscles (required)'}));
    fireEvent.click(screen.getByRole('button', {name: 'Add Exercise'}));

    await waitFor(() => {
      expect(createExercise).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Air Bike',
          category: ExerciseCategory.cardio,
        }),
      );
    });
  });
});
