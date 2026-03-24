import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';

const ProfileSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const json = await req.json();
    const parsed = ProfileSchema.safeParse(json);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    console.error(err);
    return errorResponse('Failed to update profile', 500);
  }
}
