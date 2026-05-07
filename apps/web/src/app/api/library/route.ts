import { NextRequest, NextResponse } from 'next/server';
import { authenticationErrorResponse, requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { z } from 'zod';
import { LibraryAssetType } from '@/generated/prisma/browser';

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(500).nullable().optional(),
  type: z.nativeEnum(LibraryAssetType),
  url: z.string().url().nullable().optional(),
  isCoachAsset: z.boolean().optional().default(false),
});

export async function GET(_req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch (_e) {
    return authenticationErrorResponse();
  }
  const userId = session.user.id;
  const assets = await prisma.libraryAsset.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch (_e) {
    return authenticationErrorResponse();
  }

  const userId = session.user.id;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { title, description, type, url, isCoachAsset } = parsed.data;

  // Validate URL is present when type is LINK
  if (type === 'LINK' && !url) {
    return errorResponse('URL is required for link assets', 400);
  }

  // Only allow isCoachAsset if user has coach mode active
  if (isCoachAsset) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true } });
    const settings = parseDashboardSettings(user?.settings);
    if (!settings.coachModeActive) {
      return errorResponse('Coach mode is not active', 403);
    }
  }

  const asset = await prisma.libraryAsset.create({
    data: {
      userId,
      title,
      description: description ?? null,
      type,
      url: type === 'LINK' ? (url ?? null) : null,
      isCoachAsset: isCoachAsset ?? false,
    },
  });

  return NextResponse.json(asset, { status: 201 });
}
