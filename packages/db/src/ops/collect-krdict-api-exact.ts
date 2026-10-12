// 강성호 2026-10-11: 비밀키는 로컬에서만 읽고 공식 API의 정확 표제어/동형어 사실을 불변 증적으로 남긴다.
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { sha256 } from "./learning-path-v2-contract.js";
import { writeImmutableIntake, createIntakeCheckpoint } from "./source-intake-checkpoint.js";
import { REPO_ROOT } from "../seed/constants.js";
import type { SourceRecord } from "./learning-path-full-contract.js";
const option = (name: string) => process.argv.find(v => v.startsWith(`--${name}=`))?.slice(name.length + 3);
if (process.argv.slice(2).some(v => !/^--(output|records-dir)=.+$/.test(v))) throw new Error("Only output and records-dir arguments are supported; credentials belong in local environment");
const output = option("output"), recordsDir = option("records-dir");
if (!output || !recordsDir) throw new Error("Explicit new --output and --records-dir required");
const key = process.env.krdict_API_KEY ?? parseEnv(readFileSync(`${REPO_ROOT}/.env.local`, "utf8")).krdict_API_KEY;
if (!key) throw new Error("Local KRdict API credential unavailable; never pass credentials in CLI arguments");
const checkpoint = createIntakeCheckpoint(recordsDir);
const records: SourceRecord[] = [];
const targets = [{word:"봉지"}, {word:"변경",origin:"變更"}, {word:"민원실",origin:"民願室"}, {word:"분리",origin:"分離"}, {word:"배출",origin:"排出"}];
const decode = (s: string) => s.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'").trim();
for (const target of targets) {
  const endpoint = new URL("https://krdict.korean.go.kr/api/search");
  endpoint.searchParams.set("key", key); endpoint.searchParams.set("q", target.word); endpoint.searchParams.set("req_type", "xml"); endpoint.searchParams.set("method", "exact");
  let response: Response;
  try { response = await fetch(endpoint, {signal: AbortSignal.timeout(10000)}); }
  catch { throw new Error(`Official API transport failed for ${target.word}; credential URL suppressed`); }
  if (!response.ok) throw new Error(`Official API HTTP ${response.status} for ${target.word}`);
  const bytes = Buffer.from(await response.arrayBuffer()), xml = bytes.toString("utf8");
  if (/<error>/.test(xml)) throw new Error(`Official API rejected ${target.word}; response intentionally not logged`);
  const entries = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const pick = (tag: string) => decode(m[1]!.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] ?? "");
    return {word:pick("word"),origin:pick("origin"),pos:pick("pos"),id:pick("target_code"),definition:pick("definition"),senseOrder:pick("sense_order"),link:pick("link")};
  }).filter(e => e.word === target.word && (!target.origin || e.origin === target.origin));
  if (entries.length !== 1) throw new Error(`Exact API headword/origin entry must resolve uniquely: ${target.word}`);
  const e = entries[0]!, url = new URL(e.link);
  if (url.hostname !== "krdict.korean.go.kr" || url.protocol !== "https:" || url.searchParams.get("ParaWordNo") !== e.id || !/^\d+$/.test(e.id) || !/^[1-9]\d*$/.test(e.senseOrder) || !e.pos || !e.definition) throw new Error(`Incomplete exact API entry: ${target.word}`);
  const locator = `KRdict API exact headword ${e.word}; entry ${e.id}; origin ${e.origin || "native"}; sense ${e.senseOrder} (first returned; not unique-sense approval)`;
  const record: SourceRecord = {
    source: {id:`krdict-api-${e.id}`,url:e.link,license:{id:"CC-BY-SA-2.0-KR",url:"https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo"},attribution:"National Institute of Korean Language / Korean Basic Dictionary; compact language facts only",allowed_use:"language-facts-and-metadata-only",retrieved_at:new Date().toISOString(),sha256:sha256(bytes)},
    facts:[{id:`${e.id}-form`,kind:"lexical-form",language:"ko",value:e.word,source_locator:locator},{id:`${e.id}-pos`,kind:"grammar-constraint",language:"ko",value:e.pos,source_locator:locator},{id:`${e.id}-sense`,kind:"sense-label",language:"ko",value:e.definition,source_locator:locator}],
  };
  Object.assign(record.source,{hash_basis:"raw-http-response-sha256",retrieval_transport:"official-krdict-api",api_request:{endpoint:"https://krdict.korean.go.kr/api/search",q:target.word,method:"exact",req_type:"xml"},exact_entry_id:e.id,expected_origin:target.origin ?? "",sense_order:e.senseOrder,definition_scope:"first-returned-sense"});
  if (JSON.stringify(record).includes(key)) throw new Error("Credential retention prevented");
  checkpoint(record); records.push(record);
  console.log(JSON.stringify({verified_headword:target.word,entry:e.id,response_sha256:record.source.sha256,credentials_retained:false}));
}
writeImmutableIntake(output,{scope:"krdict-exact-missing-five-headwords-only",records});
