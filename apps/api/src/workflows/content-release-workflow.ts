import {
  assertContentReleaseQueueMessage,
  type ContentReleaseApprovalEvent,
  type ContentReleaseWorkflowParams,
} from '@nihongo-n3/shared';
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';

import type { Env } from '../types.js';

export const CONTENT_RELEASE_WORKFLOW_STEPS = [
  'ingest-manifest-reference',
  'validate-manifest-reference',
  'record-ai-draft-stage',
  'record-qa-stage',
  'wait-for-human-approval',
  'create-preview-candidate',
] as const;

type ReleaseStateRow = { release_state: string };

async function markJobState(db: D1Database, jobId: string, state: string, errorCode?: string): Promise<void> {
  await db.prepare(
    `UPDATE content_release_jobs
        SET job_state = ?, error_code = ?, updated_at = unixepoch()
      WHERE id = ?`,
  ).bind(state, errorCode ?? null, jobId).run();
}

function assertApprovalEvent(
  value: ContentReleaseApprovalEvent,
  expected: ContentReleaseWorkflowParams,
): void {
  if (
    value.releaseId !== expected.releaseId ||
    value.jobId !== expected.jobId ||
    !['approved', 'rejected'].includes(value.decision) ||
    !/^[a-z0-9][a-z0-9._-]{2,127}$/.test(value.operatorRef)
  ) {
    throw new Error('invalid human approval event');
  }
}

/**
 * Durable orchestration only. No stage writes learning content into public
 * tables and no stage transitions a release to published.
 */
export class ContentReleaseWorkflow extends WorkflowEntrypoint<Env, ContentReleaseWorkflowParams> {
  async run(
    event: Readonly<WorkflowEvent<ContentReleaseWorkflowParams>>,
    step: WorkflowStep,
  ): Promise<{ outcome: 'preview_candidate' | 'rejected'; releaseId: string; jobId: string }> {
    const params = event.payload;
    const { workflowVersion: _workflowVersion, ...queueMessage } = params;
    assertContentReleaseQueueMessage(queueMessage);
    if (!params.artifactKey.startsWith('evidence/manifest/')) {
      throw new Error('content release workflows require an immutable manifest reference');
    }

    await step.do(CONTENT_RELEASE_WORKFLOW_STEPS[0], async () => {
      const object = await this.env.CONTENT_EVIDENCE.head(params.artifactKey);
      if (!object || object.customMetadata?.checksum !== params.artifactSha256) {
        throw new Error('manifest evidence object is missing or does not match its digest');
      }
      return { artifactKey: params.artifactKey, artifactSha256: params.artifactSha256 };
    });

    await step.do(CONTENT_RELEASE_WORKFLOW_STEPS[1], async () => {
      await markJobState(this.env.DB, params.jobId, 'processing');
      return { validated: true };
    });
    await step.do(CONTENT_RELEASE_WORKFLOW_STEPS[2], async () => ({
      draft: 'reference-recorded',
      note: 'No AI model is invoked by the control plane.',
    }));
    await step.do(CONTENT_RELEASE_WORKFLOW_STEPS[3], async () => ({ qa: 'reference-recorded' }));
    await step.do('mark-waiting-for-human-approval', async () => {
      await markJobState(this.env.DB, params.jobId, 'waiting_for_approval');
      return { waiting: true };
    });

    const approval = await step.waitForEvent<ContentReleaseApprovalEvent>(
      CONTENT_RELEASE_WORKFLOW_STEPS[4],
      { type: 'content-release-approval', timeout: '30 days' },
    );
    assertApprovalEvent(approval.payload, params);

    if (approval.payload.decision === 'rejected') {
      await step.do('record-human-rejection', async () => {
        await markJobState(this.env.DB, params.jobId, 'cancelled', 'human_rejected');
        return { rejected: true };
      });
      return { outcome: 'rejected', releaseId: params.releaseId, jobId: params.jobId };
    }

    await step.do(CONTENT_RELEASE_WORKFLOW_STEPS[5], async () => {
      const release = await this.env.DB.prepare(
        'SELECT release_state FROM content_releases WHERE id = ? LIMIT 1',
      ).bind(params.releaseId).first<ReleaseStateRow>();
      if (release?.release_state !== 'approved') {
        throw new Error('human approval event requires an approved release ledger entry');
      }
      await this.env.DB.batch([
        this.env.DB.prepare(
          `INSERT OR IGNORE INTO content_release_preview_candidates
            (id, release_id, candidate_state, manifest_key, manifest_sha256)
           VALUES (?, ?, 'created', ?, ?)`,
        ).bind(`preview-${params.releaseId}`, params.releaseId, params.artifactKey, params.artifactSha256),
        this.env.DB.prepare(
          `UPDATE content_release_jobs
              SET job_state = 'succeeded', error_code = NULL, updated_at = unixepoch()
            WHERE id = ?`,
        ).bind(params.jobId),
      ]);
      return { previewCandidate: true };
    });

    return { outcome: 'preview_candidate', releaseId: params.releaseId, jobId: params.jobId };
  }
}
