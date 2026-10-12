// 강성호 2026-10-11: full-ready immutable cohort만 로컬 draft rows로 materialize한다. 공개/원격 write는 없다.
import { studyContentVersionInput, studyRefKey, type StudyRef } from "../../../shared/src/learning-experience.js";
import { esc } from "./utils.js";
import { LEARNING_PATH_VALIDATOR_VERSION } from "../ops/learning-path-quality.js";
import { resolveSelectedConcept } from "../ops/learning-path-v2-contract.js";
import { learningPathV4Readiness, type LearningPathV4ReadinessInput } from "../ops/learning-path-v4-readiness.js";

type Row = Record<string, unknown>;
export type Db = { prepare(sql:string): { all(...values:unknown[]): Row[]; get?(...values:unknown[]): Row | undefined }; exec(sql:string): void };
const value=(v:unknown)=>v==null?"NULL":typeof v==="number"?String(v):esc(String(v));
const version=(row:Row)=>createHash("sha256").update(studyContentVersionInput(row)).digest("hex");
// Keep the hash local to avoid accepting a caller supplied version.
import { createHash } from "node:crypto";
const release=(track:string, version:string)=>`learning-path-${track === "jlpt-ja" ? "jlpt" : "topik"}-${version}`;
const asset=(bundle:string)=>`${bundle}-source`;
// Operational insertion timestamps differ between planning mirrors and D1 imports.
// Preserve every semantic field and property order, but do not seal clock metadata.
const semanticSeal=(row:Row|null|undefined)=>row==null?null:Object.fromEntries(Object.entries(row).filter(([key])=>key!=="created_at"&&key!=="updated_at"));
function insert(db:Db, table:string, row:Row, key:string | string[]="id") {
  const keys=Array.isArray(key)?key:[key];
  const current=db.prepare(`SELECT * FROM ${table} WHERE ${keys.map(k=>`${k}=?`).join(" AND ")}`).all(...keys.map(k=>row[k]))[0];
  if(current && Object.entries(row).some(([k,v])=>current[k]!==v)) throw new Error(`Immutable draft collision: ${table}:${keys.map(k=>String(row[k])).join(":")}`);
  return `INSERT OR IGNORE INTO ${table} (${Object.keys(row).join(",")}) VALUES (${Object.values(row).map(value).join(",")});`;
}
function requireReady(input:LearningPathV4ReadinessInput) {
  const readiness=learningPathV4Readiness(input);
  if(!readiness.full_bank_ready) throw new Error(`v4 draft staging blocked: ${readiness.failures.join("; ")}`);
  return readiness;
}
export function buildLearningPathV4DraftPlan(db:Db, input:LearningPathV4ReadinessInput) {
  const readiness=requireReady(input), {bundle,reviews}=input, statements:string[]=[];
  // Audit approval records passed independent semantic review; releases/items/lessons stay unpublished draft.
  const reviewerA=reviews[0]!.reviewer_id, reviewerB=reviews[1]!.reviewer_id, sourceHash=bundle.source_evidence_sha256, sourceAsset=asset(bundle.bundle);
  const resolved=new Map(bundle.concepts.map(concept=>[concept.key,resolveSelectedConcept(db,concept)])); // all 220 strict-level lookups occur before statements.
  for(const track of ["jlpt-ja","topik-ko"] as const) {
    const id=release(track,bundle.version), count=bundle.items.filter(item=>item.track===track).length, contentType=track==="jlpt-ja"?"jlpt-quiz":"topik-owner";
    statements.push(insert(db,"content_releases",{id,learning_track:track,content_version:bundle.version,release_state:"draft",manifest_sha256:bundle.draft_sha256,parser_version:LEARNING_PATH_VALIDATOR_VERSION}));
    statements.push(insert(db,"content_release_quality_requirements",{release_id:id,content_type:contentType,expected_audit_count:count,validator_version:LEARNING_PATH_VALIDATOR_VERSION},"release_id"));
  }
  statements.push(insert(db,"content_source_assets",{id:sourceAsset,asset_kind:"self-authored-fixture",source_url:`https://github.com/kordokrip/JLPT/tree/main/packages/db/src/content/${bundle.bundle}`,license_id:"LicenseRef-self-authored",license_url:"https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md",attribution_text:`Frozen self-authored ${bundle.version} draft; provenance remains in immutable source evidence`,allowed_use:"self-authored personal learning; unpublished draft",source_sha256:sourceHash,selection_reason:"Immutable cohort; publication remains draft-unpublished"}));
  for(const item of bundle.items) {
    const auditId=`quality-audit:${bundle.version}:${item.id}`, contentType=item.track==="jlpt-ja"?"jlpt-quiz":"topik-owner", releaseId=release(item.track,bundle.version);
    statements.push(insert(db,"content_quality_audits",{id:auditId,learning_track:item.track,content_type:contentType,content_id:item.id,content_version:bundle.version,evidence_sha256:sourceHash,validator_version:LEARNING_PATH_VALIDATOR_VERSION,automated_status:"passed",author_review_status:"signed",adversarial_review_status:"signed",author_reviewer:reviewerA,adversarial_reviewer:reviewerB,release_state:"approved",details_json:JSON.stringify({draft_sha256:bundle.draft_sha256,source_evidence_sha256:sourceHash,publication:"release and content remain draft-unpublished; audit approved only for quality-link integrity"}),checked_at:"2026-10-11"}));
    statements.push(`INSERT OR IGNORE INTO content_release_quality_audit_links(release_id,audit_id) VALUES(${value(releaseId)},${value(auditId)});`);
    const concept=bundle.concepts.find(c=>c.key===item.concept_key)!;
    if(item.track==="jlpt-ja") statements.push(insert(db,"jlpt_practice_questions",{id:item.id,learning_track:item.track,level:item.level,mode:item.section,skill:item.section,difficulty:item.difficulty,prompt_ko:item.question.ko,prompt_ja:item.question.ja,prompt_en:item.question.en,choices_json:JSON.stringify(item.choices),answer_index:item.answer_index,explanation_ko:item.explanation.ko,explanation_ja:item.explanation.ja,explanation_en:item.explanation.en,audio_script_ja:item.audio_script??null,source_code:bundle.bundle.toUpperCase(),source_evidence_sha256:sourceHash,bank_version:bundle.version,is_published:0}));
    else { const unitId=`learning-path-unit:${bundle.version}:${item.id}`, stable=`topik-ko:owner-item:${item.id}:${bundle.version}`, answer=item.section==="writing"?{rubric_ko:item.rubric!.ko,rubric_ja:item.rubric!.ja,rubric_en:item.rubric!.en,sample_answer_ko:item.sample!.ko,sample_answer_ja:item.sample!.ja,sample_answer_en:item.sample!.en}:{choices:item.choices!.map(c=>c.ko),choices_i18n:item.choices,answer_index:item.answer_index};
      statements.push(insert(db,"topik_owner_authored_curriculum_units",{id:unitId,target_grade:Number(item.level),stable_ref:`topik-ko:owner-unit:${item.id}:${bundle.version}`,section:item.section,title_ko:concept.title.ko,title_ja:concept.title.ja,title_en:concept.title.en,source_asset_id:sourceAsset}));
      statements.push(insert(db,"topik_owner_authored_curriculum_items",{id:item.id,unit_id:unitId,target_grade:Number(item.level),stable_ref:stable,item_type:item.section,prompt_ko:item.question.ko,prompt_ja:item.question.ja,prompt_en:item.question.en,answer_json:JSON.stringify(answer),explanation_ko:item.explanation.ko,explanation_ja:item.explanation.ja,explanation_en:item.explanation.en,source_asset_id:sourceAsset,audio_required:item.section==="listening"?1:0,audio_text_ko:item.audio_script??null}));
      if(item.section==="listening") { statements.push(insert(db,"learning_content_stable_refs",{stable_ref:stable,learning_track:item.track,item_type:"topik-owner-item",item_id:item.id,level_tag:`grade-${item.level}`,source_asset_id:sourceAsset},"stable_ref")); statements.push(insert(db,"content_speech_bindings",{id:`speech-binding:${stable}`,stable_ref:stable,item_type:"topik-owner-item",item_id:item.id,language:"ko",speech_role:"listening",provider:"google-browser",binding_state:"ready",text_source:"audio-script",unavailable_reason:null})); }
    }
  }
  return {statements,counts:{releases:2,source_assets:1,audits:440,quality_links:440,jlpt_items:200,topik_units:240,topik_items:240,listening_speech_bindings:48},readiness,resolved};
}
export function buildLearningPathV4LessonPlan(db:Db, input:LearningPathV4ReadinessInput) {
  const readiness=requireReady(input), {bundle,reviews}=input, statements:string[]=[];
  // 강성호 2026-10-12: 실제 question snapshot이 동결본과 같은지 먼저 검사하고 새 링크에만 원본 seal을 저장한다. 기존 감사 원장은 수정하지 않는다.
  buildLearningPathV4DraftPlan(db,input);
  for(const lesson of bundle.lessons) { const row={id:lesson.id,version:bundle.version,learning_track:lesson.track,level:lesson.level,ordinal:lesson.ordinal,title_ko:lesson.concept_keys.map(k=>bundle.concepts.find(c=>c.key===k)!.title.ko).join(" · "),title_ja:lesson.concept_keys.map(k=>bundle.concepts.find(c=>c.key===k)!.title.ja).join("・"),title_en:lesson.concept_keys.map(k=>bundle.concepts.find(c=>c.key===k)!.title.en).join(" / "),release_id:release(lesson.track,bundle.version),is_published:0}; statements.push(insert(db,"learning_lessons",row,["id","version"]));
    lesson.concept_keys.forEach((key,index)=>{ const concept=bundle.concepts.find(c=>c.key===key)!, item=bundle.items.find(q=>q.id===lesson.question_ids[index])!, conceptRef=resolveSelectedConcept(db,concept), qtable=lesson.track==="jlpt-ja"?"jlpt_practice_questions":"topik_owner_authored_curriculum_items", questionRow=db.prepare(`SELECT * FROM ${qtable} WHERE id=?`).all(item.id)[0]; if(!questionRow) throw new Error(`Question not seeded: ${item.id}`); const questionRef:StudyRef={track:lesson.track,type:lesson.track==="jlpt-ja"?"jlpt-practice":"topik-owner-item",id:item.id,version:lesson.track==="jlpt-ja"?bundle.version:version(questionRow)};
      const entries:Row[]=[];
      for(const [ordinal,phase,ref,cue] of [[index,"learn",conceptRef,concept.cue],[index+2,"practice",questionRef,{ko:"",ja:"",en:""}]] as const) {
        const entry={lesson_id:lesson.id,lesson_version:bundle.version,ordinal,phase,content_ref:studyRefKey(ref),cue_ko:cue.ko,cue_ja:cue.ja,cue_en:cue.en};
        entries.push(entry); statements.push(insert(db,"learning_lesson_entries",entry,["lesson_id","lesson_version","ordinal"]));
      }
      const unit=lesson.track==="topik-ko"?db.prepare("SELECT * FROM topik_owner_authored_curriculum_units WHERE id=?").all(questionRow.unit_id)[0]:null;
      const speech=item.section==="listening"&&lesson.track==="topik-ko"?db.prepare("SELECT * FROM content_speech_bindings WHERE item_id=?").all(item.id)[0]:null;
      if(lesson.track==="topik-ko"&&!unit || item.section==="listening"&&lesson.track==="topik-ko"&&!speech)throw new Error(`Missing frozen unit/speech: ${item.id}`);
      statements.push(insert(db,"content_learning_links",{learning_track:lesson.track,question_ref:studyRefKey(questionRef),concept_ref:studyRefKey(conceptRef),evidence_sha256:bundle.source_evidence_sha256,reviewer_a:reviews[0]!.reviewer_id,reviewer_b:reviews[1]!.reviewer_id,status:"approved",created_at:0,
        expected_question_json:JSON.stringify({row:semanticSeal(questionRow),unit:semanticSeal(unit),speech:semanticSeal(speech)}),expected_lesson_json:JSON.stringify(row),expected_entries_json:JSON.stringify(entries)},["learning_track","question_ref","concept_ref"]));
    });
  }
  return {statements,counts:{lessons:220,entries:880,links:440},readiness};
}
export function applyLearningPathV4DraftStage(db:Db,input:LearningPathV4ReadinessInput) { requireReady(input); db.exec("PRAGMA foreign_keys=ON; BEGIN IMMEDIATE"); try { const draft=buildLearningPathV4DraftPlan(db,input); db.exec(draft.statements.join("\n")); const lessons=buildLearningPathV4LessonPlan(db,input); db.exec(lessons.statements.join("\n")); if(db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("draft staging foreign-key check failed"); db.exec("COMMIT"); return {...draft,...lessons,counts:{...draft.counts,...lessons.counts}}; } catch(error) { db.exec("ROLLBACK"); throw error; } }
