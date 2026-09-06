import { describe, expect, it } from 'vitest';
import { homePathForTrack, navigationForTrack, WEB_TRACK_REGISTRY } from './track-registry';

describe('web track registry', () => {
  it('defines one home and navigation model for each shared track', () => {
    expect(Object.keys(WEB_TRACK_REGISTRY).sort()).toEqual(['jlpt-ja', 'topik-ko']);
    expect(homePathForTrack('jlpt-ja')).toBe('/');
    expect(homePathForTrack('topik-ko')).toBe('/track/topik-ko');
  });

  it('does not expose JLPT content routes in TOPIK navigation', () => {
    const paths = navigationForTrack('topik-ko', 'user').map((item) => item.to);
    expect(paths).toEqual(['/track/topik-ko', '/learn', '/questions', '/track/topik-ko/review', '/records']);
    expect(paths).not.toContain('/browse/vocab');
    expect(paths).not.toContain('/quiz');
    expect(paths).not.toContain('/admin/users');
  });

  it('keeps account/admin controls out of the five learning destinations', () => {
    expect(navigationForTrack('jlpt-ja', 'user').some((item) => item.adminOnly)).toBe(false);
    expect(navigationForTrack('jlpt-ja', 'admin').some((item) => item.to === '/admin/users')).toBe(false);
    expect(navigationForTrack('jlpt-ja', 'admin')).toHaveLength(5);
  });
});
