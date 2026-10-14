import fs from 'node:fs';
import path from 'node:path';

import { CONTENT_EXPANSION_INDEPENDENT_REVIEWS } from '../content/reviews/content-expansion-independent-reviews.js';
import { REPO_ROOT } from '../seed/constants.js';

const outputPath = path.resolve(process.argv.find((arg) => arg.startsWith('--out='))?.slice('--out='.length)
  ?? path.join(REPO_ROOT, '.artifacts/content-quality/content-expansion-independent-reviews-2026-08-19.json'));
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(CONTENT_EXPANSION_INDEPENDENT_REVIEWS, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  output_path: outputPath,
  final_draft_sha256: CONTENT_EXPANSION_INDEPENDENT_REVIEWS.final_draft_sha256,
  reviewers: CONTENT_EXPANSION_INDEPENDENT_REVIEWS.reviewers,
  item_count: CONTENT_EXPANSION_INDEPENDENT_REVIEWS.decisions.length,
  artifact_sha256: CONTENT_EXPANSION_INDEPENDENT_REVIEWS.artifact_sha256,
}, null, 2));
