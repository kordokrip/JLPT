// 강성호 2026-10-11: 불합격 v2와 리뷰 원장을 보존하고, 조사·문형 학습 안내를 고친 별도 v3만 생성한다.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
const sha = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const parent = new URL("../content/learning-path-v2-2026-10-11/", import.meta.url);
const target = new URL("../content/learning-path-v3-2026-10-11/", import.meta.url);
const names = ["concepts.json", "prototype-intake.json", "representatives.json"];
if (names.some(name => existsSync(new URL(name, target)))) throw new Error("v3 exists; preserve frozen evidence and create a new version");
const before = names.map(name => readFileSync(new URL(name, parent)));
const prior = JSON.parse(before[2]!.toString());
if (prior.draft_sha256 !== "abe999efbc9ded98a5f37cd4772cfca3c52af4b30662e1f550f067a539ea1dbd") throw new Error("Unexpected parent draft");
for (const reviewer of ["a", "b"]) {
  const review = JSON.parse(readFileSync(new URL(`../content/reviews/learning-path-v2-representatives-reviewer-${reviewer}-2026-10-11.json`, import.meta.url), "utf8"));
  if (review.draft_sha256 !== prior.draft_sha256 || review.passed !== false) throw new Error("Expected preserved independent rejected v2 review");
}
const inventory = JSON.parse(before[0]!.toString());
inventory.version = "learning-path-v3-2026-10-11";
inventory.supersedes_inventory_sha256 = sha(before[0]!);
for (const concept of inventory.concepts) {
  concept.key = concept.key.replace(/^lp2-/, "lp3-");
  if (concept.track === "jlpt-ja") concept.cue.ko = `학습 목표: ${concept.title.ko}. 두 가지 다른 상황에서 구별하고 회상합니다.`;
}
const confirmation = inventory.concepts.find((c: {key: string}) => c.key === "lp3-jlpt-n3-vocab-1");
confirmation.cue = {
  ko: "確認(かくにん): 내용이나 상태가 맞는지 다시 살펴보는 확인입니다. 문서를 받는 행위나 정보를 바꾸는 행위와 구별합니다.",
  ja: "確認（かくにん）は、内容や状態が正しいか改めて調べることです。書類を受け取ることや情報を変更することとは区別します。",
  en: "確認 (かくにん) means checking that information or a state is correct. Distinguish checking from receiving a document or changing information.",
};
const habit = inventory.concepts.find((c: {key: string}) => c.key === "lp3-jlpt-n3-grammar-4");
habit.cue = {
  ko: "동사 기본형/ない형 + ようにする: 어떤 행동을 하거나 하지 않으려고 의식적으로 노력합니다. ようにしています는 평소 그 노력을 계속하고 있음을 나타냅니다. 단순한 과거 계획이나 불가능과 구별합니다.",
  ja: "動詞の辞書形／ない形＋ようにする：ある行動をする、またはしないよう意識して努めます。ようにしていますは、その努力を普段から続けていることを表します。単なる過去の予定や不可能とは区別します。",
  en: "Verb dictionary form / negative ない form + ようにする expresses a deliberate effort to do or avoid an action. ようにしています expresses maintaining that effort in daily life, rather than a past plan or inability.",
};
const intake = JSON.parse(before[1]!.toString());
intake.schema_version = "learning-path-prototype-intake-v3";
intake.supersedes_prototype_intake_sha256 = sha(before[1]!);
intake.revision_note = "Own pedagogical cue correction only. Original source retrieval times and raw source hashes are preserved. This is not a fresh dictionary download or a 440-item intake.";
const revised = JSON.parse(JSON.stringify(prior).replaceAll("lp2-", "lp3-"));
delete revised.draft_sha256;
delete revised.source_evidence_sha256;
delete revised.concept_inventory_sha256;
revised.version = inventory.version;
revised.supersedes_draft_sha256 = prior.draft_sha256;
revised.concepts = revised.concepts.map((c: {key: string}) => inventory.concepts.find((entry: {key: string}) => entry.key === c.key));
mkdirSync(target, { recursive: true });
writeFileSync(new URL(names[0]!, target), JSON.stringify(inventory, null, 2) + "\n");
writeFileSync(new URL(names[1]!, target), JSON.stringify(intake, null, 2) + "\n");
const bundle = {...revised, draft_sha256: sha(JSON.stringify(revised)), source_evidence_sha256: sha(readFileSync(new URL(names[1]!, target))), concept_inventory_sha256: sha(readFileSync(new URL(names[0]!, target)))};
writeFileSync(new URL(names[2]!, target), JSON.stringify(bundle, null, 2) + "\n");
if (names.some((name, index) => sha(readFileSync(new URL(name, parent))) !== sha(before[index]!))) throw new Error("Parent evidence was mutated");
console.log(JSON.stringify({scope:bundle.scope, items:bundle.items.length, concepts:inventory.concepts.length, draft_sha256:bundle.draft_sha256, source_evidence_sha256:bundle.source_evidence_sha256, concept_inventory_sha256:bundle.concept_inventory_sha256, parent_preserved:true, publication:"draft-unpublished"}));
