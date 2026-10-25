import fs from 'node:fs';
import path from 'node:path';

import { NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS } from '../content/reviews/next-content-expansion-independent-reviews.js';
import { REPO_ROOT } from '../seed/constants.js';

const requested = process.argv.find((argument) => argument.startsWith('--out='))?.slice('--out='.length);
const outputPath = requested
  ? (path.isAbsolute(requested) ? requested : path.resolve(REPO_ROOT, requested))
  : path.resolve(REPO_ROOT, '.artifacts/content-quality/next-content-expansion-independent-reviews-2026-08-23.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  output_path: outputPath,
  passed: NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.passed,
  final_draft_sha256: NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.final_draft_sha256,
  source_evidence_sha256: NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.source_evidence_sha256,
  reviewers: NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.reviewers,
  item_count: NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.decisions.length,
  artifact_sha256: NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.artifact_sha256,
}, null, 2));
