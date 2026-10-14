// 강성호 2026-10-11: 실제 공개 ID·급수·내용을 고정하며, 3대표 레슨의 검수를 440문항 승인으로 승격하지 않는다.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { ConceptSpec } from "../content/learning-path-2026-10-11/concept-specs.js";
import type { DraftItem } from "../content/learning-path-2026-10-11/data.js";
import type { StudyRef } from "../../../shared/src/learning-experience.js";
import { studyContentVersionInput } from "../../../shared/src/learning-experience.js";
import { publishedOwnerItem } from "../../../../apps/api/src/lib/owner-publication.js";
import { JLPT_REPRESENTATIVE_ITEMS } from "../content/learning-path-v2-2026-10-11/jlpt-representatives.js";
import { TOPIK_REPRESENTATIVE_ITEMS } from "../content/learning-path-v2-2026-10-11/topik-representatives.js";
export const V2_CONCEPT_PATH = new URL("../content/learning-path-v2-2026-10-11/concepts.json",import.meta.url);
export const V2_INTAKE_PATH = new URL("../content/learning-path-v2-2026-10-11/prototype-intake.json",import.meta.url);
export const sha256 = (value: string|Buffer) => createHash("sha256").update(value).digest("hex");
export type SelectedConcept = ConceptSpec & {canonical_ref:StudyRef;authoring_context:Record<string,unknown>};
export const SELECTED_CONCEPTS = (JSON.parse(readFileSync(V2_CONCEPT_PATH,"utf8")) as {concepts:SelectedConcept[]}).concepts;
export const REPRESENTATIVE_ITEMS = [...JLPT_REPRESENTATIVE_ITEMS,...TOPIK_REPRESENTATIVE_ITEMS];
export const REPRESENTATIVE_LESSONS = [
  {id:"lp2-prototype-n3-01",track:"jlpt-ja",level:"N3",concept_keys:["lp2-jlpt-n3-vocab-1","lp2-jlpt-n3-grammar-4"],question_ids:[JLPT_REPRESENTATIVE_ITEMS[0]!.id,JLPT_REPRESENTATIVE_ITEMS[2]!.id]},
  {id:"lp2-prototype-topik3-01",track:"topik-ko",level:"3",concept_keys:["lp2-topik-3-vocab-b1","lp2-topik-3-grammar-b1"],question_ids:[TOPIK_REPRESENTATIVE_ITEMS[0]!.id,TOPIK_REPRESENTATIVE_ITEMS[2]!.id]},
  {id:"lp2-prototype-topik4-01",track:"topik-ko",level:"4",concept_keys:["lp2-topik-4-vocab-b1","lp2-topik-4-grammar-b1"],question_ids:[TOPIK_REPRESENTATIVE_ITEMS[4]!.id,TOPIK_REPRESENTATIVE_ITEMS[6]!.id]},
] as const;
const tables = {
  vocab:["vocab","ja","level"],grammar:["grammar","pattern","level"],kanji:["kanji","char","jlpt_level"],
  sentence:["sentences","ja","level"],"topik-owner-item":["topik_owner_authored_curriculum_items","id","target_grade"],
} as const;
const contentColumns = {
  vocab:["level","ja","kana","ko","pos"],grammar:["level","pattern","connection","meaning_ko"],
  kanji:["jlpt_level","char","on_yomi","kun_yomi","meaning_ko"],sentence:["level","register","ja","kana","ko"],
  "topik-owner-item":["target_grade","item_type","prompt_ko","prompt_ja","prompt_en","answer_json","explanation_ko","explanation_ja","explanation_en","audio_required","audio_text_ko"],
} as const;
type DB={prepare(sql:string):{all(...args:unknown[]):Record<string,unknown>[]}};
export function resolveSelectedConcept(db:DB,concept:SelectedConcept):StudyRef {
  const type=concept.lookup.type,[table,valueColumn,levelColumn]=tables[type];
  if(String(concept.authoring_context[levelColumn])!==concept.level||String(concept.authoring_context[valueColumn])!==concept.lookup.value)
    throw new Error(`Public strict-level ID lookup failed: ${concept.key}`);
  const publication=type==="topik-owner-item"?` AND ${publishedOwnerItem("i")}`:"";
  // Canonical integer IDs differ between historical Production and a newly parsed fresh seed.
  // Match the exact natural key, level and meaning; parser-cleaned examples/source numeric IDs are not the concept identity.
  // Never copy/remap a Production integer into fresh D1, nor substitute a different-level concept.
  const candidates=db.prepare(`SELECT i.* FROM ${table} i WHERE i.${valueColumn}=? AND i.${levelColumn}=?${publication}`).all(
    concept.lookup.value,concept.track==="topik-ko"?Number(concept.level):concept.level);
  if(!candidates.length)throw new Error(`Public strict-level ID lookup failed: ${concept.key}`);
  const matches=candidates.filter(row=>contentColumns[type].every(column=>row[column]===concept.authoring_context[column]));
  if(matches.length!==1)throw new Error(`Selected concept content changed or ambiguous: ${concept.key}`);
  const row=matches[0]!;
  // Runtime speech attempt metadata may differ between fresh and Production. Preserve each target's actual ref version.
  return {track:concept.track,type,id:String(row.id),version:sha256(studyContentVersionInput(row))};
}
export function representativeBundle() {
  const keys = new Set<string>(REPRESENTATIVE_LESSONS.flatMap(l=>l.concept_keys));
  const payload = {scope:"representative-contract-only",publication:"draft-unpublished",version:"learning-path-v2-2026-10-11",
    screen_contract:{instructions:"ko/ja/en",stimulus_and_choices:"target-language-only",explanation:"localized-after-submit",learn_before_practice:true,
      listening_script:"hidden-before-first-answer",audio_core:"unchanged",pronunciation:"Google-preferred same-language installed fallback; ko/ja only; no R2 or legacy requests"},
    concepts:SELECTED_CONCEPTS.filter(c=>keys.has(c.key)),items:REPRESENTATIVE_ITEMS,lessons:REPRESENTATIVE_LESSONS};
  return {...payload,draft_sha256:sha256(JSON.stringify(payload)),source_evidence_sha256:sha256(readFileSync(V2_INTAKE_PATH)),
    concept_inventory_sha256:sha256(readFileSync(V2_CONCEPT_PATH))};
}
export function representativeStructureFailures(items: readonly (DraftItem & {context_tag:string})[]=REPRESENTATIVE_ITEMS):string[] {
  const failures:string[]=[],ids=new Set<string>();
  if(items.length!==12)failures.push("expected 12 representative/alternate items (not 440)");
  for(const item of items){
    if(ids.has(item.id))failures.push(`duplicate id ${item.id}`);ids.add(item.id);
    for(const language of ["ko","ja","en"] as const){
      if(!item.question[language]?.trim()||!item.explanation[language]?.trim())failures.push(`missing translation ${item.id}/${language}`);
      if(item.choices?.length!==4||new Set(item.choices.map(c=>c[language])).size!==4)failures.push(`invalid choices ${item.id}/${language}`);
      if(item.question[language]?.split("\n").slice(1).join("\n")!==item.question.ko.split("\n").slice(1).join("\n"))failures.push(`translated or mismatched stimulus ${item.id}/${language}`);
    }
    if(!Number.isInteger(item.answer_index)||item.answer_index!<0||item.answer_index!>3)failures.push(`invalid answer ${item.id}`);
    if(item.choices?.some(c=>c.ko!==c.ja||c.ko!==c.en))failures.push(`translated test choices ${item.id}`);
    if(!item.context_tag?.trim())failures.push(`missing situation ${item.id}`);
  }
  for(const key of new Set(items.map(i=>i.concept_key))){const pair=items.filter(i=>i.concept_key===key);
    if(pair.length!==2||new Set(pair.map(i=>i.context_tag)).size!==2||pair[0]?.question.ko===pair[1]?.question.ko)failures.push(`paired context contract failed ${key}`);}
  return failures;
}
