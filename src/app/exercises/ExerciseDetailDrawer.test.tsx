import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ExerciseCategory} from '@/generated/prisma/browser';
import ExerciseDetailDrawer from './ExerciseDetailDrawer';

vi.mock('@/components/MuscleHighlight', () => ({
  default: () => <div data-testid="muscle-highlight"/>,
}));

const exercise = {
  id: 1,
  name: 'Bench Press',
  category: 'resistance' as ExerciseCategory,
  description: 'Base description',
  equipment: ['barbell'],
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps'],
  createdByUserId: null,
};

describe('ExerciseDetailDrawer', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/e1rm-history')) {
        return Promise.resolve(new Response('[]', {status: 200, headers: {'Content-Type': 'application/json'}}));
      }
      return Promise.resolve(new Response('{}', {status: 200, headers: {'Content-Type': 'application/json'}}));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows assigned coach note read-only and keeps user note editable outside coach portal', () => {
    render(
      <ExerciseDetailDrawer
        exercise={exercise}
        onClose={vi.fn()}
        coachNote={{note: 'Keep elbows tucked.', url: 'https://example.com/video'}}
        userExerciseNote="Pause on the chest."
        isCoachPortal={false}
        onCoachNoteSave={vi.fn()}
        onUserExerciseNoteSave={vi.fn()}
      />,
    );

    expect(screen.getByText('From your coach')).toBeInTheDocument();
    expect(screen.getByText('Keep elbows tucked.')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Open coach link'})).toHaveAttribute('href', 'https://example.com/video');
    expect(screen.getByText('Your exercise notes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pause on the chest.')).toBeInTheDocument();
    expect(screen.queryByText('Notes for clients')).not.toBeInTheDocument();
  });

  it('shows coach editing fields only in coach portal and saves note plus url', async () => {
    const onCoachNoteSave = vi.fn();

    render(
      <ExerciseDetailDrawer
        exercise={exercise}
        onClose={vi.fn()}
        coachNote={undefined}
        userExerciseNote=""
        isCoachPortal
        onCoachNoteSave={onCoachNoteSave}
        onUserExerciseNoteSave={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Notes for clients'), {target: {value: 'Drive through the floor.'}});
    fireEvent.change(screen.getByLabelText('Reference URL'), {target: {value: 'https://youtube.com/watch?v=demo'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save'}));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/coach/exercise-description/1',
        expect.objectContaining({
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            note: 'Drive through the floor.',
            url: 'https://youtube.com/watch?v=demo',
          }),
        }),
      );
    });

    expect(onCoachNoteSave).toHaveBeenCalledWith(1, {
      note: 'Drive through the floor.',
      url: 'https://youtube.com/watch?v=demo',
    });
    expect(screen.queryByText('Your exercise notes')).not.toBeInTheDocument();
  });
});
