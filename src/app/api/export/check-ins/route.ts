import { NextResponse } from 'next/server';
import { authenticationErrorResponse, isAuthenticationError, requireSession } from '@lib/requireSession';
import { getUserCheckIns } from '@lib/userService';
import { buildCsv } from '@/utils/csvExport';
import { errorResponse } from '@lib/apiResponses';

const HEADERS = [
  'week_start_date', 'completed_at', 'energy_level', 'mood_rating', 'stress_level',
  'sleep_quality', 'recovery_rating', 'adherence_rating', 'completed_workouts',
  'planned_workouts', 'week_review', 'coach_message', 'goals_next_week',
  'coach_notes', 'coach_reviewed_at',
];

export async function GET() {
  try {
    const session = await requireSession();
    const checkIns = await getUserCheckIns(session.user.id);

    const rows = checkIns.map(c => [
      c.weekStartDate.toISOString().slice(0, 10),
      c.completedAt ? c.completedAt.toISOString().slice(0, 10) : '',
      c.energyLevel ?? '',
      c.moodRating ?? '',
      c.stressLevel ?? '',
      c.sleepQuality ?? '',
      c.recoveryRating ?? '',
      c.adherenceRating ?? '',
      c.completedWorkouts ?? '',
      c.plannedWorkouts ?? '',
      c.weekReview ?? '',
      c.coachMessage ?? '',
      c.goalsNextWeek ?? '',
      c.coachNotes ?? '',
      c.coachReviewedAt ? c.coachReviewedAt.toISOString().slice(0, 10) : '',
    ]);

    const csv = buildCsv(HEADERS, rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="forti-check-ins.csv"',
      },
    });
  } catch (error) {
    if (isAuthenticationError(error)) return authenticationErrorResponse();
    console.error(error);
    return errorResponse('Failed to export check-ins', 500);
  }
}
