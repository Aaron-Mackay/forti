import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PhotoCaptureModal from './PhotoCaptureModal';

describe('PhotoCaptureModal', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const OriginalImage = window.Image;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    window.Image = OriginalImage;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('shows a clear error when the selected upload cannot be decoded', async () => {
    class FailingImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      width = 0;
      height = 0;

      set src(_value: string) {
        queueMicrotask(() => {
          this.onerror?.();
        });
      }
    }

    window.Image = FailingImage as unknown as typeof Image;

    render(
      <PhotoCaptureModal
        angle="front"
        ghostUrl={null}
        initialFile={new File(['x'], 'photo.heic', { type: 'image/heic' })}
        onClose={vi.fn()}
        onUploaded={vi.fn()}
      />
    );

    expect(await screen.findByText('This photo could not be loaded. Try a JPG, PNG, or WebP image.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
