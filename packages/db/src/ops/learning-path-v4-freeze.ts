// 강성호 2026-10-11: v4 전체은행은 source/selection bytes와 trusted binding을 다시 대조한 뒤에만 동결한다.
import { createHash } from "node:crypto";
import { fullV4Authoring } from "./learning-path-v4-authoring.js";
import { fullAuthoringFailures, fullSourceFailures, LEARNING_PATH_CONTENT_SOURCE, selectedConceptIdentity, type FullBankIntake, type SourceBinding } from "./learning-path-full-contract.js";
import { type SelectedConcept } from "./learning-path-v2-contract.js";
import { revisionContractFailures } from "./learning-path-revision-contract.js";

export const LEARNING_PATH_V4_FREEZE_VERSION = "lp4-2026-10-11";
export const LEARNING_PATH_V4_FREEZE_BUNDLE = "learning-path-v4-2026-10-11";
export const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

/** Resolved only from the immutable content-source checkout, never a caller-provided assertion. */
export type TrustedSourceBinding = SourceBinding & {
  trusted: true;
  content_source_sha: typeof LEARNING_PATH_CONTENT_SOURCE;
};

export type FrozenLearningPathV4 = {
  scope: "full-bank-only";
  publication: "draft-unpublished";
  version: "lp4-2026-10-11" | "lp5-2026-10-11" | "lp6-2026-10-11" | "lp7-2026-10-11";
  bundle: "learning-path-v4-2026-10-11" | "learning-path-v5-2026-10-11" | "learning-path-v6-2026-10-11" | "learning-path-v7-2026-10-11";
  screen_contract: {
    audio: "google-preferred-same-language-fallback-ko-ja-only-no-r2";
    r2_audio: "prohibited";
    legacy_audio: "410-gone";
  };
  concepts: ReturnType<typeof fullV4Authoring>["concepts"];
  items: ReturnType<typeof fullV4Authoring>["items"];
  lessons: ReturnType<typeof fullV4Authoring>["lessons"];
  metadata: {
    content_source_sha: typeof LEARNING_PATH_CONTENT_SOURCE;
    source_scope: "full-bank-only";
    full_bank_source_complete: true;
    trusted_source_binding: "immutable-content-source";
    public_selection_sha256: string;
    hash_method: "SHA-256 of JSON.stringify(payload) after excluding draft_sha256, source_evidence_sha256 and concept_inventory_sha256";
  };
  draft_sha256: string;
  source_evidence_sha256: string;
  concept_inventory_sha256: string;
};

export type FreezePayloadInput = {
  sourceBytes: Buffer;
  publicSelectionBytes: Buffer;
  trustedSourceBinding: TrustedSourceBinding;
  /** Test-only override; production always uses the authored full v4 bank. */
  authoring?: ReturnType<typeof fullV4Authoring>;
  revision?: { version: "lp5-2026-10-11"; bundle: "learning-path-v5-2026-10-11" } | { version: "lp6-2026-10-11"; bundle: "learning-path-v6-2026-10-11" } | { version: "lp7-2026-10-11"; bundle: "learning-path-v7-2026-10-11" };
};

function parseSource(bytes: Buffer): FullBankIntake & { full_bank_source_complete?: boolean } {
  try { return JSON.parse(bytes.toString("utf8")) as FullBankIntake & { full_bank_source_complete?: boolean }; }
  catch { throw new Error("source must be valid UTF-8 JSON"); }
}

function parseSelection(bytes: Buffer): SelectedConcept[] {
  try {
    const parsed = JSON.parse(bytes.toString("utf8")) as { concepts?: SelectedConcept[] };
    if (!Array.isArray(parsed.concepts)) throw new Error("missing concepts");
    return parsed.concepts;
  } catch { throw new Error("public selection must be valid JSON with concepts"); }
}

/** Pure: validates every precondition before returning bytes that may be written by the CLI. */
export function freezeLearningPathV4Payload(input: FreezePayloadInput): { payload: FrozenLearningPathV4; conceptsBytes: Buffer } {
  const authoring = input.authoring ?? fullV4Authoring();
  const source = parseSource(input.sourceBytes);
  const selection = parseSelection(input.publicSelectionBytes);
  const selectionSHA = sha256(input.publicSelectionBytes);
  const sourceFailures = fullSourceFailures(authoring.concepts, source, input.trustedSourceBinding);
  const authoringFailures = [...fullAuthoringFailures(authoring.concepts, authoring.items, authoring.lessons),...revisionContractFailures({version:input.revision?.version??LEARNING_PATH_V4_FREEZE_VERSION,bundle:input.revision?.bundle??LEARNING_PATH_V4_FREEZE_BUNDLE,items:authoring.items,lessons:authoring.lessons},source)];

  if (input.trustedSourceBinding.trusted !== true || input.trustedSourceBinding.content_source_sha !== LEARNING_PATH_CONTENT_SOURCE) {
    throw new Error("trusted immutable content-source binding required");
  }
  if (selectionSHA !== input.trustedSourceBinding.inventory_sha256 || source.concept_inventory_sha256 !== selectionSHA) {
    throw new Error("public selection bytes do not match trusted source binding");
  }
  if (source.content_source_sha !== LEARNING_PATH_CONTENT_SOURCE || source.scope !== "full-bank-only" || source.full_bank_source_complete !== true) {
    throw new Error("source must declare complete full-bank-only coverage");
  }
  if (selection.length !== 220 || new Set(selection.map(concept => concept.key)).size !== 220
    || selection.some((concept, index) => !authoring.concepts[index] || selectedConceptIdentity(concept) !== selectedConceptIdentity(authoring.concepts[index]!))) {
    throw new Error("public selection does not exactly match the authored full bank");
  }
  if (authoringFailures.length || sourceFailures.length) {
    throw new Error([...authoringFailures, ...sourceFailures].join("\n"));
  }

  const conceptsBytes = Buffer.from(`${JSON.stringify({ concepts: authoring.concepts }, null, 2)}\n`);
  const payloadWithoutHashes: Omit<FrozenLearningPathV4, "draft_sha256" | "source_evidence_sha256" | "concept_inventory_sha256"> = {
    scope: "full-bank-only" as const,
    publication: "draft-unpublished" as const,
    version: input.revision?.version ?? LEARNING_PATH_V4_FREEZE_VERSION,
    bundle: input.revision?.bundle ?? LEARNING_PATH_V4_FREEZE_BUNDLE,
    screen_contract: {
      audio: "google-preferred-same-language-fallback-ko-ja-only-no-r2" as const,
      r2_audio: "prohibited" as const,
      legacy_audio: "410-gone" as const,
    },
    concepts: authoring.concepts,
    items: authoring.items,
    lessons: authoring.lessons,
    metadata: {
      content_source_sha: LEARNING_PATH_CONTENT_SOURCE,
      source_scope: "full-bank-only" as const,
      full_bank_source_complete: true as const,
      trusted_source_binding: "immutable-content-source" as const,
      public_selection_sha256: selectionSHA,
      hash_method: "SHA-256 of JSON.stringify(payload) after excluding draft_sha256, source_evidence_sha256 and concept_inventory_sha256",
    },
  };
  return {
    payload: {
      ...payloadWithoutHashes,
      draft_sha256: sha256(JSON.stringify(payloadWithoutHashes)),
      source_evidence_sha256: sha256(input.sourceBytes),
      concept_inventory_sha256: sha256(conceptsBytes),
    },
    conceptsBytes,
  };
}
