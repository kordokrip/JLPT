import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { audio } from './audio.js';
import { audioKeyParamSchema, problemSchema, registerDocsOnlyRoutes } from './openapi-docs.js';
const audioOA = new OpenAPIHono<AppEnv>();
audioOA.route('/', audio);
registerDocsOnlyRoutes(audioOA, [
  {
    method: 'get',
    path: '/audio/{key}',
    tags: ['Audio'],
    summary: 'R2 오디오 스트리밍',
    request: { params: audioKeyParamSchema },
    responses: {
      200: { content: { 'audio/mpeg': { schema: { type: 'string', format: 'binary' } } }, description: '오디오 파일' },
      206: { content: { 'audio/mpeg': { schema: { type: 'string', format: 'binary' } } }, description: 'Range 응답' },
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
