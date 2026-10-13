// 강성호 2026-10-13: 저장 형식 오류가 canonical로 재분류되거나 버전 검사에서 빠지지 않도록 검사한다.
import {describe,it,expect} from 'vitest';
import {parseStoredQuiz} from './quiz-publication.js';
const canonical={id:'q',type:'vocab_mc',answer:'뜻',item_id:123};
describe('stored quiz typed publication contract',()=>{
 it('preserves numeric canonical and exact numeric-looking string static IDs',()=>{
  expect(parseStoredQuiz(JSON.stringify([canonical]),1,'vocab_mc')?.[0]?.item_id).toBe(123);
  expect(parseStoredQuiz(JSON.stringify([{...canonical,item_id:'123',bank_version:'v1'}]),1,'vocab_mc')?.[0]?.item_id).toBe('123');
 });
 it('rejects missing, malformed, duplicated and explicitly invalid version snapshots',()=>{
  for(const q of [null,1,[],{...canonical,item_id:null},{...canonical,item_id:{}},{...canonical,item_id:true},{...canonical,item_id:1.5},{...canonical,item_id:0},{...canonical,id:''},{...canonical,type:'listening'},{...canonical,item_id:'123',bank_version:null},{...canonical,item_id:'123',bank_version:''},{...canonical,item_id:'123',bank_version:false},{...canonical,bank_version:'v1'}])
   expect(parseStoredQuiz(JSON.stringify([q]),1,'vocab_mc')).toBeNull();
  for(const raw of [null,'invalid','{}','[]',JSON.stringify([canonical,canonical])])expect(parseStoredQuiz(raw,1,'vocab_mc')).toBeNull();
  expect(parseStoredQuiz(JSON.stringify([canonical]),1,null)).toBeNull();
 });
});
