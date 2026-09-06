import { describe, expect, it } from 'vitest';
import { TOPIK_FOUNDATION_UNITS } from './content';

describe('TOPIK foundation content', () => {
  it('keeps six ordered, unique self-authored units', () => {
    expect(TOPIK_FOUNDATION_UNITS).toHaveLength(6);
    expect(TOPIK_FOUNDATION_UNITS.map((unit) => unit.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(TOPIK_FOUNDATION_UNITS.map((unit) => unit.id)).size).toBe(6);
  });

  it('provides three non-empty Korean expressions per unit', () => {
    const expressions = TOPIK_FOUNDATION_UNITS.flatMap((unit) => unit.expressions);
    expect(expressions).toHaveLength(18);
    expect(new Set(expressions.map((item) => item.ko)).size).toBe(18);
    expect(expressions.every((item) => item.ko.trim() && item.en.trim())).toBe(true);
  });
});
