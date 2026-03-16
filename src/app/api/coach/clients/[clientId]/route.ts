import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await requireSession();
  const userId = session.user.id;

  const { clientId } = await params;

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { coachId: true },
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  if (client.coachId !== userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: clientId },
    data: { coachId: null },
  });

  return NextResponse.json({ success: true });
}
