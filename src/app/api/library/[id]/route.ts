import { NextRequest, NextResponse } from 'next/server';
import { authenticationErrorResponse, requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { forbiddenResponse, notFoundResponse } from '@lib/apiResponses';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requireSession();
  } catch (_e) {
    return authenticationErrorResponse();
  }

  const { id } = await params;
  const userId = session.user.id;

  const asset = await prisma.libraryAsset.findUnique({ where: { id }, select: { userId: true } });
  if (!asset) return notFoundResponse('Library asset');
  if (asset.userId !== userId) return forbiddenResponse();

  await prisma.libraryAsset.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
