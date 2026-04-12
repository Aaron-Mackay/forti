import {NextRequest, NextResponse} from 'next/server';
import {updateUserMetric} from '@/lib/api';
import confirmPermission from "@lib/confirmPermission";
import {MetricSchema} from "@lib/apiSchemas";
import {errorResponse, validationErrorResponse} from "@lib/apiResponses";
import {Prisma} from "@/generated/prisma/browser";
import {authenticationErrorResponse, isAuthenticationError} from "@lib/requireSession";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = MetricSchema.safeParse(json);

    if (!parsed.success) {
      console.error(parsed.error);
      return validationErrorResponse(parsed.error);
    }

    await confirmPermission(parsed.data.userId);

    const {customMetrics, ...rest} = parsed.data;
    const completeMetric = {
      weight: null,
      steps: null,
      sleepMins: null,
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      ...rest,
      customMetrics: (customMetrics ?? null) as Prisma.InputJsonValue | null,
    };

    const updated = await updateUserMetric(completeMetric);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    console.error(err);
    return errorResponse('Failed to update metric', 500);
  }
}
