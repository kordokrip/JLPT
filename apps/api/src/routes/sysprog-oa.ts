import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { sysprog } from './sysprog.js';
import { sysProgQuerySchema } from '@nihongo-n3/shared';
import {
  dataResponseSchema,
  idParamSchema,
  listResponseSchema,
  problemSchema,
  registerDocsOnlyRoutes,
} from './openapi-docs.js';
const sysprogOA = new OpenAPIHono<AppEnv>();
sysprogOA.route('/', sysprog);
registerDocsOnlyRoutes(sysprogOA, [
  {
    method: 'get',
    path: '/sysprog',
    tags: ['Content'],
    summary: '직무/시스템 어휘 목록',
    request: { query: sysProgQuerySchema },
    responses: {
      200: { content: { 'application/json': { schema: listResponseSchema } }, description: '용어 목록' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
    },
  },
  {
    method: 'get',
    path: '/sysprog/{id}',
    tags: ['Content'],
    summary: '직무/시스템 어휘 단일 항목',
    request: { params: idParamSchema },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '용어 항목' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 ID' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '항목 없음' },
    },
  },
]);
export { sysprogOA };
