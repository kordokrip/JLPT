import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { homophones } from './homophones.js';
import { homophonesQuerySchema } from '@nihongo-n3/shared';
import { listResponseSchema, problemSchema, registerDocsOnlyRoutes } from './openapi-docs.js';
const homophonesOA = new OpenAPIHono<AppEnv>();
homophonesOA.route('/', homophones);
registerDocsOnlyRoutes(homophonesOA, [
  {
    method: 'get',
    path: '/homophones',
    tags: ['Content'],
    summary: '동음이의어 쌍 목록',
    request: { query: homophonesQuerySchema },
    responses: {
      200: { content: { 'application/json': { schema: listResponseSchema } }, description: '동음이의어 목록' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
    },
  },
]);
export { homophonesOA };
