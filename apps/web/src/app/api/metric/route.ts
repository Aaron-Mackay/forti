import {NextRequest, NextResponse} from 'next/server';
import {updateUserMetric} from '@/lib/metricService';
import confirmPermission from "@lib/confirmPermission";
import {MetricSchema} from "@lib/contracts/metrics";
import {errorResponse, validationErrorResponse} from "@lib/apiResponses";
import {Prisma} from "@/generated/prisma/browser";
import {isAuthenticationError} from "@lib/requireSession";
import { logInvalidJson, logUnexpectedError, logValidationError, summarizePayload, type RequestLogContext } from '@lib/apiLogging';
import { withApiRoute } from '@lib/routeAuth';

export const POST = withApiRoute({ route: '/api/metric' }, async function POST(ctx: RequestLogContext, req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    if (json == null) {
      logInvalidJson(ctx);
      return errorResponse('Invalid JSON body', 400);
    }

    const parsed = MetricSchema.safeParse(json);

    if (!parsed.success) {
      logValidationError(ctx, parsed.error, summarizePayload(json, ['userId', 'date']));
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
    if (isAuthenticationError(err)) throw err;
    logUnexpectedError(ctx, err);
    return errorResponse('Failed to update metric', 500);
  }
});
