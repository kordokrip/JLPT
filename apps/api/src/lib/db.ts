/**
 * apps/api/src/lib/db.ts
 *
 * Drizzle ORM D1 클라이언트 팩토리.
 * 각 요청마다 호출해서 사용한다 (Workers는 stateless).
 */
import { drizzle } from 'drizzle-orm/d1';

// @nihongo-n3/db = packages/db/src/schema.ts (workspace 패키지)
export { drizzle };

export function createDb(d1: D1Database) {
  return drizzle(d1);
}

export type AppDb = ReturnType<typeof createDb>;
