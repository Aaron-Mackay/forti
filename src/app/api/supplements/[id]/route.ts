import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { errorResponse, notFoundResponse, forbiddenResponse, validationErrorResponse } from '@lib/apiResponses';

const SupplementPatchSchema = z.object({
  name: z.string().min(1).optional(),
  dosage: z.string().min(1).optional(),
  frequency: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
}).strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const supplementId = Number(id);

    const supplement = await prisma.supplement.findUnique({ where: { id: supplementId } });
    if (!supplement) return notFoundResponse('Supplement');
    if (supplement.userId !== session.user.id) return forbiddenResponse();

    const json = await req.json();
    const parsed = SupplementPatchSchema.safeParse(json);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const updated = await prisma.supplement.update({
      where: { id: supplementId },
      data: parsed.data,
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Failed to update supplement', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const supplementId = Number(id);

    const supplement = await prisma.supplement.findUnique({ where: { id: supplementId } });
    if (!supplement) return notFoundResponse('Supplement');
    if (supplement.userId !== session.user.id) return forbiddenResponse();

    await prisma.supplement.delete({ where: { id: supplementId } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    return errorResponse('Failed to delete supplement', 500);
  }
}
