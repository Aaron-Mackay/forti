import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import { getUserData } from '@lib/api';
import { buildCsv } from '@/utils/csvExport';
import { errorResponse } from '@lib/apiResponses';

const HEADERS = [
  'plan_name', 'plan_description', 'week_number', 'workout_name', 'workout_notes',
  'workout_date_completed', 'exercise_name', 'exercise_category', 'rep_range',
  'rest_time', 'exercise_notes', 'set_number', 'reps', 'weight_kg', 'e1rm', 'is_drop_set',
];

export async function GET() {
  try {
    const session = await requireSession();
    const user = await getUserData(session.user.id);
    if (!user) return errorResponse('User not found', 404);

    const rows: unknown[][] = [];

    for (const plan of user.plans) {
      for (const week of plan.weeks) {
        for (const workout of week.workouts) {
          for (const we of workout.exercises) {
            const dateCompleted = workout.dateCompleted
              ? workout.dateCompleted.toISOString().slice(0, 10)
              : '';
            const base = [
              plan.name,
              plan.description ?? '',
              week.order,
              workout.name,
              workout.notes ?? '',
              dateCompleted,
              we.exercise.name,
              we.exercise.category ?? '',
              we.repRange ?? '',
              we.restTime ?? '',
              we.notes ?? '',
            ];

            if (we.sets.length === 0) {
              // Cardio or unlogged exercise — emit a single row with no set data
              rows.push([...base, '', '', '', '', '']);
            } else {
              for (const set of we.sets) {
                rows.push([
                  ...base,
                  set.order,
                  set.reps ?? '',
                  set.weight ?? '',
                  set.e1rm ?? '',
                  set.isDropSet ? 'yes' : 'no',
                ]);
              }
            }
          }
        }
      }
    }

    const csv = buildCsv(HEADERS, rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="forti-training-plans.csv"',
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return errorResponse('Failed to export training data', 500);
  }
}
