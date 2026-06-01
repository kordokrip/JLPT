import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { audio } from './audio.js';
import { audioKeyParamSchema, problemSchema, registerDocsOnlyRoutes } from './openapi-docs.js';
import { z } from '@hono/zod-openapi';
const audioOA = new OpenAPIHono<AppEnv>();
audioOA.route('/', audio);
registerDocsOnlyRoutes(audioOA, [
  {
    method: 'get',
    path: '/audio/qa/{provider}/{index}.wav',
    tags: ['Audio'],
    summary: '고정 샘플 TTS QA 오디오',
    request: {
      params: z.object({
        provider: z.enum(['cloudflare', 'voicevox']),
        index: z.string().regex(/^\d+$/).openapi({ example: '1' }),
      }),
    },
    responses: {
      200: {
        content: {
          'audio/wav': { schema: { type: 'string', format: 'binary' } },
        },
        description: 'QA 샘플 오디오',
      },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: 'provider 미연결 또는 생성 실패' },
    },
  },
  {
    method: 'get',
    path: '/audio/{key}',
    tags: ['Audio'],
    summary: 'R2 오디오 스트리밍',
    request: { params: audioKeyParamSchema },
    responses: {
      200: {
        content: {
          'audio/mpeg': { schema: { type: 'string', format: 'binary' } },
          'audio/wav': { schema: { type: 'string', format: 'binary' } },
        },
        description: '오디오 파일',
      },
      206: {
        content: {
          'audio/mpeg': { schema: { type: 'string', format: 'binary' } },
          'audio/wav': { schema: { type: 'string', format: 'binary' } },
        },
        description: 'Range 응답',
      },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '파일 없음' },
      416: { description: 'Range Not Satisfiable' },
    },
  },
  {
    method: 'head',
    path: '/audio/{key}',
    tags: ['Audio'],
    summary: 'R2 오디오 메타데이터',
    request: { params: audioKeyParamSchema },
    responses: {
      200: { description: '오디오 메타데이터' },
      400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
      404: { content: { 'application/json': { schema: problemSchema } }, description: '파일 없음' },
    },
  },
]);
export { audioOA };
