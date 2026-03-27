import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { notFoundResponse, forbiddenResponse, errorResponse, validationErrorResponse } from '@lib/apiResponses';

const SupplementPatchSchema = z.object({
  name: z.string().min(1).optional(),
  dosage: z.string().min(1).optional(),
  frequency: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
}).strict();

async function authoriseCoach(coachId: string, clientId: string, supplementId: number) {
  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: { settings: true },
  });
  const settings = parseDashboardSettings(coach?.settings);
  if (!settings.coachModeActive) return null;

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { coachId: true },
  });
  if (client?.coachId !== coachId) return null;

  const supplement = await prisma.supplement.findUnique({ where: { id: supplementId } });
  if (!supplement || supplement.userId !== clientId) return null;
  return supplement;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; supplementId: string }> }
) {
  try {
    const session = await requireSession();
    const { clientId, supplementId } = await params;
    const id = Number(supplementId);

    const supplement = await authoriseCoach(session.user.id, clientId, id);
    if (!supplement) return forbiddenResponse();

    const json = await req.json();
    const parsed = SupplementPatchSchema.safeParse(json);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const updated = await prisma.supplement.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Failed to update supplement', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string; supplementId: string }> }
) {
  try {
    const session = await requireSession();
    const { clientId, supplementId } = await params;
    const id = Number(supplementId);

    const supplement = await authoriseCoach(session.user.id, clientId, id);
    if (!supplement) return notFoundResponse('Supplement');

    await prisma.supplement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Failed to delete supplement', 500);
  }
}
