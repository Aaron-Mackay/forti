export function getLoomEmbedUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'loom.com' && hostname !== 'www.loom.com') {
    return null;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const type = segments[0]?.toLowerCase();
  const videoId = segments[1];
  if (!videoId || !/^[A-Za-z0-9_-]+$/.test(videoId)) {
    return null;
  }

  if (type !== 'share' && type !== 'embed') {
    return null;
  }

  return `https://www.loom.com/embed/${videoId}`;
}
