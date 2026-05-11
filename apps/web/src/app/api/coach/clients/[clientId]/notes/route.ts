import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { forbiddenResponse, notFoundResponse, validationErrorResponse } from '@lib/apiResponses';

const PatchSchema = z.object({
  notes: z.string().max(10000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await requireSession();
  const coachId = session.user.id;
  const { clientId } = await params;

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { coachId: true },
  });

  if (!client) return notFoundResponse('Client');
  if (client.coachId !== coachId) return forbiddenResponse();

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  await prisma.user.update({
    where: { id: clientId },
    data: { coachClientNotes: parsed.data.notes },
  });

  return NextResponse.json({ success: true });
}
