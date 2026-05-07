import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireSession, authenticationErrorResponse } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { errorResponse } from '@lib/apiResponses';
import { deleteBlobIfManaged, getBlobToken } from '@lib/vercelBlob';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return authenticationErrorResponse();
  }
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      coachLogoUrl: true,
      coach: { select: { coachLogoUrl: true } },
    },
  });

  // Priority: own logo (coach viewing their portal) → coach's logo (client) → null
  const coachLogoUrl = user?.coachLogoUrl ?? user?.coach?.coachLogoUrl ?? null;
  return NextResponse.json({ coachLogoUrl });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return authenticationErrorResponse();
  }
  const userId = session.user.id;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse('Upload request too large. Max 2MB.', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return errorResponse('file is required', 400);
  if (file.size <= 0) return errorResponse('File cannot be empty', 400);
  if (file.size > MAX_BYTES) return errorResponse('File is too large (max 2MB)', 400);
  if (!ALLOWED_MIME.has(file.type)) return errorResponse('Unsupported file type', 400);

  // Delete existing logo blob before uploading the new one
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { coachLogoUrl: true },
  });
  await deleteBlobIfManaged(existing?.coachLogoUrl);

  const path = `coach-logos/${userId}/logo.jpg`;
  const token = getBlobToken('public');

  let blob;
  try {
    blob = await put(path, file, {
      access: 'public',
      contentType: file.type,
      token,
      addRandomSuffix: false,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Upload failed', 500);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { coachLogoUrl: blob.url },
  });

  return NextResponse.json({ url: blob.url });
}

export async function DELETE() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return authenticationErrorResponse();
  }
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coachLogoUrl: true },
  });

  if (user?.coachLogoUrl) {
    await deleteBlobIfManaged(user.coachLogoUrl);
    await prisma.user.update({
      where: { id: userId },
      data: { coachLogoUrl: null },
    });
  }

  return NextResponse.json({ ok: true });
}
