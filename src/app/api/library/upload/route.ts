import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { LibraryAssetType } from '@prisma/client';
import { authenticationErrorResponse, requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { errorResponse } from '@lib/apiResponses';
import { parseDashboardSettings } from '@/types/settingsTypes';
import {
  buildBlobPath,
  getMaxUploadBytes,
  validateAssetFile,
  getBlobToken,
} from '@lib/vercelBlob';

const NON_LINK_TYPES = new Set<Exclude<LibraryAssetType, 'LINK'>>(['DOCUMENT', 'IMAGE', 'VIDEO']);

function parseBoolean(value: FormDataEntryValue | null): boolean {
  if (typeof value !== 'string') return false;
  return value === 'true';
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch (_e) {
    return authenticationErrorResponse();
  }

  const userId = session.user.id;
  const { maxUploadMb, maxUploadBytes } = getMaxUploadBytes();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse(`Upload request too large. Max ${maxUploadMb}MB.`, 400);
  }

  const title = (form.get('title')?.toString().trim() ?? '');
  const description = form.get('description')?.toString().trim() ?? '';
  const type = form.get('type')?.toString() as LibraryAssetType | undefined;
  const isCoachAsset = parseBoolean(form.get('isCoachAsset'));
  const file = form.get('file');

  if (!title) return errorResponse('Title is required', 400);
  if (!type || !NON_LINK_TYPES.has(type as Exclude<LibraryAssetType, 'LINK'>)) {
    return errorResponse('Type must be DOCUMENT, IMAGE, or VIDEO', 400);
  }
  const uploadType = type as Exclude<LibraryAssetType, 'LINK'>;
  if (!(file instanceof File)) return errorResponse('File is required', 400);
  if (file.size <= 0) return errorResponse('File cannot be empty', 400);

  if (file.size > maxUploadBytes) return errorResponse(`File is too large (max ${maxUploadMb}MB)`, 400);

  if (isCoachAsset) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true } });
    const settings = parseDashboardSettings(user?.settings);
    if (!settings.coachModeActive) {
      return errorResponse('Coach mode is not active', 403);
    }
  }

  try {
    validateAssetFile(uploadType, file.type);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unsupported file type', 400);
  }

  // Library assets are currently delivered via direct URLs, so uploads use the public Blob store.
  const uploadToken = getBlobToken('public');
  const path = buildBlobPath(userId, uploadType, file.name);

  let blob;
  try {
    blob = await put(path, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
      token: uploadToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return errorResponse(message, 500);
  }

  const asset = await prisma.libraryAsset.create({
    data: {
      userId,
      title,
      description: description || null,
      type,
      url: blob.url,
      isCoachAsset,
    },
  });

  return NextResponse.json(asset, { status: 201 });
}
