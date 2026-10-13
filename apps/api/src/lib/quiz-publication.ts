// 강성호 2026-10-13: INC-QUIZ-098. 저장 퀴즈의 typed ID/버전과 현재 공개 상태를 대조해 철회 콘텐츠의 채점·정답 조회를 차단한다.
import type { AppEnv } from '../types.js';

export type StoredQuizQuestion = { id:string; type:string; answer:string; item_id:string|number; bank_version?:string };
const modes=new Set(['vocab_mc','grammar_fill','kanji_reading','listening']);
export function parseStoredQuiz(raw:string|null,total:number,mode:string|null):StoredQuizQuestion[]|null {
  if(!raw || !Number.isSafeInteger(total) || total<1 || total>20 || !mode || !modes.has(mode)) return null;
  let value:unknown;try{value=JSON.parse(raw);}catch{return null;}
  if(!Array.isArray(value) || value.length!==total) return null;
  const result:StoredQuizQuestion[]=[],ids=new Set<string>();
  for(const q of value){
    if(!q || typeof q!=='object' || Array.isArray(q))return null;
    const row=q as Record<string,unknown>;
    if(typeof row.id!=='string' || !row.id.trim() || ids.has(row.id) || row.type!==mode || typeof row.answer!=='string' || !row.answer.trim())return null;
    const id=row.item_id;
    if(typeof id!=='number' && typeof id!=='string')return null;
    if(typeof id==='number' ? !Number.isSafeInteger(id)||id<1 : !id.trim())return null;
    if(Object.hasOwn(row,'bank_version') && (typeof id!=='string'||typeof row.bank_version!=='string'||!row.bank_version.trim()))return null;
    ids.add(row.id);
    result.push({id:row.id,type:mode,answer:row.answer,item_id:id,...(typeof row.bank_version==='string'?{bank_version:row.bank_version}:{})});
  }
  return result;
}

// 내부 고정 alias만 전달한다. JSON이 손상된 기존 행도 SQL 오류/정답 노출 대신 JS 형식검사에서 차단한다.
export function unavailableQuizSql(alias:string):string {
  if(!/^[a-z_]+$/.test(alias))throw new Error('Internal SQL alias required');
  const q="IIF(question.type='object',question.value,'{}')";
  return `EXISTS(SELECT 1 FROM json_each(IIF(json_valid(${alias}.questions_json),${alias}.questions_json,'[]')) question
    WHERE json_type(${q},'$.item_id')='text' AND NOT EXISTS(
      SELECT 1 FROM jlpt_practice_questions bank
      WHERE bank.id=json_extract(${q},'$.item_id') AND bank.learning_track=${alias}.learning_track
        AND bank.level=${alias}.level AND bank.mode=${alias}.mode AND bank.mode=json_extract(${q},'$.type')
        AND bank.is_published=1 AND (json_type(${q},'$.bank_version') IS NULL
          OR bank.bank_version IS json_extract(${q},'$.bank_version'))))`;
}
export async function storedQuizAvailable(db:AppEnv['Bindings']['DB'],questionsJson:string,level:string|null,mode:string|null):Promise<boolean>{
  const row=await db.prepare(`SELECT ${unavailableQuizSql('attempt')} unavailable
    FROM (SELECT ? questions_json,'jlpt-ja' learning_track,? level,? mode) attempt`)
    .bind(questionsJson,level,mode).first<{unavailable:number}>();
  return row?.unavailable===0;
}
export function isQuizPublicationGuardError(error:unknown):boolean {
  return error instanceof Error && /Quiz (content unavailable|snapshot invalid)/.test(error.message);
}
