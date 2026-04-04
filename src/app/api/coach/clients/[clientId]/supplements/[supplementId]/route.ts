import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticationErrorResponse, isAuthenticationError, requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { notFoundResponse, forbiddenResponse, errorResponse, validationErrorResponse } from '@lib/apiResponses';
import { getActiveVersion, supplementWithVersions } from '@lib/supplementVersions';
import { toDateOnly } from '@lib/checkInUtils';

const SupplementPatchSchema = z.object({
  name:          z.string().min(1).optional(),
  dosage:        z.string().min(1).optional(),
  frequency:     z.string().min(1).optional(),
  notes:         z.string().nullable().optional(),
  startDate:     z.coerce.date().optional(),
  endDate:       z.coerce.date().nullable().optional(),
  effectiveFrom: z.coerce.date().optional(),
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

  const supplement = await prisma.supplement.findUnique({
    where: { id: supplementId },
    include: supplementWithVersions,
  });
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

    const { name, dosage, frequency, notes, startDate, endDate, effectiveFrom } = parsed.data;
    const hasVersionChanges = dosage !== undefined || frequency !== undefined || notes !== undefined;
    const hasHeaderChanges  = name !== undefined || startDate !== undefined || endDate !== undefined;

    const updated = await prisma.$transaction(async (tx) => {
      if (hasHeaderChanges) {
        await tx.supplement.update({
          where: { id },
          data: {
            ...(name      !== undefined && { name }),
            ...(startDate !== undefined && { startDate }),
            ...('endDate' in parsed.data && { endDate }),
          },
        });
      }
      if (hasVersionChanges) {
        const active = getActiveVersion(supplement);
        const effDate = toDateOnly(effectiveFrom ?? new Date());
        await tx.supplementVersion.upsert({
          where: { supplementId_effectiveFrom: { supplementId: id, effectiveFrom: effDate } },
          create: {
            supplementId: id,
            effectiveFrom: effDate,
            dosage:    dosage    ?? active?.dosage    ?? '',
            frequency: frequency ?? active?.frequency ?? '',
            notes:     notes !== undefined ? notes : (active?.notes ?? null),
          },
          update: {
            ...(dosage    !== undefined && { dosage }),
            ...(frequency !== undefined && { frequency }),
            ...(notes     !== undefined && { notes }),
          },
        });
      }
      return tx.supplement.findUniqueOrThrow({
        where: { id },
        include: supplementWithVersions,
      });
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
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
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    return errorResponse('Failed to delete supplement', 500);
  }
}
