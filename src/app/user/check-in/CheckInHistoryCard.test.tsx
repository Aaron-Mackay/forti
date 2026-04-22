import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import type {WeeklyCheckIn} from '@/generated/prisma/browser';
import {CheckInDetails} from './CheckInHistoryCard';

function makeCheckIn(overrides: Partial<WeeklyCheckIn> = {}): WeeklyCheckIn {
  return {
    id: 1,
    userId: 'client-1',
    weekStartDate: new Date('2026-03-09T00:00:00.000Z'),
    completedAt: new Date('2026-03-14T10:00:00.000Z'),
    energyLevel: null,
    moodRating: null,
    stressLevel: null,
    sleepQuality: null,
    recoveryRating: null,
    adherenceRating: null,
    completedWorkouts: null,
    plannedWorkouts: null,
    weekReview: null,
    coachMessage: null,
    goalsNextWeek: null,
    customResponses: null,
    templateSnapshot: null,
    coachNotes: 'Nice work this week',
    coachResponseUrl: null,
    coachReviewedAt: null,
    frontPhotoUrl: null,
    backPhotoUrl: null,
    sidePhotoUrl: null,
    ...overrides,
  };
}

describe('CheckInDetails coach response rendering', () => {
  it('embeds Loom response links', () => {
    render(
      <CheckInDetails
        checkIn={makeCheckIn({coachResponseUrl: 'https://www.loom.com/share/abc123DEF'})}
      />,
    );

    const iframe = screen.getByTitle('Coach Loom response');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://www.loom.com/embed/abc123DEF');
    expect(screen.queryByRole('link', {name: 'Open coach response'})).not.toBeInTheDocument();
  });

  it('falls back to external link for non-Loom URLs', () => {
    render(
      <CheckInDetails
        checkIn={makeCheckIn({coachResponseUrl: 'https://example.com/review'})}
      />,
    );

    const link = screen.getByRole('link', {name: 'Open coach response'});
    expect(link).toHaveAttribute('href', 'https://example.com/review');
    expect(screen.queryByTitle('Coach Loom response')).not.toBeInTheDocument();
  });
});
