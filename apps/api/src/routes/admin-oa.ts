import { OpenAPIHono, z } from '@hono/zod-openapi';
import { AUDIO_BATCH_LEVELS, type AudioBatchLevel } from '@nihongo-n3/shared';
import type { AppEnv } from '../types.js';
import { admin } from './admin.js';
import { createdResponseSchema, dataResponseSchema, mountLegacyRouteWithOpenApiDocs, problemSchema } from './openapi-docs.js';
const adminOA = new OpenAPIHono<AppEnv>();
mountLegacyRouteWithOpenApiDocs(adminOA, admin, [
  {
    method: 'get',
    path: '/dashboard',
    tags: ['Admin'],
    summary: '관리자 대시보드 HTML',
    responses: {
      200: { content: { 'text/html': { schema: { type: 'string' } } }, description: '대시보드 HTML' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
    },
  },
  {
    method: 'get',
    path: '/weekly-report',
    tags: ['Admin'],
    summary: '주간 리포트 조회',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '주간 리포트' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '리포트 없음' },
    },
  },
  {
    method: 'post',
    path: '/weekly-report',
    tags: ['Admin'],
    summary: '주간 리포트 즉시 생성',
    responses: {
      201: { content: { 'application/json': { schema: createdResponseSchema } }, description: '생성 결과' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
    },
  },
  {
    method: 'post',
    path: '/audio/queue',
    tags: ['Admin', 'Audio'],
    summary: '승인된 Google TTS 오디오 배치 실행',
    request: {
      headers: z.object({
        'x-audio-batch-approval': z.string().optional(),
      }),
      body: {
        content: {
          'application/json': {
            schema: z.object({
              execute: z.boolean().default(false),
              dry_run: z.boolean().optional(),
              batch: z.number().int().min(1).max(200).optional(),
              provider: z.literal('google').optional(),
              level: z.enum([...AUDIO_BATCH_LEVELS] as [AudioBatchLevel, ...AudioBatchLevel[]]).optional(),
              force_regenerate: z.boolean().optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '큐 실행 결과' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
    },
  },
  {
    method: 'post',
    path: '/audio/curriculum-queue',
    tags: ['Admin', 'Audio'],
    summary: 'N1·TOPIK 불변 binding의 Google R2 오디오 소량 생성',
    request: {
      headers: z.object({ 'x-audio-batch-approval': z.string().optional() }),
      body: {
        content: {
          'application/json': {
            schema: z.object({
              execute: z.boolean().default(false),
              dry_run: z.boolean().optional(),
              batch: z.number().int().min(1).max(20).optional(),
              track: z.enum(['jlpt-ja', 'topik-ko']).optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: '큐 상태 또는 생성 결과' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
    },
  },
  {
    method: 'get',
    path: '/audio/providers',
    tags: ['Admin', 'Audio'],
    summary: 'TTS provider 운영 연결 상태 확인',
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: 'provider 상태' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
    },
  },
  {
    method: 'post',
    path: '/audio/qa/warmup',
    tags: ['Admin', 'Audio'],
    summary: '30개 QA 샘플 오디오 일괄 생성',
    request: {
      headers: z.object({ 'x-audio-batch-approval': z.string().optional() }),
      body: {
        content: {
          'application/json': {
            schema: z.object({
              provider: z.enum(['cloudflare', 'google', 'voicevox']).optional(),
              force: z.boolean().optional(),
              language: z.enum(['ja', 'ko']).optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: { content: { 'application/json': { schema: dataResponseSchema } }, description: 'QA 샘플 생성 결과' },
      401: { content: { 'application/json': { schema: problemSchema } }, description: '인증 필요' },
      403: { content: { 'application/json': { schema: problemSchema } }, description: '관리자 권한 필요' },
    },
  },
]);
export { adminOA };
