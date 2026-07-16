import { describe, expect, it } from 'vitest';
import {
  contentReleaseForAvailableLevels,
  highestReleasedJlptLevel,
  levelsForContentRelease,
} from '@nihongo-n3/shared';

describe('JLPT release policy', () => {
  it('does not expose N2/N1 until the full contiguous release is available', () => {
    expect(contentReleaseForAvailableLevels(['N5', 'N4', 'N3', 'N2'])).toBe('n5-n3');
    expect(levelsForContentRelease('n5-n3')).toEqual(['N5', 'N4', 'N3']);
  });

  it('exposes every level in N5 to N1 order after complete coverage', () => {
    expect(contentReleaseForAvailableLevels(['N3', 'N5', 'N2', 'N1', 'N4'])).toBe('n5-n1');
    expect(levelsForContentRelease('n5-n1')).toEqual(['N5', 'N4', 'N3', 'N2', 'N1']);
    expect(highestReleasedJlptLevel('n5-n1')).toBe('N1');
  });
});
