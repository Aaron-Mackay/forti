import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';

export async function DELETE() {
  const session = await requireSession();
  const userId = session.user.id;

  await prisma.user.update({
    where: { id: userId },
    data: { coachId: null },
  });

  return NextResponse.json({ success: true });
}
