// 강성호 2026-10-11: 원문 HTTP hash를 얻지 못한 웹 조회는 구조화된 검증 사실의 hash로 명확히 구분한다.
import { sha256 } from "./learning-path-v2-contract.js";
import type { SourceRecord } from "./learning-path-full-contract.js";

export type DictionaryWebEvidence = SourceRecord & {
  source: SourceRecord["source"] & { retrieval_transport: "web.run"; hash_basis: "verified-fact-projection-v1"; verification_reference: string };
};
export type VerifiedDictionaryProjection = {
  url: string; headword: string; part_of_speech: string; sense: string;
  retrieved_at: string; verification_reference: string;
};
export function dictionaryWebEvidence(projection: VerifiedDictionaryProjection): DictionaryWebEvidence {
  const url = new URL(projection.url);
  const entryID = url.searchParams.get("ParaWordNo");
  if (url.protocol !== "https:" || url.hostname !== "krdict.korean.go.kr" || !/^\d+$/.test(entryID ?? "") || !/SearchView|searchResultView/.test(url.pathname)) throw new Error("Exact official dictionary entry URL required");
  if (!projection.headword.trim() || !projection.part_of_speech.trim() || !projection.sense.trim() || !projection.verification_reference.trim() || !Number.isFinite(Date.parse(projection.retrieved_at))) throw new Error("Verified entry metadata incomplete");
  const locator = `KRdict exact headword ${projection.headword}; entry ${entryID}`;
  const facts = [
    { id: `${entryID}-form`, kind: "lexical-form", language: "ko", value: projection.headword, source_locator: locator },
    { id: `${entryID}-pos`, kind: "grammar-constraint", language: "ko", value: projection.part_of_speech, source_locator: locator },
    { id: `${entryID}-sense`, kind: "sense-label", language: "en", value: projection.sense, source_locator: locator },
  ];
  const hash = sha256(JSON.stringify({ url: projection.url, facts }));
  return { source: { id: `krdict-web-${entryID}`, url: projection.url,
    license: { id: "CC-BY-SA-2.0-KR", url: "https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo" },
    attribution: "National Institute of Korean Language / Korean Basic Dictionary; compact verified language facts only",
    allowed_use: "language-facts-and-metadata-only", retrieved_at: projection.retrieved_at, sha256: hash,
    retrieval_transport: "web.run", hash_basis: "verified-fact-projection-v1", verification_reference: projection.verification_reference }, facts };
}
export function dictionaryWebEvidenceFailures(record: SourceRecord): string[] {
  const source = record.source as DictionaryWebEvidence["source"];
  const api = record.source as SourceRecord["source"] & {hash_basis?:string;retrieval_transport?:string;exact_entry_id?:string;api_request?:{endpoint?:string;q?:string;method?:string;req_type?:string};expected_origin?:string;sense_order?:string;definition_scope?:string};
  const markedAPI = source.id.startsWith("krdict-api-") || api.api_request !== undefined || api.exact_entry_id !== undefined || api.expected_origin !== undefined || api.retrieval_transport === "official-krdict-api" || api.hash_basis === "raw-http-response-sha256";
  if (markedAPI) {
    const url = new URL(api.url);
    if (url.protocol !== "https:" || url.hostname !== "krdict.korean.go.kr" || !/^\d+$/.test(api.exact_entry_id ?? "") || !/^[a-f0-9]{64}$/.test(api.sha256) || api.hash_basis !== "raw-http-response-sha256" || api.retrieval_transport !== "official-krdict-api" || typeof api.expected_origin !== "string" || !/^[1-9]\d*$/.test(api.sense_order ?? "") || api.definition_scope !== "first-returned-sense" || !record.facts.every(f => f.source_locator.includes(`sense ${api.sense_order}`) && (!api.expected_origin || f.source_locator.includes(`origin ${api.expected_origin}`))) || api.api_request?.endpoint !== "https://krdict.korean.go.kr/api/search" || api.api_request.method !== "exact" || api.api_request.req_type !== "xml" || api.exact_entry_id !== url.searchParams.get("ParaWordNo") || api.id !== `krdict-api-${api.exact_entry_id}` || !record.facts.some(f => f.kind === "lexical-form" && f.value === api.api_request?.q) || /[?&]key=|"key"\s*:/i.test(JSON.stringify(record))) return ["unsupported dictionary API evidence provenance"];
    return []; // Actual response bytes are hashed at acquisition; only facts, not the raw response, are retained.
  }
  const markedWeb = source.id.startsWith("krdict-web-") || source.retrieval_transport !== undefined || source.verification_reference !== undefined;
  if (!source.hash_basis && !markedWeb) return []; // Historical native HTTP acquisition hashes retain their original interpretation.
  if (source.hash_basis !== "verified-fact-projection-v1" || source.retrieval_transport !== "web.run" || !source.verification_reference) return ["unsupported dictionary web evidence provenance"];
  return source.sha256 === sha256(JSON.stringify({ url: source.url, facts: record.facts })) ? [] : ["dictionary fact projection hash mismatch"];
}
