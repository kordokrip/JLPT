import { OpenAPIHono, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { notifications } from './notifications.js';
import { createdResponseSchema, dataResponseSchema, problemSchema, registerDocsOnlyRoutes } from './openapi-docs.js';

const notificationsOA = new OpenAPIHono<AppEnv>();
notificationsOA.route('/', notifications);

const subscriptionBodySchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  morningOn: z.boolean().optional(),
  eveningOn: z.boolean().optional(),
});

registerDocsOnlyRoutes(notificationsOA, [
  {
    method: 'post',
    path: '/notifications/subscribe',
    tags: ['Notifications'],
    summary: 'Push 구독 저장',
    request: { body: { content: { 'application/json': { schema: subscriptionBodySchema } } } },
    responses: {
      201: { content: { 'application/json': { schema: createdResponseSchema } }, description: '구독 저장 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
    },
  },
  {
    method: 'delete',
    path: '/notifications/subscribe',
    tags: ['Notifications'],
    summary: 'Push 구독 취소',
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({ endpoint: z.string().url() }),
          },
        },
      },
    },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '구독 취소 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '구독 없음' },
    },
  },
  {
    method: 'post',
    path: '/notifications/test',
    tags: ['Notifications'],
    summary: 'Push 테스트 알림 발송',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '발송 결과' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '구독 없음' },
    },
  },
]);

export { notificationsOA };
