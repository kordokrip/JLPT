import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getAdminOpenApiDocument,
  getPublicOpenApiDocument,
} from '../src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const outputDir = path.join(root, '.artifacts/openapi');
fs.mkdirSync(outputDir, { recursive: true });

for (const [name, document] of [
  ['public', getPublicOpenApiDocument()],
  ['admin', getAdminOpenApiDocument()],
] as const) {
  const file = path.join(outputDir, `${name}.json`);
  fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  console.log(`${name} OpenAPI: ${Object.keys(document.paths ?? {}).length} paths -> ${file}`);
}
