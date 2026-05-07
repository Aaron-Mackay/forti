import { describe, expect, it } from 'vitest';

import { getCoverDrawRect, getOrderedCameraDeviceIds, getPreferredCameraDeviceId } from './photoCaptureUtils';

describe('getPreferredCameraDeviceId', () => {
  it('prefers a back camera for environment mode', () => {
    const result = getPreferredCameraDeviceId([
      { kind: 'videoinput', deviceId: 'front', label: 'Front Camera' } as MediaDeviceInfo,
      { kind: 'videoinput', deviceId: 'back', label: 'Back Camera' } as MediaDeviceInfo,
    ], 'environment');

    expect(result).toBe('back');
  });

  it('prefers a front camera for user mode', () => {
    const result = getPreferredCameraDeviceId([
      { kind: 'videoinput', deviceId: 'rear', label: 'Rear Camera' } as MediaDeviceInfo,
      { kind: 'videoinput', deviceId: 'face', label: 'FaceTime HD Camera' } as MediaDeviceInfo,
    ], 'user');

    expect(result).toBe('face');
  });

  it('returns null when no matching device labels are available', () => {
    const result = getPreferredCameraDeviceId([
      { kind: 'videoinput', deviceId: 'cam-1', label: '' } as MediaDeviceInfo,
    ], 'environment');

    expect(result).toBeNull();
  });
});

describe('getOrderedCameraDeviceIds', () => {
  it('orders matching rear cameras first and excludes the active camera', () => {
    const result = getOrderedCameraDeviceIds([
      { kind: 'videoinput', deviceId: 'front', label: 'Front Camera' } as MediaDeviceInfo,
      { kind: 'videoinput', deviceId: 'rear-wide', label: 'Back Wide Camera' } as MediaDeviceInfo,
      { kind: 'videoinput', deviceId: 'rear-ultra', label: 'Back Ultra Wide Camera' } as MediaDeviceInfo,
    ], 'environment', 'front');

    expect(result).toEqual(['rear-wide', 'rear-ultra']);
  });

  it('falls back to every non-active camera when labels are missing', () => {
    const result = getOrderedCameraDeviceIds([
      { kind: 'videoinput', deviceId: 'cam-1', label: '' } as MediaDeviceInfo,
      { kind: 'videoinput', deviceId: 'cam-2', label: '' } as MediaDeviceInfo,
      { kind: 'videoinput', deviceId: 'cam-3', label: '' } as MediaDeviceInfo,
    ], 'environment', 'cam-1');

    expect(result).toEqual(['cam-2', 'cam-3']);
  });
});

describe('getCoverDrawRect', () => {
  it('crops width when the source is wider than the destination', () => {
    const rect = getCoverDrawRect(1920, 1080, 300, 400);

    expect(rect).toEqual({
      sx: 555,
      sy: 0,
      sw: 810,
      sh: 1080,
    });
  });

  it('crops height when the source is taller than the destination', () => {
    const rect = getCoverDrawRect(1080, 1920, 400, 300);

    expect(rect).toEqual({
      sx: 0,
      sy: 555,
      sw: 1080,
      sh: 810,
    });
  });

  it('returns null for invalid dimensions', () => {
    expect(getCoverDrawRect(0, 1920, 400, 300)).toBeNull();
  });
});
