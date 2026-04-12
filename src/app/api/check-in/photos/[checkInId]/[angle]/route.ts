import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { requireSession, authenticationErrorResponse } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { notFoundResponse, forbiddenResponse, errorResponse } from '@lib/apiResponses';
import { getBlobToken, getManagedBlobPathname } from '@lib/vercelBlob';

const VALID_ANGLES = ['front', 'back', 'side'] as const;
type Angle = (typeof VALID_ANGLES)[number];

const ANGLE_FIELD: Record<Angle, 'frontPhotoUrl' | 'backPhotoUrl' | 'sidePhotoUrl'> = {
  front: 'frontPhotoUrl',
  back: 'backPhotoUrl',
  side: 'sidePhotoUrl',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ checkInId: string; angle: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return authenticationErrorResponse();
  }
  const userId = session.user.id;

  const { checkInId: checkInIdStr, angle } = await params;
  const checkInId = parseInt(checkInIdStr);
  if (isNaN(checkInId)) return notFoundResponse('Check-in');

  if (!(VALID_ANGLES as readonly string[]).includes(angle)) {
    return errorResponse('angle must be front, back, or side', 400);
  }

  const checkIn = await prisma.weeklyCheckIn.findUnique({
    where: { id: checkInId },
    select: {
      frontPhotoUrl: true,
      backPhotoUrl: true,
      sidePhotoUrl: true,
      userId: true,
      user: { select: { coachId: true } },
    },
  });

  if (!checkIn) return notFoundResponse('Check-in');

  // Authorise: requester must be the owner OR the owner's coach
  if (checkIn.userId !== userId && checkIn.user.coachId !== userId) {
    return forbiddenResponse();
  }

  const blobReference = checkIn[ANGLE_FIELD[angle as Angle]];
  if (!blobReference) return notFoundResponse('Photo');

  let token: string;
  try {
    token = getBlobToken('private');
  } catch {
    return errorResponse('Storage not configured', 500);
  }

  const pathname = getManagedBlobPathname(blobReference);
  const source = pathname ?? blobReference;

  let upstream;
  try {
    upstream = await get(source, {
      access: 'private',
      token,
      useCache: false,
    });
  } catch {
    return errorResponse('Failed to fetch photo', 502);
  }

  if (!upstream) {
    return notFoundResponse('Photo');
  }

  if (upstream.statusCode !== 200 || !upstream.stream) {
    return errorResponse('Failed to fetch photo', 502);
  }

  const contentType = upstream.blob.contentType ?? 'image/jpeg';
  return new NextResponse(upstream.stream, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
