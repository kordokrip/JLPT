import { OpenAPIHono } from '@hono/zod-openapi';
import {
  learningActivityEventsBodySchema,
  learningActivitySummaryQuerySchema,
} from '@nihongo-n3/shared';
import type { AppEnv } from '../types.js';
import { activity } from './activity.js';
import {
  createdResponseSchema,
  dataResponseSchema,
  mountLegacyRouteWithOpenApiDocs,
  problemSchema,
} from './openapi-docs.js';

const activityOA = new OpenAPIHono<AppEnv>();

mountLegacyRouteWithOpenApiDocs(activityOA, activity, [
  {
    method: 'post',
    path: '/activity/events',
    tags: ['Activity'],
    summary: '중복 안전 학습 활동 기록',
    request: { body: { content: { 'application/json': { schema: learningActivityEventsBodySchema } } } },
    responses: {
      201: { content: { 'application/json': { schema: createdResponseSchema } }, description: '저장 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 이벤트' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'get',
    path: '/activity/summary',
    tags: ['Activity'],
    summary: '7일 또는 30일 학습 활동 집계',
    request: { query: learningActivitySummaryQuerySchema },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '학습 활동 집계' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 기간' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
]);

export { activityOA };

