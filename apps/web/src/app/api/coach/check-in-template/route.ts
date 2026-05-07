import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import { parseDashboardSettings } from '@/types/settingsTypes';
import prisma from '@lib/prisma';
import { getCoachTemplate, saveCoachTemplate, deleteCoachTemplate } from '@lib/checkInTemplate';
import { validateTemplate } from '@/types/checkInTemplateTypes';
import type { CheckInTemplate } from '@/types/checkInTemplateTypes';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';
import { CheckInTemplateUpdateRequestSchema } from '@lib/contracts/checkIn';

async function requireCoachMode(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  return parseDashboardSettings(user?.settings).coachModeActive;
}

/** GET /api/coach/check-in-template — fetch the coach's current template */
export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  if (!(await requireCoachMode(userId))) {
    return errorResponse('Coach mode is not active', 403);
  }

  const template = await getCoachTemplate(userId);
  return NextResponse.json({ template });
}

/** PUT /api/coach/check-in-template — save or replace the coach's template */
export async function PUT(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  if (!(await requireCoachMode(userId))) {
    return errorResponse('Coach mode is not active', 403);
  }

  const json = await req.json().catch(() => null);
  if (json == null) return errorResponse('Invalid JSON body', 400);

  const parsed = CheckInTemplateUpdateRequestSchema.safeParse(json);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  // Inner template shape is validated by validateTemplate() — the contract
  // schema only enforces that `template` is an object.
  const template = parsed.data.template as unknown as CheckInTemplate;
  const validationError = validateTemplate(template);
  if (validationError) {
    return errorResponse(validationError, 400);
  }

  await saveCoachTemplate(userId, template);
  return NextResponse.json({ template });
}

/** DELETE /api/coach/check-in-template — remove the template; clients revert to the default form */
export async function DELETE() {
  const session = await requireSession();
  const userId = session.user.id;

  if (!(await requireCoachMode(userId))) {
    return errorResponse('Coach mode is not active', 403);
  }

  await deleteCoachTemplate(userId);
  return NextResponse.json({ template: null });
}
