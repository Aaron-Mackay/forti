import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { forbiddenResponse, errorResponse, validationErrorResponse } from '@lib/apiResponses';

const SupplementPostSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  notes: z.string().nullable().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
});

async function authoriseCoach(coachId: string, clientId: string) {
  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: { settings: true },
  });
  const settings = parseDashboardSettings(coach?.settings);
  if (!settings.coachModeActive) return false;

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { coachId: true },
  });
  return client?.coachId === coachId;
}

/**
 * GET /api/coach/clients/[clientId]/supplements
 * Returns supplements for a coach's client (read-only view).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await requireSession();
    const { clientId } = await params;
    if (!(await authoriseCoach(session.user.id, clientId))) return forbiddenResponse();

    const supplements = await prisma.supplement.findMany({
      where: { userId: clientId },
      orderBy: { startDate: 'desc' },
    });
    return NextResponse.json(supplements);
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Failed to fetch client supplements', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await requireSession();
    const { clientId } = await params;
    if (!(await authoriseCoach(session.user.id, clientId))) return forbiddenResponse();

    const json = await req.json();
    const parsed = SupplementPostSchema.safeParse(json);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const supplement = await prisma.supplement.create({
      data: {
        userId: clientId,
        name: parsed.data.name,
        dosage: parsed.data.dosage,
        frequency: parsed.data.frequency,
        notes: parsed.data.notes ?? null,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate ?? null,
      },
    });
    return NextResponse.json(supplement, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Failed to create supplement', 500);
  }
}
