// 강성호 2026-10-11: 외부 예문·음원은 남기지 않고 사전 표기/읽기/뜻과 취득 증적만 저장한다.
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { existsSync, readFileSync } from "node:fs";
import { CONCEPTS as DEFAULT_CONCEPTS } from "../content/learning-path-2026-10-11/concept-specs.js";
import { dictionaryJapaneseLemma, dictionaryKoreanLemma, parseJmdictFacts, parseKrdictFacts } from "./learning-source-parsers.js";
import type { LanguageFact as Fact } from "./learning-source-parsers.js";
import { createIntakeCheckpoint, writeImmutableIntake } from "./source-intake-checkpoint.js";
const option = (name: string) => process.argv.find(v=>v.startsWith(`--${name}=`))?.slice(name.length+3);
const provider = option("provider") ?? "all";
if (!["all","edrdg","krdict","sejong"].includes(provider)) throw new Error("Unknown source provider; use all|edrdg|krdict|sejong");
const conceptInput = option("concepts");
const CONCEPTS: typeof DEFAULT_CONCEPTS = conceptInput ? JSON.parse(readFileSync(conceptInput,"utf8")).concepts : DEFAULT_CONCEPTS;
const outputPath = option("output") ?? new URL("../content/learning-path-source-intake-2026-10-11-v2.json",import.meta.url);
if (existsSync(outputPath)) throw new Error("Intake output already exists; frozen evidence must not be overwritten");
const checkpointDirectory = option("records-dir");
const checkpoint = checkpointDirectory ? createIntakeCheckpoint(checkpointDirectory) : undefined;
const sha = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
const retrieved = new Date().toISOString();
async function get(url: string) {
  for(let attempt=1;attempt<=2;attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      return { bytes, text: new TextDecoder().decode(bytes), hash: sha(bytes) };
    } catch(error) {
      console.error(`Source retrieval attempt ${attempt}/2 failed: ${url}: ${String(error)}`);
      if(attempt===2) throw new Error(`Source retrieval failed after two attempts: ${url}`);
    }
  }
  throw new Error("Unreachable source retrieval");
}
const records: unknown[] = [];
const edrdgLicense = {
  id: "CC-BY-SA-4.0",
  url: "https://www.edrdg.org/edrdg/licence.html",
};
const krLicense = {
  id: "CC-BY-SA-2.0-KR",
  url: "https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo",
};
// Optional reuse preserves the original source response hash/time; the curator still rechecks current terms separately.
const reusedPolicyPath = option("reuse-policy");
const reusedPolicyInput = reusedPolicyPath ? readFileSync(reusedPolicyPath) : undefined;
const reusedPolicy = reusedPolicyInput ? (JSON.parse(reusedPolicyInput.toString()) as {records:Array<{source:{id:string;url:string;license:{id:string;url:string};retrieved_at:string;sha256:string};facts:unknown[]}>}).records.find(r=>r.source.id === "krdict-terms") : undefined;
if (reusedPolicyPath && (provider !== "krdict" || !reusedPolicy || reusedPolicy.source.url !== krLicense.url || reusedPolicy.source.license.id !== krLicense.id || reusedPolicy.source.license.url !== krLicense.url || !/^[a-f0-9]{64}$/.test(reusedPolicy.source.sha256) || !Number.isFinite(Date.parse(reusedPolicy.source.retrieved_at)))) throw new Error("Invalid explicit reused KRdict policy evidence");
function record(
  id: string,
  url: string,
  hash: string,
  license: typeof edrdgLicense,
  attribution: string,
  facts: Fact[],
) {
  if (!facts.length) throw new Error(`No verified facts: ${id}`);
  const success = {
    source: {
      id,
      url,
      license,
      attribution,
      allowed_use: "language-facts-and-metadata-only",
      retrieved_at: new Date().toISOString(),
      sha256: hash,
    },
    facts,
  };
  checkpoint?.(success);
  records.push(success);
  if (records.length%10===0) console.log(JSON.stringify({intake_progress_records:records.length,last_source_id:id}));
}
for (const [id, url, license, label] of [
  [
    "edrdg-terms",
    edrdgLicense.url,
    edrdgLicense,
    "EDRDG / JMdict and KANJIDIC2",
  ],
  [
    "krdict-terms",
    krLicense.url,
    krLicense,
    "National Institute of Korean Language / Korean Basic Dictionary",
  ],
] as const) {
  if (provider !== "all" && (id === "edrdg-terms" ? provider !== "edrdg" : provider !== "krdict")) continue;
  if (id === "krdict-terms" && reusedPolicy) {
    checkpoint?.(reusedPolicy); records.push(reusedPolicy);
    console.log(JSON.stringify({reused_policy_record:id,original_retrieved_at:reusedPolicy.source.retrieved_at,input_sha256:sha(reusedPolicyInput!),new_policy_http_download:false}));
    continue;
  }
  const source = await get(url);
  record(id, url, source.hash, license, label, [
    {
      id: `${id}-license`,
      kind: "exam-structure",
      language: "en",
      value: `License metadata for general dictionary text: ${license.id}. Individual media excluded; grade labels are not examination levels.`,
      source_locator: "copyright policy",
    },
  ]);
}
const words = [
  ...new Set(
    CONCEPTS.filter(
      (c) => c.track === "jlpt-ja" && c.lookup.type === "vocab",
    ).map((c) => c.lookup.value),
  ),
];
for (const learningForm of provider === "all" || provider === "edrdg" ? words : []) {
  // 準備する is an authored canonical inflection, while JMdict stores the suru noun 準備.
  const word = dictionaryJapaneseLemma(learningForm);
  const url = `https://www.edrdg.org/cgi-bin/wwwjdic/wwwjdic?1ZUE${encodeURIComponent(word)}`;
  const source = await get(url);
  const facts = parseJmdictFacts(source.text, learningForm);
  record(
    `jmdict-${encodeURIComponent(word)}`,
    url,
    source.hash,
    edrdgLicense,
    "EDRDG JMdict via WWWJDIC (James Breen et al.)",
    facts,
  );
}
if (provider === "all" || provider === "edrdg") {
const kanjiUrl = "https://www.edrdg.org/kanjidic/kanjidic2.xml.gz";
const kanjiSource = await get(kanjiUrl),
  xml = gunzipSync(kanjiSource.bytes).toString("utf8");
const kanjiFacts: Fact[] = [];
for (const char of [
  ...new Set(
    CONCEPTS.filter((c) => c.lookup.type === "kanji").map(
      (c) => c.lookup.value,
    ),
  ),
]) {
  const character = xml.match(
    new RegExp(
      `<character>\\s*<literal>${char}</literal>[\\s\\S]*?</character>`,
    ),
  )?.[0];
  if (!character) throw new Error(`KANJIDIC2 character missing: ${char}`);
  kanjiFacts.push({
    id: `${char}-form`,
    kind: "lexical-form",
    language: "ja",
    value: char,
    source_locator: `KANJIDIC2 literal ${char}`,
  });
  for (const match of character.matchAll(
    /<reading r_type="ja_(on|kun)">([^<]+)<\/reading>/g,
  ))
    kanjiFacts.push({
      id: `${char}-${match[1]}-${kanjiFacts.length}`,
      kind: "reading",
      language: "ja",
      value: match[2]!,
      source_locator: `KANJIDIC2 literal ${char}`,
    });
}
record(
  "kanjidic2-selected-characters",
  kanjiUrl,
  kanjiSource.hash,
  edrdgLicense,
  "EDRDG KANJIDIC2 (Jim Breen et al.)",
  kanjiFacts,
);
}
const topikLexemes = conceptInput ? (JSON.parse(readFileSync(conceptInput,"utf8")).concepts as Array<{track:string;section:string;authoring_context?:{answer_json?:string}}>)
  .filter(c=>c.track==="topik-ko"&&c.section==="vocab")
  .map(c=>{ const answer=JSON.parse(c.authoring_context?.answer_json??"{}");return answer.choices?.[answer.answer_index] as string|undefined; })
  .filter((word):word is string=>Boolean(word&&/^[가-힣]{1,10}$/.test(word))) : [];
const requestedKoreanWords = option("korean-words")?.split(",").filter(Boolean);
const koreanWords = [...new Set(requestedKoreanWords ?? [
  "가족",
  "학교",
  "시장",
  "약속",
  "날씨",
  "취미",
  "교통",
  "예약",
  "신청",
  "문의",
  "건강",
  "습관",
  "직장",
  "환경",
  "문화",
  "정책",
  "의견",
  "근거",
  "비교",
  "평가",
  "사회",
  "연구",
  "해석",
  "자료",
  "접근성",
  ...topikLexemes,
])];
for (const learningWord of provider === "all" || provider === "krdict" ? koreanWords : []) {
  const word = dictionaryKoreanLemma(learningWord);
  const url = `https://krdict.korean.go.kr/jpn/dicMarinerSearch/search?mainSearchWord=${encodeURIComponent(word)}&nation=jpn`;
  const source = await get(url);
  record(
    `krdict-${encodeURIComponent(word)}`,
    url,
    source.hash,
    krLicense,
    "국립국어원 한국어기초사전 / 韓国語-日本語学習辞典",
    parseKrdictFacts(source.text, learningWord),
  );
}
if (provider === "all" || provider === "sejong") {
const sejongUrl = "https://www.iksi.or.kr/lms/main/curriculum.do";
const sejong = await get(sejongUrl);
if (
  !/초급|Beginner/.test(sejong.text) ||
  !/중급|Intermediate/.test(sejong.text)
)
  throw new Error(
    "Sejong curriculum structure changed; manual review required",
  );
record(
  "sejong-curriculum-metadata",
  sejongUrl,
  sejong.hash,
  { id: "metadata-reference-only", url: sejongUrl },
  "Online King Sejong Institute curriculum overview",
  [
    {
      id: "sejong-structure",
      kind: "exam-structure",
      language: "en",
      value:
        "The curriculum separates introductory, beginner and intermediate learning paths. This metadata is not a TOPIK grade equivalence or permission to reproduce lessons.",
      source_locator: "curriculum headings",
    },
  ],
);
}
const output = {
  schema_version: "learning-path-facts-v1",
  retrieved_at: retrieved,
  collection_scope: provider === "all" ? "all-requested-source-facts" : "provider-only; not full-bank intake",
  provider,
  ...(reusedPolicyInput ? {reused_policy_input_sha256:sha(reusedPolicyInput),reused_policy_original_time_preserved:true} : {}),
  records,
};
writeImmutableIntake(outputPath, output);
console.log(
  JSON.stringify({
    records: records.length,
    facts: records.reduce<number>(
      (n, r) => n + (r as { facts: Fact[] }).facts.length,
      0,
    ),
    intake_sha256: sha(JSON.stringify(output)),
    raw_artifact_sha256: sha(readFileSync(outputPath)),
    provider,
  }),
);
