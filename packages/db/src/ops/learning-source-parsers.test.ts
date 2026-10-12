import test from "node:test";
import assert from "node:assert/strict";
import { dictionaryJapaneseLemma, dictionaryKoreanLemma, parseJmdictFacts, parseKrdictFacts } from "./learning-source-parsers.js";
test("dictionary form aliases are explicit, not arbitrary level/headword fallback", () => {
  assert.equal(dictionaryJapaneseLemma("準備する"),"準備");
  assert.equal(dictionaryJapaneseLemma("確認"),"確認");
  assert.equal(dictionaryKoreanLemma("맑음"),"맑다");
  assert.equal(dictionaryKoreanLemma("문의"),"문의");
});
test("JMdict separates homograph readings and requires a suru noun", () => {
  const facts = parseJmdictFacts("<pre>先生 [シーサン] /(n) man/\n先生 [せんせい] /(n) teacher/</pre>","先生");
  assert.deepEqual(facts.filter(f=>f.kind==="reading").map(f=>f.value),["シーサン","せんせい"]);
  assert.match(facts.find(f=>f.value==="teacher")!.source_locator,/せんせい/);
  assert.equal(parseJmdictFacts("<pre>準備 [じゅんび] /(n,vs) preparation/</pre>","準備する")[0]!.value,"準備");
  assert.throws(()=>parseJmdictFacts("<pre>準備 [じゅんび] /(n) preparation/</pre>","準備する"),/suru-noun constraint/);
  assert.throws(()=>parseJmdictFacts("<pre>確認書 [かくにんしょ] /(n) document/</pre>","確認"),/exact headword missing/);
});
test("KRdict exact matching excludes unrelated results and external definitions/examples", () => {
  const html = `<dl><span class="word_type1_17">문</span><dd class="manyLang7">ドア</dd></dl>
    <dl><span class="word_type1_17">문의<sup>1</sup></span><a onclick="checkSubmit('111')"></a><dd class="manyLang7 ">問い合わせ</dd><dd>EXTERNAL DEFINITION MUST NOT BE SAVED</dd></dl>`;
  const facts=parseKrdictFacts(html,"문의");
  assert.deepEqual(facts.map(f=>f.value),["문의","問い合わせ"]);
  assert.match(facts[1]!.source_locator,/entry 111/);
  assert.doesNotMatch(JSON.stringify(facts),/EXTERNAL DEFINITION/);
  assert.throws(()=>parseKrdictFacts(html,"민원실"),/exact headword unavailable/);
});
test("KRdict missing Japanese is retained as missing, not manufactured translation", () => {
  const html=`<dl><span class="word_type1_17">민원실</span><dd class="manyLang7">（対訳語無し）</dd></dl>`;
  assert.deepEqual(parseKrdictFacts(html,"민원실").map(f=>f.kind),["lexical-form"]);
  assert.equal(parseKrdictFacts(`<dl><span class="word_type1_17">맑다</span></dl>`,"맑음")[0]!.value,"맑다");
  assert.throws(()=>parseKrdictFacts(`<dl><span class="word_type1_17">문의</span><dd class="manyLang7">${"あ".repeat(201)}</dd></dl>`,"문의"),/oversized/);
});
