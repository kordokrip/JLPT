import { OpenAPIHono } from '@hono/zod-openapi';

import { observabilityOps } from './routes/observability-ops.js';
import type { AppEnv } from './types.js';

const receiver = new OpenAPIHono<AppEnv>();

receiver.get('/health', (c) => c.json({
  status: 'ok',
  service: 'nihongo-n3-observability-receiver',
  environment: c.env.ENVIRONMENT,
  release: c.env.RELEASE_SHA || 'development',
}));
receiver.route('/', observabilityOps);
receiver.notFound((c) => c.json({ error: 'not found' }, 404));

export { receiver };

export default {
  fetch: receiver.fetch,
};
