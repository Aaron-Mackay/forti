import {NextRequest, NextResponse} from 'next/server';
import {updateUserDayMetric} from '@/lib/api';
import confirmPermission from "@lib/confirmPermission";
import {DayMetricSchema} from "@lib/apiSchemas";
import {errorResponse, validationErrorResponse} from "@lib/apiResponses";
import {Prisma} from "@prisma/client";
import {authenticationErrorResponse, isAuthenticationError} from "@lib/requireSession";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = DayMetricSchema.safeParse(json);

    if (!parsed.success) {
      console.error(parsed.error);
      return validationErrorResponse(parsed.error);
    }

    await confirmPermission(parsed.data.userId);

    const {customMetrics, ...rest} = parsed.data;
    const completeDayMetric = {
      weight: null,
      steps: null,
      sleepMins: null,
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      caloriesTarget: null,
      proteinTarget: null,
      carbsTarget: null,
      fatTarget: null,
      stepsTarget: null,
      sleepMinsTarget: null,
      ...rest,
      customMetrics: (customMetrics ?? null) as Prisma.InputJsonValue | null,
    };

    const updated = await updateUserDayMetric(completeDayMetric);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    console.error(err);
    return errorResponse('Failed to update day metric', 500);
  }
}
