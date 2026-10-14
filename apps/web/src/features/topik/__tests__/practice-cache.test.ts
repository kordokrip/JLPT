import { describe, expect, it } from 'vitest';
import { topikPracticeCacheKey } from '../practice-cache';

describe('topikPracticeCacheKey', () => {
  it('separates cached prompts by account scope, content release, level, and section', () => {
    const first = topikPracticeCacheKey('user:a|track:topik-ko', 'topik-i-ii', 'TOPIK-I', 'listening');
    const same = topikPracticeCacheKey('user:a|track:topik-ko', 'topik-i-ii', 'TOPIK-I', 'listening');
    const otherUser = topikPracticeCacheKey('user:b|track:topik-ko', 'topik-i-ii', 'TOPIK-I', 'listening');
    const otherRelease = topikPracticeCacheKey('user:a|track:topik-ko', 'placement-v2', 'TOPIK-I', 'listening');
    const otherSection = topikPracticeCacheKey('user:a|track:topik-ko', 'topik-i-ii', 'TOPIK-I', 'reading');

    expect(first).toBe(same);
    expect(first).not.toBe(otherUser);
    expect(first).not.toBe(otherRelease);
    expect(first).not.toBe(otherSection);
    expect(first).toContain('%7C');
  });
});
