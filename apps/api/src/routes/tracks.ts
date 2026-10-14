import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  contentReleaseForAvailableLevels,
  contentReleaseSchema,
  isJlptLevel,
  jlptLevelSchema,
  learningTrackIdSchema,
  levelsForContentRelease,
  topikContentReleaseSchema,
  topikExamLevelSchema,
  topikOfficialReferenceSchema,
  topikSectionSchema,
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

async function getTopikRelease(db: AppEnv['Bindings']['DB']) {
  try {
    const [placementResult, practiceResult] = await Promise.all([
      db.prepare(
      `SELECT section, COUNT(*) AS count
         FROM topik_placement_questions
        WHERE learning_track = 'topik-ko' AND bank_version = 'v2' AND is_published = 1
        GROUP BY section`,
      ).all<{ section: string; count: number }>(),
      db.prepare(
        `SELECT exam_level, section, COUNT(*) AS count
           FROM topik_practice_questions
          WHERE learning_track = 'topik-ko' AND bank_version = 'v2' AND is_published = 1
          GROUP BY exam_level, section`,
      ).all<{ exam_level: string; section: string; count: number }>(),
    ]);
    const placementCounts = new Map((placementResult.results ?? []).map((row) => [row.section, row.count]));
    const placementAvailable = (placementCounts.get('listening') ?? 0) >= 12 && (placementCounts.get('reading') ?? 0) >= 12;
    const practiceCounts = new Map((practiceResult.results ?? []).map((row) => [`${row.exam_level}:${row.section}`, row.count]));
    const practiceRequirements: ReadonlyArray<readonly [string, number]> = [
      ['TOPIK-I:listening', 60], ['TOPIK-I:reading', 60],
      ['TOPIK-II:listening', 60], ['TOPIK-II:writing', 60], ['TOPIK-II:reading', 60],
    ];
    const practiceAvailable = practiceRequirements.every(([key, minimum]) => (practiceCounts.get(key) ?? 0) >= minimum);
    if (practiceAvailable) {
      return { available: true, contentRelease: 'topik-i-ii' as const, levels: ['TOPIK-I', 'TOPIK-II'] as const, sections: ['listening', 'writing', 'reading'] as const };
    }
    if (placementAvailable) {
      return { available: true, contentRelease: 'placement-v2' as const, levels: ['TOPIK-I'] as const, sections: ['listening', 'reading'] as const };
    }
    return { available: false, contentRelease: 'foundation-only' as const, levels: [] as const, sections: [] as const };
  } catch {
    return { available: false, contentRelease: 'foundation-only' as const, levels: [] as const, sections: [] as const };
  }
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
            data: z.discriminatedUnion('track', [
              z.object({
                track: z.literal('jlpt-ja'),
                available: z.boolean(),
                content_release: contentReleaseSchema,
                available_levels: z.array(jlptLevelSchema),
                write_enabled: z.boolean(),
              }),
              z.object({
                track: z.literal('topik-ko'),
                available: z.boolean(),
                content_release: topikContentReleaseSchema,
                available_levels: z.array(topikExamLevelSchema),
                available_sections: z.array(topikSectionSchema),
                write_enabled: z.boolean(),
              }),
            ]),
          }),
        },
      },
    },
  },
});

const officialReferenceRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/official-reference',
  tags: ['Tracks'],
  summary: 'TOPIK 공식 공개 통계 및 시험 구조 참고 정보',
  description: '국립국제교육원 공개 통계와 시험 구조만 반환합니다. 공식 문항, 정답, 음원, 개인 응시 기록은 포함하지 않습니다.',
  responses: {
    200: {
      description: 'TOPIK I/II 시험 구조와 공개 통계 집계',
      content: {
        'application/json': {
          schema: z.object({ data: topikOfficialReferenceSchema }),
        },
      },
    },
    503: {
      description: '공식 공개 참조 데이터가 아직 적재되지 않음',
      content: {
        'application/json': {
          schema: z.object({ detail: z.string() }),
        },
      },
    },
  },
});

tracksOA.openapi(route, async (c) => {
  const { track } = c.req.valid('param');
  if (track === 'topik-ko') {
    const release = await getTopikRelease(c.env.DB);
    return c.json({
      data: {
        track,
        available: release.available,
        content_release: release.contentRelease,
        available_levels: [...release.levels],
        available_sections: [...release.sections],
        write_enabled: release.contentRelease === 'topik-i-ii',
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

tracksOA.openapi(officialReferenceRoute, async (c) => {
  const source = await c.env.DB.prepare(
    `SELECT source_code, title AS source_title, source_version, provenance_json
       FROM track_content_sources
      WHERE learning_track = 'topik-ko'
        AND source_code = 'TOPIK-NIIED-APPLICANTS-2023'
      LIMIT 1`,
  ).first<{
    source_code: string;
    source_title: string;
    source_version: string;
    provenance_json: string;
  }>();

  if (!source) {
    return c.json({ detail: 'TOPIK 공식 공개 참조 데이터가 아직 적재되지 않았습니다.' }, 503);
  }

  let sourceUrl = 'https://www.data.go.kr/data/15067926/fileData.do';
  try {
    const provenance = JSON.parse(source.provenance_json) as { origin?: { url?: unknown } };
    if (typeof provenance.origin?.url === 'string' && /^https:\/\//u.test(provenance.origin.url)) {
      sourceUrl = provenance.origin.url;
    }
  } catch {
    // The source code identifies this fixed public dataset; do not expose arbitrary provenance values.
  }

  const [blueprintResult, totalsResult, statisticsResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT exam_level, delivery_mode, section, question_count, section_score,
              total_score, grade_min, grade_max
         FROM topik_exam_blueprints
        WHERE learning_track = 'topik-ko'
          AND source_code = ?
        ORDER BY exam_level, CASE section WHEN 'listening' THEN 1 WHEN 'writing' THEN 2 ELSE 3 END`,
    ).bind(source.source_code).all<{
      exam_level: 'TOPIK-I' | 'TOPIK-II';
      delivery_mode: string;
      section: 'listening' | 'writing' | 'reading';
      question_count: number;
      section_score: number;
      total_score: number;
      grade_min: number;
      grade_max: number;
    }>(),
    c.env.DB.prepare(
      `SELECT exam_level, SUM(applicant_count) AS applicants
         FROM topik_official_statistics
        WHERE learning_track = 'topik-ko'
          AND source_code = ?
        GROUP BY exam_level
        ORDER BY exam_level`,
    ).bind(source.source_code).all<{
      exam_level: 'TOPIK-I' | 'TOPIK-II';
      applicants: number;
    }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS count
         FROM topik_official_statistics
        WHERE learning_track = 'topik-ko'
          AND source_code = ?`,
    ).bind(source.source_code).first<{ count: number }>(),
  ]);

  const blueprints = blueprintResult.results ?? [];
  const applicantTotals = totalsResult.results ?? [];
  if (blueprints.length !== 5 || applicantTotals.length !== 2 || !statisticsResult?.count) {
    return c.json({ detail: 'TOPIK 공식 공개 참조 데이터가 완전하지 않습니다.' }, 503);
  }

  return c.json({
    data: {
      source: {
        code: source.source_code,
        title: source.source_title,
        source_url: sourceUrl,
        source_version: source.source_version,
        statistics_rows: statisticsResult.count,
      },
      blueprints,
      applicant_totals: applicantTotals,
    },
  }, 200);
});

export { tracksOA };
