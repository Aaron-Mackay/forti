import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireSession, authenticationErrorResponse } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { errorResponse } from '@lib/apiResponses';
import { getWeekStart, toDateOnly } from '@lib/checkInUtils';
import { deleteBlobIfManaged, getBlobToken } from '@lib/vercelBlob';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const VALID_ANGLES = ['front', 'back', 'side'] as const;
type Angle = (typeof VALID_ANGLES)[number];

const ANGLE_FIELD: Record<Angle, 'frontPhotoUrl' | 'backPhotoUrl' | 'sidePhotoUrl'> = {
  front: 'frontPhotoUrl',
  back: 'backPhotoUrl',
  side: 'sidePhotoUrl',
};

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
    return errorResponse('Upload request too large. Max 10MB.', 400);
  }

  const angle = form.get('angle')?.toString() as Angle | undefined;
  const file = form.get('file');

  if (!angle || !(VALID_ANGLES as readonly string[]).includes(angle)) {
    return errorResponse('angle must be front, back, or side', 400);
  }
  if (!(file instanceof File)) return errorResponse('file is required', 400);
  if (file.size <= 0) return errorResponse('File cannot be empty', 400);
  if (file.size > MAX_BYTES) return errorResponse('File is too large (max 10MB)', 400);
  if (!ALLOWED_MIME.has(file.type)) return errorResponse('Unsupported file type', 400);

  // Find or create current week's check-in
  const weekStart = toDateOnly(getWeekStart(new Date()));
  let checkIn = await prisma.weeklyCheckIn.findUnique({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
  });
  if (!checkIn) {
    checkIn = await prisma.weeklyCheckIn.create({
      data: { userId, weekStartDate: weekStart },
    });
  }

  // Delete old blob at this angle if one exists
  const field = ANGLE_FIELD[angle];
  const existingRecord = checkIn as typeof checkIn & {
    frontPhotoUrl?: string | null;
    backPhotoUrl?: string | null;
    sidePhotoUrl?: string | null;
  };
  await deleteBlobIfManaged(existingRecord[field]);

  // Upload to Vercel Blob
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const path = `progress-photos/${userId}/${weekStartStr}/${angle}.jpg`;
  const token = getBlobToken('private');

  let blob;
  try {
    blob = await put(path, file, {
      access: 'private',
      contentType: file.type,
      token,
      addRandomSuffix: false,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Upload failed', 500);
  }

  await prisma.weeklyCheckIn.update({
    where: { id: checkIn.id },
    data: { [field]: blob.pathname },
  });

  const proxyUrl = `/api/check-in/photos/${checkIn.id}/${angle}`;
  return NextResponse.json({ url: proxyUrl });
}

export async function DELETE(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return authenticationErrorResponse();
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid request body', 400);
  }

  const angle = typeof body === 'object' && body !== null && 'angle' in body
    ? (body.angle as Angle | undefined)
    : undefined;

  if (!angle || !(VALID_ANGLES as readonly string[]).includes(angle)) {
    return errorResponse('angle must be front, back, or side', 400);
  }

  const weekStart = toDateOnly(getWeekStart(new Date()));
  const checkIn = await prisma.weeklyCheckIn.findUnique({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
    select: {
      id: true,
      frontPhotoUrl: true,
      backPhotoUrl: true,
      sidePhotoUrl: true,
    },
  });

  if (!checkIn) {
    return NextResponse.json({ ok: true });
  }

  const field = ANGLE_FIELD[angle];
  const existingUrl = checkIn[field];

  if (existingUrl) {
    await deleteBlobIfManaged(existingUrl);
    await prisma.weeklyCheckIn.update({
      where: { id: checkIn.id },
      data: { [field]: null },
    });
  }

  return NextResponse.json({ ok: true });
}
