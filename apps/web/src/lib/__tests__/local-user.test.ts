import { describe, expect, it } from 'vitest';
import {
  ANONYMOUS_LOCAL_USER,
  getActiveLocalUserId,
  localUserIdFor,
  setActiveLocalUserId,
} from '../db';

describe('local user namespace', () => {
  it('separates anonymous, legacy, and authenticated users', () => {
    expect(localUserIdFor(null)).toBe(ANONYMOUS_LOCAL_USER);
    expect(localUserIdFor('u_123')).toBe('user:u_123');
  });

  it('tracks the active local user for sync queue writes', () => {
    expect(setActiveLocalUserId('u_abc')).toBe('user:u_abc');
    expect(getActiveLocalUserId()).toBe('user:u_abc');
    expect(setActiveLocalUserId(null)).toBe(ANONYMOUS_LOCAL_USER);
  });
});
