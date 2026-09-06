import { describe, expect, it } from 'vitest';
import {
  AUDIO_BATCH_LEVELS,
  contentReleaseForAvailableLevels,
  highestReleasedJlptLevel,
  levelsForContentRelease,
} from '@nihongo-n3/shared';

describe('JLPT release policy', () => {
  it('exposes N2 only after every lower level has actual coverage', () => {
    expect(contentReleaseForAvailableLevels(['N5', 'N4', 'N3', 'N2'])).toBe('n5-n2');
    expect(levelsForContentRelease('n5-n2')).toEqual(['N5', 'N4', 'N3', 'N2']);
    expect(highestReleasedJlptLevel('n5-n2')).toBe('N2');
  });

  it('exposes every level in N5 to N1 order after complete coverage', () => {
    expect(contentReleaseForAvailableLevels(['N3', 'N5', 'N2', 'N1', 'N4'])).toBe('n5-n1');
    expect(levelsForContentRelease('n5-n1')).toEqual(['N5', 'N4', 'N3', 'N2', 'N1']);
    expect(highestReleasedJlptLevel('n5-n1')).toBe('N1');
  });

  it('covers N5 to N1 in the audio intake/verifier scope', () => {
    expect(AUDIO_BATCH_LEVELS).toEqual(['N5', 'N4', 'N3', 'N2', 'N1']);
  });
});
