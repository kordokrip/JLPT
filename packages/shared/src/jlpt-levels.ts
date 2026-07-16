/**
 * JLPT 레벨과 콘텐츠 출시 단계의 단일 정책 원천.
 *
 * 화면은 이 파일에서 파생한 레벨만 노출한다. 데이터베이스는 각 레벨의
 * 어휘·문법·한자가 모두 준비됐을 때 해당 출시 단계를 반환한다.
 */
export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
export type JlptLevel = (typeof JLPT_LEVELS)[number];

export const CONTENT_RELEASES = ['foundation-only', 'n5-n3', 'n5-n1'] as const;
export type ContentRelease = (typeof CONTENT_RELEASES)[number];

export const DEFAULT_JLPT_CONTENT_RELEASE: ContentRelease = 'n5-n3';
export const DEFAULT_JLPT_LEVEL: JlptLevel = 'N3';

const RELEASE_LEVELS: Record<ContentRelease, readonly JlptLevel[]> = {
  'foundation-only': [],
  'n5-n3': JLPT_LEVELS.slice(0, 3),
  'n5-n1': JLPT_LEVELS,
};

export function isJlptLevel(value: unknown): value is JlptLevel {
  return typeof value === 'string' && (JLPT_LEVELS as readonly string[]).includes(value);
}

export function levelsForContentRelease(release: ContentRelease): JlptLevel[] {
  return [...RELEASE_LEVELS[release]];
}

/** Return the highest contiguous release that the supplied DB levels support. */
export function contentReleaseForAvailableLevels(levels: Iterable<unknown>): ContentRelease {
  const available = new Set<JlptLevel>();
  for (const level of levels) {
    if (isJlptLevel(level)) available.add(level);
  }

  for (const release of [...CONTENT_RELEASES].reverse()) {
    const required = RELEASE_LEVELS[release];
    if (required.length > 0 && required.every((level) => available.has(level))) {
      return release;
    }
  }
  return 'foundation-only';
}

export function highestReleasedJlptLevel(release: ContentRelease): JlptLevel {
  const levels = RELEASE_LEVELS[release];
  return levels.at(-1) ?? DEFAULT_JLPT_LEVEL;
}
