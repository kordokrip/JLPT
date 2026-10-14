// 강성호 2026-10-11: 새 전체은행의 문항·개념·레슨·출처 연결을 검사한다. 자동 구조는 독립 의미 승인을 대신하지 않는다.
import { authoringStructureFailures, type AuthoredItem } from "./learning-path-authoring-structure.js";
import { dictionaryJapaneseLemma } from "./learning-source-parsers.js";
import { dictionaryWebEvidenceFailures } from "./dictionary-web-evidence.js";
import { sha256, type SelectedConcept } from "./learning-path-v2-contract.js";
export const LEARNING_PATH_CONTENT_SOURCE = "3485c6ef8addda3cd3e209730646c296175cf3c9";
export type SourceBinding = { inventory_sha256: string; owned_file_sha256: Record<string, string>; concept_owned_files: Record<string, string> };
export const selectedConceptIdentity = (concept: SelectedConcept) => sha256(JSON.stringify({
  key: concept.key, track: concept.track, level: concept.level, section: concept.section,
  lookup: concept.lookup, canonical_ref: concept.canonical_ref, authoring_context: concept.authoring_context,
}));
export const ownedFactValue = (concept: SelectedConcept) =>
  `Public canonical ${concept.lookup.type}, track ${concept.track}, local learning level ${concept.level}; concept identity SHA ${selectedConceptIdentity(concept)}. No source question, passage or audio retained in intake.`;
export const ownedFactLocator = (concept: SelectedConcept, inventorySHA: string) =>
  `selected public concept ${concept.key}; exact-level natural-key lookup; evidence selection inventory ${inventorySHA}`;
export type LearningPathLesson = {
  id: string; track: "jlpt-ja" | "topik-ko"; level: string; ordinal: number;
  concept_keys: [string, string]; question_ids: [string, string]; context_tags: [string, string];
};
export type SourceRecord = {
  source: { id: string; url: string; license: { id: string; url: string }; attribution: string;
    allowed_use: string; retrieved_at: string; sha256: string };
  facts: { id: string; kind: string; language: string; value: string; source_locator: string }[];
};
export type FullBankIntake = {
  scope: string; records: SourceRecord[]; concept_inventory_sha256?: string; content_source_sha?: string;
  concept_evidence: { concept_key: string; owned_record_id: string; owned_fact_id: string;
    dictionary_record_ids: string[]; dictionary_check: "verified" | "not-applicable" | "missing" }[];
};
export function buildLearningPathLessons(concepts: readonly SelectedConcept[], items: readonly AuthoredItem[], prefix: string): LearningPathLesson[] {
  const result: LearningPathLesson[] = [];
  for (const group of new Set(concepts.map(c => `${c.track}/${c.level}`))) {
    const selected = concepts.filter(c => `${c.track}/${c.level}` === group);
    if (selected.length !== 20) throw new Error(`Exactly twenty concepts required: ${group}`);
    const { track, level } = selected[0]!;
    const pairs: [SelectedConcept, SelectedConcept][] = [];
    if (track === "jlpt-ja") {
      const vocab = selected.filter(c => c.section === "vocab");
      const grammar = selected.filter(c => c.section === "grammar");
      // Preserve the confirmed representative N3 concept pair without inheriting its review approval.
      if (level === "N3") grammar.unshift(...grammar.splice(grammar.findIndex(c => c.key.endsWith("grammar-4")), 1));
      const kanji = selected.filter(c => c.section === "kanji"), listening = selected.filter(c => c.section === "listening");
      if ([vocab, grammar, kanji, listening].some(section => section.length !== 5)) throw new Error(`JLPT concept sections incomplete: ${group}`);
      vocab.forEach((c, index) => pairs.push([c, grammar[index]!]));
      kanji.forEach((c, index) => pairs.push([c, listening[index]!]));
    } else {
      const by = (section: string) => selected.filter(c => c.section === section);
      const vocab = by("vocab"), grammar = by("grammar"), reading = by("reading"), listening = by("listening"), writing = by("writing");
      if ([vocab, grammar, reading, listening, writing].some(section => section.length !== 4)) throw new Error(`TOPIK concept sections incomplete: ${group}`);
      vocab.forEach((c, index) => pairs.push([c, grammar[index]!]));
      reading.forEach((c, index) => pairs.push([c, listening[index]!]));
      pairs.push([writing[0]!, writing[1]!], [writing[2]!, writing[3]!]);
    }
    for (let variant = 0; variant < 2; variant++) for (const [index, pair] of pairs.entries()) {
      const questions = pair.map(concept => {
        const contexts = items.filter(item => item.concept_key === concept.key);
        if (contexts.length !== 2 || new Set(contexts.map(item => item.context_tag)).size !== 2) throw new Error(`Two authored contexts missing: ${concept.key}`);
        return contexts[variant]!;
      });
      const ordinal = variant * 10 + index + 1;
      result.push({ id: `${prefix}-lesson-${track}-${level}-${String(ordinal).padStart(2, "0")}`, track, level, ordinal,
        concept_keys: [pair[0].key, pair[1].key], question_ids: [questions[0]!.id, questions[1]!.id],
        context_tags: [questions[0]!.context_tag, questions[1]!.context_tag] });
    }
  }
  return result;
}
export function lessonStructureFailures(concepts: readonly SelectedConcept[], items: readonly AuthoredItem[], lessons: readonly LearningPathLesson[]): string[] {
  const failures: string[] = [], ids = new Set<string>(), questions = new Map<string, number>(), conceptsUsed = new Map<string, number>();
  if (lessons.length !== concepts.length) failures.push("one lesson per selected concept in two-context pairing required");
  for (const lesson of lessons) {
    if (ids.has(lesson.id)) failures.push(`duplicate lesson ${lesson.id}`); ids.add(lesson.id);
    if (lesson.concept_keys.length !== 2 || new Set(lesson.concept_keys).size !== 2 || lesson.question_ids.length !== 2 || lesson.context_tags.length !== 2) failures.push(`lesson needs two distinct concepts and two questions: ${lesson.id}`);
    lesson.concept_keys.forEach((key, index) => {
      const concept = concepts.find(c => c.key === key), question = items.find(item => item.id === lesson.question_ids[index]);
      if (!concept || !question || concept.track !== lesson.track || concept.level !== lesson.level || question.concept_key !== key || question.context_tag !== lesson.context_tags[index]) failures.push(`lesson exact concept/question/context mismatch: ${lesson.id}/${index}`);
      conceptsUsed.set(key, (conceptsUsed.get(key) ?? 0) + 1);
      const id = lesson.question_ids[index]!; questions.set(id, (questions.get(id) ?? 0) + 1);
    });
  }
  for (const concept of concepts) if (conceptsUsed.get(concept.key) !== 2) failures.push(`concept must occur in two lessons: ${concept.key}`);
  for (const item of items) if (questions.get(item.id) !== 1) failures.push(`question must occur exactly once: ${item.id}`);
  for (const group of new Set(concepts.map(c => `${c.track}/${c.level}`))) {
    const ordinals = lessons.filter(l => `${l.track}/${l.level}` === group).map(l => l.ordinal).sort((a, b) => a - b);
    if (ordinals.length !== 20 || ordinals.some((n, index) => n !== index + 1)) failures.push(`lesson ordinals must be 1–20: ${group}`);
  }
  return failures;
}
export const koreanDictionaryForms: Record<string, string[]> = {
  "안녕하세요.": ["안녕"], "맑음": ["맑다"], "분리배출": ["분리", "배출"],
  "사회 문제": ["사회", "문제"], "자료 해석": ["자료", "해석"],
};
export function expectedDictionaryForms(concept: SelectedConcept): string[] {
  if (concept.track === "jlpt-ja" && ["vocab", "kanji"].includes(concept.section)) return [dictionaryJapaneseLemma(concept.lookup.value)];
  if (concept.track === "topik-ko" && concept.section === "vocab") {
    const answer = JSON.parse(String(concept.authoring_context.answer_json)) as { choices: string[]; answer_index: number };
    const value = answer.choices[answer.answer_index]!;
    return koreanDictionaryForms[value] ?? [value];
  }
  return [];
}
export function fullSourceFailures(concepts: readonly SelectedConcept[], intake: FullBankIntake, binding?: SourceBinding): string[] {
  const failures: string[] = [];
  if (intake.scope !== "full-bank-only") failures.push("source must explicitly cover the full bank");
  if (!binding || !/^[a-f0-9]{64}$/.test(binding.inventory_sha256) || intake.concept_inventory_sha256 !== binding.inventory_sha256 || intake.content_source_sha !== LEARNING_PATH_CONTENT_SOURCE) failures.push("missing or mismatched trusted inventory/content-source binding");
  const records = new Map(intake.records.map(r => [r.source.id, r]));
  if (records.size !== intake.records.length) failures.push("duplicate source record ID");
  if (intake.concept_evidence.length !== concepts.length || new Set(intake.concept_evidence.map(e => e.concept_key)).size !== concepts.length) failures.push("source concept coverage mismatch");
  for (const concept of concepts) {
    const evidence = intake.concept_evidence.find(e => e.concept_key === concept.key);
    if (!evidence) { failures.push(`missing exact public-owned identity/hash evidence: ${concept.key}`); continue; }
    const own = evidence && records.get(evidence.owned_record_id);
    const fact = own?.facts.find(f => f.id === evidence?.owned_fact_id);
    const prefix = `https://github.com/kordokrip/JLPT/blob/${LEARNING_PATH_CONTENT_SOURCE}/`;
    const file = own?.source.url.startsWith(prefix) ? own.source.url.slice(prefix.length) : "";
    if (!binding || !evidence || !own || !file || binding.concept_owned_files[concept.key] !== file || !binding.owned_file_sha256[file] || own.source.sha256 !== binding.owned_file_sha256[file]
      || own.source.id !== `owned-${sha256(file).slice(0, 20)}`
      || own.source.license.url !== `${prefix}docs/ATTRIBUTIONS.md`
      || !fact || fact.kind !== "exam-structure" || fact.language !== "en" || fact.id !== `${concept.key}-public-identity`
      || fact.value !== ownedFactValue(concept) || fact.source_locator !== ownedFactLocator(concept, binding.inventory_sha256)) failures.push(`missing exact public-owned identity/hash evidence: ${concept.key}`);
    const forms = expectedDictionaryForms(concept);
    const supporting = evidence.dictionary_record_ids.map(id => records.get(id));
    const language = concept.track === "jlpt-ja" ? "ja" : "ko";
    const verifiedDictionary = (record: SourceRecord | undefined) => {
      if (!record) return false;
      if (dictionaryWebEvidenceFailures(record).length) return false;
      try {
        const host = new URL(record.source.url).hostname;
        return concept.track === "jlpt-ja" ? ["www.edrdg.org", "edrdg.org"].includes(host) && record.source.license.id === "CC-BY-SA-4.0"
          : host === "krdict.korean.go.kr" && record.source.license.id === "CC-BY-SA-2.0-KR";
      } catch { return false; }
    };
    if (forms.length && (evidence.dictionary_check !== "verified" || forms.some(form => !supporting.some(r => verifiedDictionary(r) && r?.facts.some(f => f.kind === "lexical-form" && f.language === language && f.value === form))))) failures.push(`missing exact dictionary fact: ${concept.key}`);
    if (!forms.length && evidence.dictionary_check !== "not-applicable") failures.push(`incorrect dictionary scope: ${concept.key}`);
    for (const record of [own, ...supporting]) if (!record || !/^https:\/\//.test(record.source.url) || !record.source.license.id || !record.source.license.url || !record.source.attribution || record.source.allowed_use !== "language-facts-and-metadata-only" || !Number.isFinite(Date.parse(record.source.retrieved_at)) || !/^[a-f0-9]{64}$/.test(record.source.sha256)) failures.push(`source provenance incomplete: ${concept.key}`);
  }
  return failures;
}
export function fullAuthoringFailures(concepts: readonly SelectedConcept[], items: readonly AuthoredItem[], lessons: readonly LearningPathLesson[]): string[] {
  const failures = authoringStructureFailures(items, concepts, Object.fromEntries(concepts.map(c => [c.key, c.cue])));
  if (concepts.length !== 220 || items.length !== 440 || lessons.length !== 220) failures.push("full bank requires 220 concepts / 440 items / 220 lessons");
  const levels = new Set(concepts.map(c => `${c.track}/${c.level}`));
  if (levels.size !== 11 || [...["N5", "N4", "N3", "N2", "N1"].map(level => `jlpt-ja/${level}`), ...[1, 2, 3, 4, 5, 6].map(level => `topik-ko/${level}`)].some(level => !levels.has(level))) failures.push("eleven exact levels required");
  return [...failures, ...lessonStructureFailures(concepts, items, lessons)];
}
