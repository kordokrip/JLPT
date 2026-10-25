import { describe, expect, it } from 'vitest';

import { OWNER_PRIVATE_FETCH_CACHE, ownerPrivateTopikQueryKey } from './owner-private-content.js';

describe('owner-private TOPIK PWA cache policy', () => {
  it('uses no-store and separates in-memory queries by authenticated account scope', () => {
    expect(OWNER_PRIVATE_FETCH_CACHE).toBe('no-store');
    expect(ownerPrivateTopikQueryKey('user:owner|track:topik-ko', 'TOPIK-I', 'reading'))
      .not.toEqual(ownerPrivateTopikQueryKey('user:other|track:topik-ko', 'TOPIK-I', 'reading'));
  });
});
