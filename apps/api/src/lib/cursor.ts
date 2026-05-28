/**
 * apps/api/src/lib/cursor.ts
 *
 * cursor 기반 페이지네이션 인코딩/디코딩.
 * cursor = btoa(String(lastId)) — 단순 base64 정수 래퍼.
 */

export function encodeCursor(id: number): string {
  return btoa(String(id));
}

export function decodeCursor(cursor: string | undefined | null): number | null {
  if (!cursor) return null;
  try {
    const id = parseInt(atob(cursor), 10);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

/**
 * 결과 배열에서 페이지네이션 메타를 계산한다.
 * items 는 limit+1 개를 쿼리한 결과여야 한다.
 */
export function paginate<T extends { id: number }>(
  items: T[],
  limit: number,
): { data: T[]; hasMore: boolean; nextCursor?: string } {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const last = data.at(-1);
  const result: { data: T[]; hasMore: boolean; nextCursor?: string } = { data, hasMore };
  if (hasMore && last) result.nextCursor = encodeCursor(last.id);
  return result;
}
