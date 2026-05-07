import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticationErrorResponse, isAuthenticationError, requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';
import { supplementWithVersions } from '@lib/supplementVersions';
import { toDateOnly } from '@lib/checkInUtils';

const SupplementPostSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  notes: z.string().nullable().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const supplements = await prisma.supplement.findMany({
      where: { userId: session.user.id },
      orderBy: { startDate: 'desc' },
      include: supplementWithVersions,
    });
    return NextResponse.json(supplements);
  } catch (err: unknown) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    return errorResponse('Failed to fetch supplements', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const json = await req.json();
    const parsed = SupplementPostSchema.safeParse(json);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { name, dosage, frequency, notes, startDate, endDate } = parsed.data;

    const supplement = await prisma.$transaction(async (tx) => {
      const created = await tx.supplement.create({
        data: {
          userId: session.user.id,
          name,
          startDate,
          endDate: endDate ?? null,
        },
      });
      await tx.supplementVersion.create({
        data: {
          supplementId: created.id,
          effectiveFrom: toDateOnly(startDate),
          dosage,
          frequency,
          notes: notes ?? null,
        },
      });
      return tx.supplement.findUniqueOrThrow({
        where: { id: created.id },
        include: supplementWithVersions,
      });
    });

    return NextResponse.json(supplement, { status: 201 });
  } catch (err: unknown) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    return errorResponse('Failed to create supplement', 500);
  }
}
