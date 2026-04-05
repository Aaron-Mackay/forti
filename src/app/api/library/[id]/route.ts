import { NextRequest, NextResponse } from 'next/server';
import { authenticationErrorResponse, requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { forbiddenResponse, notFoundResponse, validationErrorResponse } from '@lib/apiResponses';
import { deleteBlobIfManaged } from '@lib/vercelBlob';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(500).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
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
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const asset = await prisma.libraryAsset.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!asset) return notFoundResponse('Library asset');
  if (asset.userId !== userId) return forbiddenResponse();

  const updated = await prisma.libraryAsset.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
    },
  });

  return NextResponse.json(updated);
}

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

  const asset = await prisma.libraryAsset.findUnique({
    where: { id },
    select: { userId: true, url: true },
  });
  if (!asset) return notFoundResponse('Library asset');
  if (asset.userId !== userId) return forbiddenResponse();

  await prisma.libraryAsset.delete({ where: { id } });
  await deleteBlobIfManaged(asset.url);
  return new NextResponse(null, { status: 204 });
}
