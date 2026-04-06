import { del } from '@vercel/blob';
import { LibraryAssetType } from '@prisma/client';

export type BlobScope = 'public' | 'private';

const MIME_GROUPS: Record<Exclude<LibraryAssetType, 'LINK'>, readonly string[]> = {
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  VIDEO: ['video/mp4', 'video/quicktime', 'video/webm'],
};

const HOST_ALLOWLIST = ['blob.vercel-storage.com', 'public.blob.vercel-storage.com', 'private.blob.vercel-storage.com'];

const PUBLIC_TOKEN_NAMES = ['BLOB_PUBLIC_READ_WRITE_TOKEN', 'BLOB_READ_WRITE_TOKEN'] as const;
const PRIVATE_TOKEN_NAMES = ['BLOB_PRIVATE_READ_WRITE_TOKEN', 'BLOB_READ_WRITE_TOKEN'] as const;

const DEFAULT_MAX_UPLOAD_MB = 50;

export function getMaxUploadBytes() {
  const configured = Number(process.env.LIBRARY_UPLOAD_MAX_MB ?? DEFAULT_MAX_UPLOAD_MB);
  const safeMb = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_MB;
  return {
    maxUploadMb: Math.floor(safeMb),
    maxUploadBytes: Math.floor(safeMb) * 1024 * 1024,
  };
}

export function validateAssetFile(type: Exclude<LibraryAssetType, 'LINK'>, mimeType: string) {
  const allowed = MIME_GROUPS[type];
  if (!allowed.includes(mimeType)) {
    throw new Error(`Unsupported file type for ${type.toLowerCase()}.`);
  }
}

function getFirstDefined(names: readonly string[]): string | null {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return null;
}

export function getBlobToken(scope: BlobScope): string {
  const names = scope === 'public' ? PUBLIC_TOKEN_NAMES : PRIVATE_TOKEN_NAMES;
  const token = getFirstDefined(names);
  if (!token) {
    throw new Error(`Vercel Blob token is missing for ${scope} scope. Set one of: ${names.join(', ')}`);
  }
  return token;
}

export function buildBlobPath(userId: string, type: Exclude<LibraryAssetType, 'LINK'>, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  return `library/${userId}/${type.toLowerCase()}/${safeName}`;
}

function isManagedBlobUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return HOST_ALLOWLIST.some((host) => parsed.hostname.endsWith(host));
  } catch {
    return false;
  }
}

export async function deleteBlobIfManaged(url: string | null | undefined) {
  if (!isManagedBlobUrl(url)) return;

  const managedUrl = url as string;
  const possibleTokens = [
    process.env.BLOB_PUBLIC_READ_WRITE_TOKEN,
    process.env.BLOB_PRIVATE_READ_WRITE_TOKEN,
    process.env.BLOB_READ_WRITE_TOKEN,
  ].filter((v): v is string => Boolean(v));

  if (possibleTokens.length === 0) return;

  let lastError: unknown = null;
  for (const token of possibleTokens) {
    try {
      await del(managedUrl, { token });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
}
