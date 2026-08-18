import fs from 'node:fs';
import path from 'node:path';

import { CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2 } from '../content/reviews/content-expansion-adversarial-review-2.js';

const outputPath = path.resolve(import.meta.dirname, '../../../../.artifacts/content-quality/content-expansion-adversarial-review-2.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  output_path: outputPath,
  review_id: CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.review_id,
  reviewer_id: CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.reviewer_id,
  ...CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.scope,
  artifact_sha256: CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.artifact_sha256,
  release_state: CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.release_state,
}, null, 2));
