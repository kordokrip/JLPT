import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// 강성호 2026-10-14: 페이지별 스크롤·하단 메뉴 중복 계산과 다크 학습 화면 회귀를 차단한다.
const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
describe('learner layout ownership', () => {
  it('leaves document scrolling to the shell instead of a second viewport-height scrollport', () => {
    const root = source('./RootLayout.tsx');
    expect(root).not.toContain('h-[calc(100dvh-var(--nav-height)');
    expect(root).toContain('app-main');
  });
  it('uses shell offset for the study dock and map current-position control', () => {
    expect(source('../../features/study/learning-session.css')).toContain('var(--shell-sticky-offset)');
    expect(source('../../features/learning/LearningMap.css')).toContain('var(--shell-sticky-offset)');
  });
  it('does not reset inherited theme foreground inside learning sessions', () => {
    const css = source('../../features/study/learning-session.css');
    expect(css).not.toMatch(/--foreground:\s*#172536/);
    expect(css).toContain('--learning-card: var(--card)');
  });
});
