import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { audio } from './audio.js';
import { problemSchema, mountLegacyRouteWithOpenApiDocs } from './openapi-docs.js';

const audioOA = new OpenAPIHono<AppEnv>();

mountLegacyRouteWithOpenApiDocs(audioOA, audio, [
  {
    method: 'get',
    path: '/audio/{key}',
    tags: ['Audio'],
    summary: '폐기된 R2 발음 경로',
    responses: {
      410: { content: { 'application/json': { schema: problemSchema } }, description: 'R2 발음 저장/재생은 정책상 비활성' },
    },
  },
]);

export { audioOA };
