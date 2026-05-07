import {describe, expect, it} from 'vitest';
import {getLoomEmbedUrl} from './loom';

describe('getLoomEmbedUrl', () => {
  it('returns embed URL for Loom share links', () => {
    expect(getLoomEmbedUrl('https://www.loom.com/share/abc123DEF')).toBe(
      'https://www.loom.com/embed/abc123DEF',
    );
  });

  it('returns embed URL for Loom embed links', () => {
    expect(getLoomEmbedUrl('https://www.loom.com/embed/abc123DEF')).toBe(
      'https://www.loom.com/embed/abc123DEF',
    );
  });

  it('returns null for non-Loom URLs', () => {
    expect(getLoomEmbedUrl('https://example.com/share/abc123DEF')).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(getLoomEmbedUrl('not a url')).toBeNull();
  });

  it('returns null when Loom URL has no id', () => {
    expect(getLoomEmbedUrl('https://www.loom.com/share/')).toBeNull();
  });
});
