import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { sync } from './sync.js';
import { syncBodySchema } from '@nihongo-n3/shared';
import { dataResponseSchema, problemSchema, registerDocsOnlyRoutes } from './openapi-docs.js';
const syncOA = new OpenAPIHono<AppEnv>();
syncOA.route('/', sync);
registerDocsOnlyRoutes(syncOA, [
  {
    method: 'post',
    path: '/sync',
    tags: ['Sync'],
    summary: '오프라인 작업 동기화',
    request: { body: { content: { 'application/json': { schema: syncBodySchema } } } },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '동기화 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
]);
export { syncOA };
