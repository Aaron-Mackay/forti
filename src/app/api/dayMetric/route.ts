import {NextRequest, NextResponse} from 'next/server';
import {updateUserDayMetric} from '@/lib/api';
import {z} from 'zod';

// Define your validation schema
const DayMetricSchema = z.object({
  userId: z.number().int().positive(),
  date: z.coerce.date(), // Accepts string or Date, coerces to Date
  workout: z.boolean().optional(),
  weight: z.number().optional().nullable(),
  steps: z.number().int().optional().nullable(),
  sleepMins: z.number().int().optional().nullable(),
  calories: z.number().int().optional().nullable(),
  protein: z.number().int().optional().nullable(),
  carbs: z.number().int().optional().nullable(),
  fat: z.number().int().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = DayMetricSchema.safeParse(json);

    if (!parsed.success) {
      console.error(parsed.error)
      return NextResponse.json(
        {error: 'Invalid request', issues: parsed.error.flatten()},
        {status: 400}
      );
    }

    const completeDayMetric = {
      workout: false,
      weight: null,
      steps: null,
      sleepMins: null,
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      ...parsed.data
    };

    const updated = await updateUserDayMetric(completeDayMetric);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({error: 'Failed to update day metric'}, {status: 500});
  }
}
