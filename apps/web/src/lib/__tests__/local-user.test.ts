import { describe, expect, it } from 'vitest';
import {
  ANONYMOUS_LOCAL_USER,
  getActiveLocalUserId,
  localUserIdFor,
  setActiveLocalUserId,
  setActiveLearningTrack,
} from '../db';

describe('local user namespace', () => {
  it('separates anonymous, legacy, and authenticated users', () => {
    expect(localUserIdFor(null, 'jlpt-ja')).toBe(`${ANONYMOUS_LOCAL_USER}|track:jlpt-ja`);
    expect(localUserIdFor('u_123', 'topik-ko')).toBe('user:u_123|track:topik-ko');
  });

  it('tracks the active local user for sync queue writes', () => {
    setActiveLearningTrack('jlpt-ja');
    expect(setActiveLocalUserId('u_abc')).toBe('user:u_abc|track:jlpt-ja');
    expect(getActiveLocalUserId()).toBe('user:u_abc|track:jlpt-ja');
    expect(setActiveLearningTrack('topik-ko')).toBe('user:u_abc|track:topik-ko');
    expect(setActiveLocalUserId(null)).toBe(`${ANONYMOUS_LOCAL_USER}|track:topik-ko`);
  });
});
