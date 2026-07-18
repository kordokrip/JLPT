import { describe, expect, it } from 'vitest';

import { BROWSE_TABS, normalizeContentType } from './types';

describe('browse content types', () => {
  it('keeps the reviewed homophone route as a first-class browse type', () => {
    expect(normalizeContentType('homophones')).toBe('homophones');
    expect(BROWSE_TABS.map((tab) => tab.key)).toContain('homophones');
  });

  it('falls back to vocabulary for unsupported route values', () => {
    expect(normalizeContentType('unsupported')).toBe('vocab');
  });
});
