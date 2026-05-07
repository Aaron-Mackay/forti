import {NO_FADES, computeScrollFades} from './scrollEdgeFades';

describe('computeScrollFades', () => {
  it('returns no fades when content fits in the viewport', () => {
    expect(computeScrollFades({scrollPosition: 0, visibleSize: 200, contentSize: 200})).toEqual(NO_FADES);
  });

  it('returns no fades when content is only marginally larger than the viewport (within threshold)', () => {
    expect(computeScrollFades({scrollPosition: 0, visibleSize: 200, contentSize: 200}, 1)).toEqual(NO_FADES);
    expect(computeScrollFades({scrollPosition: 0, visibleSize: 200, contentSize: 201}, 1)).toEqual(NO_FADES);
  });

  it('shows only the end fade when scrolled to the very start of overflowing content', () => {
    expect(computeScrollFades({scrollPosition: 0, visibleSize: 200, contentSize: 600})).toEqual({
      showStartFade: false,
      showEndFade: true,
    });
  });

  it('shows both fades when scrolled into the middle of overflowing content', () => {
    expect(computeScrollFades({scrollPosition: 100, visibleSize: 200, contentSize: 600})).toEqual({
      showStartFade: true,
      showEndFade: true,
    });
  });

  it('shows only the start fade when scrolled to the very end', () => {
    // maxScroll = 600 - 200 = 400
    expect(computeScrollFades({scrollPosition: 400, visibleSize: 200, contentSize: 600})).toEqual({
      showStartFade: true,
      showEndFade: false,
    });
  });

  it('treats positions within threshold of the start/end as edges', () => {
    // threshold=4, maxScroll=400
    expect(computeScrollFades({scrollPosition: 3, visibleSize: 200, contentSize: 600}, 4)).toEqual({
      showStartFade: false,
      showEndFade: true,
    });
    expect(computeScrollFades({scrollPosition: 397, visibleSize: 200, contentSize: 600}, 4)).toEqual({
      showStartFade: true,
      showEndFade: false,
    });
  });
});
