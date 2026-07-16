import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  contentReleaseForAvailableLevels,
  contentReleaseSchema,
  isJlptLevel,
  jlptLevelSchema,
  learningTrackIdSchema,
  levelsForContentRelease,
} from '@nihongo-n3/shared';

import type { AppEnv } from '../types.js';

const tracksOA = new OpenAPIHono<AppEnv>();

const CONTENT_KINDS = ['vocab', 'grammar', 'kanji'] as const;
type ContentKind = (typeof CONTENT_KINDS)[number];

type ContentLevelCountRow = {
  content_kind: ContentKind;
  level: string;
  count: number;
};

/**
 * A level is released only when every primary learning surface has actual rows.
 * This prevents one test row or a partial seed from exposing N2/N1 in the app.
 */
async function getReleasedLevels(db: AppEnv['Bindings']['DB']) {
  const result = await db.prepare(
    `SELECT 'vocab' AS content_kind, level, COUNT(*) AS count FROM vocab GROUP BY level
     UNION ALL
     SELECT 'grammar' AS content_kind, level, COUNT(*) AS count FROM grammar GROUP BY level
     UNION ALL
     SELECT 'kanji' AS content_kind, jlpt_level AS level, COUNT(*) AS count FROM kanji GROUP BY jlpt_level`,
  ).all<ContentLevelCountRow>();

  const counts = new Map<string, Set<ContentKind>>();
  for (const row of result.results ?? []) {
    if (!isJlptLevel(row.level) || row.count <= 0) continue;
    const kinds = counts.get(row.level) ?? new Set<ContentKind>();
    kinds.add(row.content_kind);
    counts.set(row.level, kinds);
  }

  const completeLevels = [...counts]
    .filter(([, kinds]) => CONTENT_KINDS.every((kind) => kinds.has(kind)))
    .map(([level]) => level);
  const release = contentReleaseForAvailableLevels(completeLevels);
  return { release, levels: levelsForContentRelease(release) };
}

const route = createRoute({
  method: 'get',
  path: '/tracks/{track}/status',
  tags: ['Tracks'],
  summary: '학습 트랙 출시 상태 조회',
  request: {
    params: z.object({ track: learningTrackIdSchema }),
  },
  responses: {
    200: {
      description: '트랙별 콘텐츠와 쓰기 기능의 현재 준비 상태',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              track: learningTrackIdSchema,
              available: z.boolean(),
              content_release: contentReleaseSchema,
              available_levels: z.array(jlptLevelSchema),
              write_enabled: z.boolean(),
            }),
          }),
        },
      },
    },
  },
});

tracksOA.openapi(route, async (c) => {
  const { track } = c.req.valid('param');
  if (track === 'topik-ko') {
    return c.json({
      data: {
        track,
        available: false,
        content_release: 'foundation-only' as const,
        available_levels: [],
        write_enabled: false,
      },
    });
  }

  const { release, levels } = await getReleasedLevels(c.env.DB);
  return c.json({
    data: {
      track,
      available: true,
      content_release: release,
      available_levels: levels,
      write_enabled: true,
    },
  });
});

export { tracksOA };
