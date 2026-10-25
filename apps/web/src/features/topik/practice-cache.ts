import type { TopikContentRelease, TopikPracticeListDto } from '@nihongo-n3/shared';
import { db, type TopikPracticeCache } from '../../lib/db';

export type TopikPracticeExamLevel = 'TOPIK-I' | 'TOPIK-II';
export type TopikPracticeSection = 'listening' | 'writing' | 'reading';

export function topikPracticeCacheKey(
  scopeId: string,
  contentRelease: TopikContentRelease,
  examLevel: TopikPracticeExamLevel,
  section: TopikPracticeSection,
): string {
  return `${encodeURIComponent(scopeId)}:${contentRelease}:${examLevel}:${section}`;
}

export async function saveTopikPracticeCache(
  scopeId: string,
  contentRelease: TopikContentRelease,
  payload: TopikPracticeListDto,
): Promise<void> {
  const record: TopikPracticeCache = {
    id: topikPracticeCacheKey(scopeId, contentRelease, payload.exam_level, payload.section),
    scope_id: scopeId,
    content_release: contentRelease,
    exam_level: payload.exam_level,
    section: payload.section,
    bank_version: payload.bank_version,
    fetched_at: new Date().toISOString(),
    payload,
  };
  await db.topik_practice_cache.put(record);
}

export async function readTopikPracticeCache(
  scopeId: string,
  contentRelease: TopikContentRelease,
  examLevel: TopikPracticeExamLevel,
  section: TopikPracticeSection,
): Promise<TopikPracticeCache | undefined> {
  return db.topik_practice_cache.get(topikPracticeCacheKey(scopeId, contentRelease, examLevel, section));
}
