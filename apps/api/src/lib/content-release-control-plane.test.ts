import { describe, expect, it } from 'vitest';

import {
  CONTENT_RELEASE_DLQ_NAME,
  CONTENT_RELEASE_QUEUE_NAME,
  InMemoryContentReleaseControlStore,
  buildReleaseQueueMessage,
  consumeContentReleaseDelivery,
  type QueueDelivery,
} from './content-release-control-plane.js';
import { CONTENT_RELEASE_WORKFLOW_STEPS } from '../workflows/content-release-workflow.js';

const SHA = 'a'.repeat(64);
const message = buildReleaseQueueMessage({
  releaseId: 'topik-release-v1',
  jobId: 'topik-job-v1',
  artifactKey: `evidence/manifest/v1/topik-release-v1/${SHA}/artifact.json`,
  artifactSha256: SHA,
});

function delivery(body: unknown, id = 'message-v1', attempts = 1): QueueDelivery & { acked: number; retried: number } {
  return {
    id,
    attempts,
    body,
    acked: 0,
    retried: 0,
    ack() { this.acked += 1; },
    retry() { this.retried += 1; },
  };
}

describe('content release queue control plane', () => {
  it('keeps the durable workflow at preview candidate rather than publication', () => {
    expect(CONTENT_RELEASE_WORKFLOW_STEPS).toEqual([
      'ingest-manifest-reference',
      'validate-manifest-reference',
      'record-ai-draft-stage',
      'record-qa-stage',
      'wait-for-human-approval',
      'create-preview-candidate',
    ]);
    expect(CONTENT_RELEASE_WORKFLOW_STEPS).not.toContain('publish-production');
  });

  it('starts exactly one workflow for at-least-once duplicate delivery', async () => {
    const store = new InMemoryContentReleaseControlStore();
    store.addJob(message.jobId, message.idempotencyKey);
    const starts: string[] = [];
    const workflow = { create: async ({ id }: { id: string; params: typeof message }) => {
      starts.push(id);
      return { id };
    } };

    const first = delivery(message, 'message-first');
    const second = delivery(message, 'message-second', 2);
    await expect(consumeContentReleaseDelivery(first, CONTENT_RELEASE_QUEUE_NAME, store, workflow)).resolves.toBe('acknowledged');
    await expect(consumeContentReleaseDelivery(second, CONTENT_RELEASE_QUEUE_NAME, store, workflow)).resolves.toBe('duplicate');

    expect(starts).toHaveLength(1);
    expect(first.acked).toBe(1);
    expect(second.acked).toBe(1);
  });

  it('retries workflow startup failures without acknowledging the delivery', async () => {
    const store = new InMemoryContentReleaseControlStore();
    store.addJob(message.jobId, message.idempotencyKey);
    const failedDelivery = delivery(message);
    const workflow = { create: async () => { throw new Error('temporary failure'); } };

    await expect(consumeContentReleaseDelivery(failedDelivery, CONTENT_RELEASE_QUEUE_NAME, store, workflow)).resolves.toBe('retried');
    expect(failedDelivery.retried).toBe(1);
    expect(failedDelivery.acked).toBe(0);
    expect(store.jobs.get(message.jobId)?.state).toBe('retryable_failed');
  });

  it('records one reference-only poison report for a DLQ delivery', async () => {
    const store = new InMemoryContentReleaseControlStore();
    store.addJob(message.jobId, message.idempotencyKey);
    const dlqDelivery = delivery(message, 'message-dlq', 4);
    const workflow = { create: async () => ({ id: 'not-used' }) };

    await expect(consumeContentReleaseDelivery(dlqDelivery, CONTENT_RELEASE_DLQ_NAME, store, workflow)).resolves.toBe('poisoned');
    await consumeContentReleaseDelivery(dlqDelivery, CONTENT_RELEASE_DLQ_NAME, store, workflow);
    expect(store.poisonReports).toEqual([{ jobId: message.jobId, messageId: 'message-dlq', reasonCode: 'dlq_delivery' }]);
    expect(store.jobs.get(message.jobId)?.state).toBe('poisoned');
  });

  it('rejects a message that attempts to include content', async () => {
    const store = new InMemoryContentReleaseControlStore();
    const badDelivery = delivery({ ...message, content: 'not allowed' });
    const workflow = { create: async () => ({ id: 'not-used' }) };

    await expect(consumeContentReleaseDelivery(badDelivery, CONTENT_RELEASE_QUEUE_NAME, store, workflow)).resolves.toBe('rejected');
    expect(badDelivery.acked).toBe(1);
    expect(badDelivery.retried).toBe(0);
  });
});
