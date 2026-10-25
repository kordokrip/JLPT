// 강성호 2026-10-11: source evidence는 --source로 명시하고 새 cohort directory에만 exclusive-create 한다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LEARNING_PATH_V4_FREEZE_BUNDLE, freezeLearningPathV4Payload, type TrustedSourceBinding } from "./learning-path-v4-freeze.js";
import { resolveLearningPathV4SourceBinding } from "./learning-path-v4-source-binding.js";

const option = (name: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
export function writeFrozenLearningPathV4(
  outputDirectory: string,
  sourceBytes: Buffer,
  publicSelectionBytes: Buffer,
  trustedSourceBinding: TrustedSourceBinding,
) {
  const { payload, conceptsBytes } = freezeLearningPathV4Payload({ sourceBytes, publicSelectionBytes, trustedSourceBinding });
  if (existsSync(outputDirectory)) throw new Error("Frozen cohort directory already exists; choose a new cohort rather than overwrite evidence");
  mkdirSync(dirname(outputDirectory), { recursive: true });
  mkdirSync(outputDirectory); // Exclusive leaf creation: a racing cohort is never reused.
  try {
    writeFileSync(resolve(outputDirectory, "source.json"), sourceBytes, { flag: "wx" });
    writeFileSync(resolve(outputDirectory, "concepts.json"), conceptsBytes, { flag: "wx" });
    writeFileSync(resolve(outputDirectory, "bundle.json"), `${JSON.stringify(payload, null, 2)}\n`, { flag: "wx" });
  } catch (error) {
    throw error;
  }
  return payload;
}

const publicSelectionPath = fileURLToPath(new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json", import.meta.url));
export const defaultOutputDirectory = fileURLToPath(new URL(`../content/${LEARNING_PATH_V4_FREEZE_BUNDLE}/frozen-cohort-01/`, import.meta.url));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.slice(2).some(arg => !/^--(?:source|output)=.+$/u.test(arg))) throw new Error("Only explicit --source and --output are accepted; no database or remote flags");
  const sourcePath = option("source");
  if (!sourcePath) throw new Error("--source=<full-bank source JSON> is required");
  const publicSelectionBytes = readFileSync(publicSelectionPath);
  const trustedSourceBinding = resolveLearningPathV4SourceBinding(publicSelectionBytes);
  const payload = writeFrozenLearningPathV4(option("output") ? resolve(option("output")!) : defaultOutputDirectory, readFileSync(resolve(sourcePath)), publicSelectionBytes, trustedSourceBinding);
  console.log(JSON.stringify({ scope: payload.scope, publication: payload.publication, version: payload.version, bundle: payload.bundle, concepts: payload.concepts.length, items: payload.items.length, lessons: payload.lessons.length, draft_sha256: payload.draft_sha256, source_evidence_sha256: payload.source_evidence_sha256, concept_inventory_sha256: payload.concept_inventory_sha256 }));
}
