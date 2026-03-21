import { calculatePlates, BAR_LBS } from './plateCalculator';

describe('calculatePlates (kg)', () => {
  it('bar only (20 kg)', () => {
    const result = calculatePlates(20, 'kg');
    expect(result.platesPerSide).toEqual([]);
    expect(result.hasRemainder).toBe(false);
    expect(result.achievableKg).toBeCloseTo(20);
  });

  it('100 kg — 2×20 + 2×5 kg per side', () => {
    const result = calculatePlates(100, 'kg');
    // (100 - 20) / 2 = 40 per side → 1×25 + 1×10 + 1×5
    expect(result.hasRemainder).toBe(false);
    expect(result.platesPerSide.reduce((s, p) => s + p.weight * p.count, 0)).toBeCloseTo(40);
    expect(result.achievableKg).toBeCloseTo(100);
  });

  it('60 kg', () => {
    const result = calculatePlates(60, 'kg');
    // (60 - 20) / 2 = 20 per side → 1×20
    expect(result.platesPerSide).toEqual([{ weight: 20, count: 1 }]);
    expect(result.hasRemainder).toBe(false);
    expect(result.achievableKg).toBeCloseTo(60);
  });

  it('target below bar — no plates, hasRemainder', () => {
    const result = calculatePlates(10, 'kg');
    expect(result.platesPerSide).toEqual([]);
    expect(result.hasRemainder).toBe(true);
  });

  it('135 kg', () => {
    const result = calculatePlates(135, 'kg');
    // (135 - 20) / 2 = 57.5 → 2×25 + 1×5 + 1×2.5
    expect(result.hasRemainder).toBe(false);
    expect(result.achievableKg).toBeCloseTo(135);
  });
});

describe('calculatePlates (lbs)', () => {
  it('bar only (45 lbs)', () => {
    // Pass the exact kg equivalent of a 45 lb bar
    const barKgEquivalent = BAR_LBS / 2.20462;
    const result = calculatePlates(barKgEquivalent, 'lbs');
    expect(result.platesPerSide).toEqual([]);
    expect(result.hasRemainder).toBe(false);
  });

  it('225 lbs — 2×45 per side', () => {
    // 225 lbs → (225 - 45) / 2 = 90 per side → 2×45
    const targetKg = 225 / 2.20462;
    const result = calculatePlates(targetKg, 'lbs');
    expect(result.platesPerSide).toEqual([{ weight: 45, count: 2 }]);
    expect(result.hasRemainder).toBe(false);
  });

  it('135 lbs — 1×45 per side', () => {
    const targetKg = 135 / 2.20462;
    const result = calculatePlates(targetKg, 'lbs');
    expect(result.platesPerSide).toEqual([{ weight: 45, count: 1 }]);
    expect(result.hasRemainder).toBe(false);
  });

  it('bar weight is 45 lbs', () => {
    expect(BAR_LBS).toBe(45);
  });
});
