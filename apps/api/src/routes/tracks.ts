import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { learningTrackIdSchema } from '@nihongo-n3/shared';

import type { AppEnv } from '../types.js';

const tracksOA = new OpenAPIHono<AppEnv>();

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
              content_release: z.enum(['n5-n3', 'foundation-only']),
              write_enabled: z.boolean(),
            }),
          }),
        },
      },
    },
  },
});

tracksOA.openapi(route, (c) => {
  const { track } = c.req.valid('param');
  if (track === 'topik-ko') {
    return c.json({
      data: {
        track,
        available: false,
        content_release: 'foundation-only' as const,
        write_enabled: false,
      },
    });
  }
  return c.json({
    data: {
      track,
      available: true,
      content_release: 'n5-n3' as const,
      write_enabled: true,
    },
  });
});

export { tracksOA };
