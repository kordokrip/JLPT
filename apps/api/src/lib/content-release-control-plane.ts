import {
  assertContentReleaseQueueMessage,
  createContentReleaseIdempotencyKey,
  toWorkflowParams,
  type ContentReleaseQueueMessage,
  type ContentReleaseWorkflowParams,
} from '@nihongo-n3/shared';

import type { Env } from '../types.js';

export const CONTENT_RELEASE_QUEUE_NAME = 'nihongo-n3-content-release';
export const CONTENT_RELEASE_DLQ_NAME = 'nihongo-n3-content-release-dlq';
const RETRY_DELAY_SECONDS = 60;

export interface QueueDelivery {
  id: string;
  attempts: number;
  body: unknown;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

export interface ContentReleaseWorkflowStarter {
  create(options: {
    id: string;
    params: ContentReleaseWorkflowParams;
    retention?: { successRetention: '7 days'; errorRetention: '30 days' };
  }): Promise<{ id: string }>;
}

export interface ContentReleaseControlStore {
  claimDelivery(message: ContentReleaseQueueMessage, attempts: number): Promise<'claimed' | 'duplicate' | 'missing'>;
  markWorkflowStarted(jobId: string, workflowInstanceId: string): Promise<void>;
  markRetryableFailure(jobId: string, errorCode: string): Promise<void>;
  recordPoisonReport(input: {
    jobId: string;
    queueName: string;
    messageId: string;
    idempotencyKey: string;
    attempts: number;
    reasonCode: string;
    artifactKey: string;
    artifactSha256: string;
  }): Promise<void>;
}

type ContentReleaseJobRow = {
  id: string;
  workflow_instance_id: string | null;
  job_state: string;
};

export class D1ContentReleaseControlStore implements ContentReleaseControlStore {
  constructor(private readonly db: D1Database) {}

  async claimDelivery(message: ContentReleaseQueueMessage, attempts: number): Promise<'claimed' | 'duplicate' | 'missing'> {
    const existing = await this.db.prepare(
      `SELECT id, workflow_instance_id, job_state
         FROM content_release_jobs
        WHERE id = ? AND release_id = ? AND artifact_key = ?
          AND artifact_sha256 = ? AND idempotency_key = ?
        LIMIT 1`,
    ).bind(
      message.jobId,
      message.releaseId,
      message.artifactKey,
      message.artifactSha256,
      message.idempotencyKey,
    ).first<ContentReleaseJobRow>();

    if (!existing) return 'missing';
    if (existing.workflow_instance_id || ['succeeded', 'poisoned', 'cancelled'].includes(existing.job_state)) {
      return 'duplicate';
    }

    const result = await this.db.prepare(
      `UPDATE content_release_jobs
          SET job_state = 'processing', queue_attempts = ?, error_code = NULL, updated_at = unixepoch()
        WHERE id = ? AND workflow_instance_id IS NULL
          AND job_state IN ('queued', 'retryable_failed')`,
    ).bind(attempts, message.jobId).run();

    return result.meta.changes > 0 ? 'claimed' : 'duplicate';
  }

  async markWorkflowStarted(jobId: string, workflowInstanceId: string): Promise<void> {
    await this.db.prepare(
      `UPDATE content_release_jobs
          SET workflow_instance_id = ?, job_state = 'processing', updated_at = unixepoch()
        WHERE id = ?`,
    ).bind(workflowInstanceId, jobId).run();
  }

  async markRetryableFailure(jobId: string, errorCode: string): Promise<void> {
    await this.db.prepare(
      `UPDATE content_release_jobs
          SET job_state = 'retryable_failed', error_code = ?, updated_at = unixepoch()
        WHERE id = ? AND job_state <> 'poisoned'`,
    ).bind(errorCode, jobId).run();
  }

  async recordPoisonReport(input: {
    jobId: string;
    queueName: string;
    messageId: string;
    idempotencyKey: string;
    attempts: number;
    reasonCode: string;
    artifactKey: string;
    artifactSha256: string;
  }): Promise<void> {
    const reportId = `poison-${input.messageId}`;
    await this.db.batch([
      this.db.prepare(
        `INSERT OR IGNORE INTO content_release_poison_reports
          (id, job_id, queue_name, message_id, idempotency_key, attempts, reason_code, artifact_key, artifact_sha256)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        reportId,
        input.jobId,
        input.queueName,
        input.messageId,
        input.idempotencyKey,
        input.attempts,
        input.reasonCode,
        input.artifactKey,
        input.artifactSha256,
      ),
      this.db.prepare(
        `UPDATE content_release_jobs
            SET job_state = 'poisoned', error_code = ?, updated_at = unixepoch()
          WHERE id = ?`,
      ).bind(input.reasonCode, input.jobId),
    ]);
  }
}

export type QueueDeliveryOutcome = 'acknowledged' | 'duplicate' | 'retried' | 'poisoned' | 'rejected';

function workflowInstanceId(message: ContentReleaseQueueMessage): string {
  return `release-${message.releaseId}-${message.jobId}`;
}

function safeErrorCode(error: unknown): string {
  if (error instanceof Error && error.name === 'WorkflowInstanceAlreadyExistsError') {
    return 'workflow_instance_exists';
  }
  return 'workflow_start_failed';
}

export async function consumeContentReleaseDelivery(
  delivery: QueueDelivery,
  queueName: string,
  store: ContentReleaseControlStore,
  workflow: ContentReleaseWorkflowStarter,
): Promise<QueueDeliveryOutcome> {
  try {
    assertContentReleaseQueueMessage(delivery.body);
  } catch {
    // A malformed message is discarded without logging its body. Every valid
    // producer path validates before enqueueing, so no safe job reference exists.
    delivery.ack();
    return 'rejected';
  }

  const message = delivery.body;
  if (queueName === CONTENT_RELEASE_DLQ_NAME) {
    await store.recordPoisonReport({
      jobId: message.jobId,
      queueName,
      messageId: delivery.id,
      idempotencyKey: message.idempotencyKey,
      attempts: delivery.attempts,
      reasonCode: 'dlq_delivery',
      artifactKey: message.artifactKey,
      artifactSha256: message.artifactSha256,
    });
    delivery.ack();
    return 'poisoned';
  }

  const claim = await store.claimDelivery(message, delivery.attempts);
  if (claim === 'duplicate') {
    delivery.ack();
    return 'duplicate';
  }
  if (claim === 'missing') {
    delivery.ack();
    return 'rejected';
  }

  try {
    const instance = await workflow.create({
      id: workflowInstanceId(message),
      params: toWorkflowParams(message),
      retention: { successRetention: '7 days', errorRetention: '30 days' },
    });
    await store.markWorkflowStarted(message.jobId, instance.id);
    delivery.ack();
    return 'acknowledged';
  } catch (error) {
    const errorCode = safeErrorCode(error);
    await store.markRetryableFailure(message.jobId, errorCode);
    delivery.retry({ delaySeconds: RETRY_DELAY_SECONDS });
    return 'retried';
  }
}

export async function handleContentReleaseQueueBatch(
  batch: MessageBatch<unknown>,
  env: Env,
): Promise<void> {
  const store = new D1ContentReleaseControlStore(env.DB);
  for (const message of batch.messages) {
    await consumeContentReleaseDelivery(
      message,
      batch.queue,
      store,
      env.CONTENT_RELEASE_WORKFLOW,
    );
  }
}

/** Local-only test double. No Worker binding or remote API is called. */
export class InMemoryContentReleaseControlStore implements ContentReleaseControlStore {
  readonly jobs = new Map<string, { idempotencyKey: string; state: string; workflowInstanceId: string | null }>();
  readonly poisonReports: Array<{ jobId: string; messageId: string; reasonCode: string }> = [];

  addJob(jobId: string, idempotencyKey: string): void {
    this.jobs.set(jobId, { idempotencyKey, state: 'queued', workflowInstanceId: null });
  }

  async claimDelivery(message: ContentReleaseQueueMessage): Promise<'claimed' | 'duplicate' | 'missing'> {
    const job = this.jobs.get(message.jobId);
    if (!job || job.idempotencyKey !== message.idempotencyKey) return 'missing';
    if (job.workflowInstanceId || ['succeeded', 'poisoned', 'cancelled'].includes(job.state)) return 'duplicate';
    job.state = 'processing';
    return 'claimed';
  }

  async markWorkflowStarted(jobId: string, workflowInstanceId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('missing job');
    job.workflowInstanceId = workflowInstanceId;
  }

  async markRetryableFailure(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('missing job');
    job.state = 'retryable_failed';
  }

  async recordPoisonReport(input: {
    jobId: string;
    queueName: string;
    messageId: string;
    idempotencyKey: string;
    attempts: number;
    reasonCode: string;
    artifactKey: string;
    artifactSha256: string;
  }): Promise<void> {
    const job = this.jobs.get(input.jobId);
    if (!job) throw new Error('missing job');
    job.state = 'poisoned';
    if (!this.poisonReports.some((report) => report.messageId === input.messageId)) {
      this.poisonReports.push({ jobId: input.jobId, messageId: input.messageId, reasonCode: input.reasonCode });
    }
  }
}

export function buildReleaseQueueMessage(input: Omit<ContentReleaseQueueMessage, 'version' | 'idempotencyKey'>): ContentReleaseQueueMessage {
  const idempotencyKey = createContentReleaseIdempotencyKey(input.releaseId, input.jobId, input.artifactSha256);
  const message: ContentReleaseQueueMessage = { version: 1, ...input, idempotencyKey };
  assertContentReleaseQueueMessage(message);
  return message;
}
