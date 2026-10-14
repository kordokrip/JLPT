// 강성호 2026-10-11: 운영 공개 조회를 재현 가능한 새 버전 개념 명세로 옮긴다. 실패 v1 파일은 읽거나 수정하지 않는다.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { studyContentVersionInput } from "../../../shared/src/learning-experience.js";
const snapshot = new URL("../../../../.artifacts/learning-path-v2-2026-10-11/public-concept-baseline.json", import.meta.url);
const bytes = readFileSync(snapshot);
const baseline = JSON.parse(bytes.toString()) as { captured_at: string; content_source_sha: string; concepts: Array<{
  key: string; track: "jlpt-ja" | "topik-ko"; level: string; section: string; lookup: { type: string; value: string }; candidates: Record<string, unknown>[];
}> };
const sha = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
const output = new URL("../content/learning-path-v2-2026-10-11/concepts.json", import.meta.url);
if (existsSync(output)) throw new Error("Concept version already exists; do not overwrite a frozen version");
const meanings: Record<string, [string, string, string]> = {
  学校:["학교","学校","school"],先生:["선생님","先生","teacher"],電車:["전철","電車","train"],友達:["친구","友達","friend"],朝ご飯:["아침 식사","朝ご飯","breakfast"],
  予定:["예정","予定","schedule"],連絡:["연락","連絡","contact"],準備する:["준비하다","準備する","prepare"],必要:["필요","必要","necessary"],約束:["약속","約束","appointment"],
  確認:["확인","確認","confirmation"],変更:["변경","変更","change"],影響:["영향","影響","influence"],相談:["상담","相談","consultation"],状況:["상황","状況","situation"],
  方針:["방침","方針","policy"],手順:["절차","手順","procedure"],判断:["판단","判断","judgment"],効率:["효율","効率","efficiency"],課題:["과제","課題","issue"],
  論拠:["논거","論拠","grounds"],脈絡:["맥락","脈絡","context"],妥当:["타당함","妥当","appropriate"],乖離:["괴리","乖離","divergence"],是正:["시정","是正","correction"],
  日:["날·해","日","day or sun"],月:["달·월","月","moon or month"],人:["사람","人","person"],山:["산","山","mountain"],川:["강","川","river"],
  春:["봄","春","spring"],夏:["여름","夏","summer"],秋:["가을","秋","autumn"],冬:["겨울","冬","winter"],院:["의료·기관의 院","院","institution"],
  確:["확실함","確","certainty"],認:["인정·인식","認","recognition"],議:["논의","議","discussion"],報:["알림·보고","報","reporting"],連:["연결","連","connection"],
  基:["기초","基","foundation"],準:["기준","準","standard"],測:["측정","測","measurement"],査:["조사","査","investigation"],構:["구성","構","structure"],
  顕:["뚜렷함","顕","prominence"],遂:["완수","遂","accomplishment"],衡:["균형","衡","balance"],遵:["준수","遵","compliance"],慮:["배려·고려","慮","consideration"],
};
const grammarMeanings: Record<string,[string,string,string]> = {
  "~は ~です":["화제와 정중한 서술","話題と丁寧な述語","topic and polite statement"],"~を":["동작의 대상","動作の対象","object of an action"],"시간 + に":["정확한 시각","決まった時刻","a specific time"],"장소 + で":["행동이 일어나는 장소","動作が行われる場所","location of an action"],"ません":["정중한 부정","丁寧な否定","polite negative"],
  "~ながら":["두 동작의 동시 진행","二つの動作の同時進行","two simultaneous actions"],"~てしまう":["완료 또는 유감","完了または残念な結果","completion or regret"],"~なければならない / ~なければいけない":["의무","義務","obligation"],"~ようになる":["능력·습관의 변화","能力や習慣の変化","change in ability or habit"],"~かもしれない":["불확실한 가능성","不確かな可能性","uncertain possibility"],
  "~わけではない":["부분 부정","部分否定","partial negation"],"~ことになっている":["규칙·정해진 약속","規則や決まった約束","rules or arrangements"],"~おかげで":["좋은 결과의 원인","良い結果の原因","cause of a positive result"],"~ようにする":["의식적인 노력·습관","意識的な努力や習慣","deliberate effort or habit"],"~に対して":["대상 또는 대비","対象または対比","target or contrast"],
  "わけではない":["단정의 부분 부정","断定の部分否定","qualified negation"],"ことになっている":["정해진 규정","決まった規定","established rules"],"に伴って":["함께 일어나는 변화","一緒に起こる変化","accompanying change"],"かねない":["우려되는 가능성","好ましくない可能性","an undesirable possibility"],"つつある":["진행 중인 변화","進行中の変化","ongoing change"],
  "いかんだ":["조건에 달린 결과","条件に左右される結果","an outcome depending on a condition"],"を余儀なくされる":["불가피한 선택","やむを得ない選択","a forced choice"],"ならでは":["고유한 특성","固有の特徴","a distinctive characteristic"],"ないまでも":["강한 기준까지는 아니어도","強い基準までは達しなくても","if not to the stronger extent"],"を皮切りに":["연속 활동의 출발점","連続する活動の出発点","the first of a series"],
};
const concepts = baseline.concepts.map(c => {
  // Duplicate greeting has two source registers. Explicitly choose public conversation id2, not an arbitrary fallback.
  const selected = c.candidates.length === 1 ? c.candidates[0]! : c.key === "lp2-jlpt-n5-listening-1" ? c.candidates.find(r=>r.id===2) : undefined;
  if (!selected) throw new Error(`Ambiguous canonical concept: ${c.key}`);
  const row = { ...selected }; delete row.title_ko; delete row.title_ja; delete row.title_en;
  const title = c.track === "topik-ko" ? { ko:String(selected.title_ko),ja:String(selected.title_ja),en:String(selected.title_en) }
    : c.lookup.type === "sentence" ? {ko:String(row.ko),ja:String(row.ja),en:"Listening: infer the speaker's situation"}
    : (()=>{ const labels = (c.lookup.type === "grammar" ? grammarMeanings : meanings)[c.lookup.value]; if(!labels)throw new Error(`Missing authored labels ${c.key}`);return {ko:labels[0],ja:labels[1],en:labels[2]};})();
  const cue = c.track === "topik-ko" ? {ko:String(row.explanation_ko),ja:String(row.explanation_ja),en:String(row.explanation_en)}
    : {ko:`${title.ko}를 두 가지 다른 상황에서 구별하고 회상합니다.`,ja:`${title.ja}を異なる二つの場面で区別し、思い出します。`,en:`Recall ${title.en} and distinguish its use in two different situations.`};
  return { key:c.key,track:c.track,level:c.level,section:c.section,lookup:c.lookup,title,cue,
    canonical_ref:{track:c.track,type:c.lookup.type,id:String(row.id),version:sha(studyContentVersionInput(row))},
    authoring_context:row };
});
const manifest = {schema_version:"learning-path-concepts-v2",version:"learning-path-v2-2026-10-11",baseline_sha256:sha(bytes),
  baseline_environment:"production-read-only",captured_at:baseline.captured_at,content_source_sha:baseline.content_source_sha,concepts};
mkdirSync(new URL(".",output),{recursive:true}); writeFileSync(output,JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify({concepts:concepts.length,baseline_sha256:sha(bytes),output:"learning-path-v2-2026-10-11/concepts.json"}));
