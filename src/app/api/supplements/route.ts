import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticationErrorResponse, isAuthenticationError, requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';

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
    const supplement = await prisma.supplement.create({
      data: {
        userId: session.user.id,
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
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    return errorResponse('Failed to create supplement', 500);
  }
}
