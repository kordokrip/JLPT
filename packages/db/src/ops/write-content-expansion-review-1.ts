import fs from 'node:fs';
import path from 'node:path';

import { CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1 } from '../content/reviews/content-expansion-adversarial-review-1.js';

const outputPath = path.resolve(import.meta.dirname, '../../../../.artifacts/content-quality/content-expansion-adversarial-review-1.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ output_path: outputPath, ...CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1.scope, artifact_sha256: CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1.artifact_sha256 }, null, 2));
