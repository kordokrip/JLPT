// 강성호 2026-10-11: 버전 문자열만 바꿔 실패 v4를 새 v5로 재포장하는 경로를 차단한다.
export function revisionContractFailures(bank:{version:string;bundle:string;items:readonly{id:string}[];lessons:readonly{id:string}[]},source:unknown) {
  const failures:string[]=[], prefix=bank.version==="lp4-2026-10-11"?"lp4":bank.version==="lp5-2026-10-11"?"lp5":bank.version==="lp6-2026-10-11"?"lp6":bank.version==="lp7-2026-10-11"?"lp7":undefined;
  if(!prefix||bank.bundle!==`learning-path-v${prefix.slice(2)}-2026-10-11`) return ["unsupported or inconsistent revision version/bundle"];
  if(bank.items.some(item=>!item.id.startsWith(`${prefix}-`))||bank.lessons.some(lesson=>!lesson.id.startsWith(`${prefix}-lesson-`))) failures.push("revision version and item/lesson identifiers disagree");
  if(prefix==="lp5"||prefix==="lp6"||prefix==="lp7") {
    const revision=(source as {revision?:{version?:string;based_on_draft_sha256?:string;based_on_source_sha256?:string;acquisition_reused?:boolean;patch_hash_basis?:string;patch_sha256?:Record<string,string>;patch_payload_sha256?:Record<string,string>}})?.revision;
    const hash=(value:unknown)=>typeof value==="string"&&/^[a-f0-9]{64}$/u.test(value);
    const files=prefix==="lp5"?["jlpt-revisions.ts","topik-revisions.ts"]:["revisions.ts"];
    const payloads=prefix==="lp5"?["JLPT","TOPIK"]:prefix==="lp6"?["V6"]:["V7"];
    if(!revision||revision.version!==bank.version||revision.acquisition_reused!==true||revision.patch_hash_basis!=="same-bytes-executed-snapshot"||!hash(revision.based_on_draft_sha256)||!hash(revision.based_on_source_sha256)||files.some(key=>!hash(revision.patch_sha256?.[key]))||payloads.some(key=>!hash(revision.patch_payload_sha256?.[key]))) failures.push(`v${prefix.slice(2)} source revision/executed patch provenance missing or inconsistent`);
  }
  return failures;
}
