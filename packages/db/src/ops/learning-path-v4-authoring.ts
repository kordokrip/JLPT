// 강성호 2026-10-11: 전 급수 자체 저작 원본을 모으되 cue 누락을 초기 placeholder로 대체하지 않는다. 검수·공개 승인과는 별개다.
import { readFileSync } from "node:fs";
import { N5_ITEMS, N5_CONCEPT_CUES } from "../content/learning-path-v4-2026-10-11/n5-authored.js";
import { N4_ITEMS, N4_CONCEPT_CUES } from "../content/learning-path-v4-2026-10-11/n4-authored.js";
import { N3_ITEMS, N3_CONCEPT_CUES } from "../content/learning-path-v4-2026-10-11/n3-authored.js";
import { N2_ITEMS40, N2_CONCEPT_CUES20 } from "../content/learning-path-v4-2026-10-11/n2-authored.js";
import { N1_ITEMS40, N1_CONCEPT_CUES20 } from "../content/learning-path-v4-2026-10-11/n1-authored.js";
import { TOPIK1_ITEMS, TOPIK1_CONCEPT_CUES } from "../content/learning-path-v4-2026-10-11/topik1-authored.js";
import { TOPIK2_ITEMS, TOPIK2_CONCEPT_CUES } from "../content/learning-path-v4-2026-10-11/topik2-authored.js";
import { TOPIK34_ITEMS, TOPIK34_CONCEPT_CUES } from "../content/learning-path-v4-2026-10-11/topik34-authored.js";
import { TOPIK5_ITEMS, TOPIK5_CONCEPT_CUES } from "../content/learning-path-v4-2026-10-11/topik5-authored.js";
import { TOPIK6_ITEMS, TOPIK6_CONCEPT_CUES } from "../content/learning-path-v4-2026-10-11/topik6-authored.js";
import { buildLearningPathLessons } from "./learning-path-full-contract.js";
import { sha256, type SelectedConcept } from "./learning-path-v2-contract.js";
export function fullV4Authoring() {
  const inventoryBytes = readFileSync(new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json", import.meta.url));
  const selected = (JSON.parse(inventoryBytes.toString()) as {concepts:SelectedConcept[]}).concepts;
  const entries = [N5_CONCEPT_CUES,N4_CONCEPT_CUES,N3_CONCEPT_CUES,N2_CONCEPT_CUES20,N1_CONCEPT_CUES20,
    TOPIK1_CONCEPT_CUES,TOPIK2_CONCEPT_CUES,TOPIK34_CONCEPT_CUES,TOPIK5_CONCEPT_CUES,TOPIK6_CONCEPT_CUES].flatMap(Object.entries);
  if (entries.length !== 220 || new Set(entries.map(([key])=>key)).size !== 220 || entries.some(([key])=>!selected.some(c=>c.key===key))) throw new Error("Exactly 220 distinct authored cues required; no placeholder fallback");
  const cues = Object.fromEntries(entries);
  const concepts = selected.map(concept=>({ ...concept, cue:cues[concept.key]! }));
  const items = [...N5_ITEMS,...N4_ITEMS,...N3_ITEMS,...N2_ITEMS40,...N1_ITEMS40,
    ...TOPIK1_ITEMS,...TOPIK2_ITEMS,...TOPIK34_ITEMS,...TOPIK5_ITEMS,...TOPIK6_ITEMS];
  return { concepts, items, lessons:buildLearningPathLessons(concepts,items,"lp4"), concept_inventory_sha256:sha256(inventoryBytes) };
}
