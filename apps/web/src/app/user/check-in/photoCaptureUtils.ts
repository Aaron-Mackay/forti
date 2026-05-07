type FacingMode = 'user' | 'environment';

function getPreferredPatterns(facingMode: FacingMode) {
  return facingMode === 'environment'
    ? [/\bback\b/i, /\brear\b/i, /\benvironment\b/i, /\bworld\b/i]
    : [/\bfront\b/i, /\buser\b/i, /\bface\s*time\b/i, /\bfacetime\b/i];
}

export function getPreferredCameraDeviceId(
  devices: Pick<MediaDeviceInfo, 'kind' | 'deviceId' | 'label'>[],
  facingMode: FacingMode,
) {
  const videoDevices = devices.filter(device => device.kind === 'videoinput');
  if (videoDevices.length === 0) return null;

  const preferredPatterns = getPreferredPatterns(facingMode);

  const preferred = videoDevices.find(device =>
    preferredPatterns.some(pattern => pattern.test(device.label))
  );

  return preferred?.deviceId ?? null;
}

export function getOrderedCameraDeviceIds(
  devices: Pick<MediaDeviceInfo, 'kind' | 'deviceId' | 'label'>[],
  facingMode: FacingMode,
  activeDeviceId: string | null,
) {
  const videoDevices = devices.filter(device => device.kind === 'videoinput');
  const preferredPatterns = getPreferredPatterns(facingMode);

  const matchingDevices = videoDevices.filter(device =>
    preferredPatterns.some(pattern => pattern.test(device.label))
  );
  const otherDevices = videoDevices.filter(device =>
    !matchingDevices.some(match => match.deviceId === device.deviceId)
  );

  const ordered = [...matchingDevices, ...otherDevices]
    .filter(device => device.deviceId !== activeDeviceId)
    .map(device => device.deviceId);

  return [...new Set(ordered)];
}

export function getCoverDrawRect(
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number,
) {
  if (sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) {
    return null;
  }

  const sourceAspect = sourceWidth / sourceHeight;
  const destAspect = destWidth / destHeight;

  if (sourceAspect > destAspect) {
    const drawWidth = sourceHeight * destAspect;
    const sx = (sourceWidth - drawWidth) / 2;
    return { sx, sy: 0, sw: drawWidth, sh: sourceHeight };
  }

  const drawHeight = sourceWidth / destAspect;
  const sy = (sourceHeight - drawHeight) / 2;
  return { sx: 0, sy, sw: sourceWidth, sh: drawHeight };
}
