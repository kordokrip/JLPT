// 강성호 2026-10-11: 새 초안의 결정적 결함만 탐지한다. 서로 다른 상황의 의미·정답 유일성·난이도는 독립 검수 대상이다.
import type { DraftItem } from "../content/learning-path-2026-10-11/data.js";
import type { SelectedConcept } from "./learning-path-v2-contract.js";
type Localized = {ko:string;ja:string;en:string};
export type AuthoredItem = DraftItem & {context_tag:string};
export function authoringStructureFailures(items: readonly AuthoredItem[], concepts: readonly SelectedConcept[], cues: Record<string,Localized>): string[] {
  const failures: string[]=[];
  const languages=["ko","ja","en"] as const;
  const complete=(value:Localized|undefined)=>!!value&&languages.every(language=>typeof value[language]==="string"&&value[language].trim());
  const ids=new Set<string>(),prompts=new Set<string>(),scripts=new Set<string>();
  if(items.length!==concepts.length*2)failures.push("expected two items per selected concept");
  if(Object.keys(cues).length!==concepts.length||Object.keys(cues).some(key=>!concepts.some(concept=>concept.key===key)))failures.push("cue key coverage mismatch");
  for(const concept of concepts) {
    if(!complete(cues[concept.key]))failures.push(`incomplete learning cue ${concept.key}`);
    const pair=items.filter(item=>item.concept_key===concept.key);
    if(pair.length!==2||new Set(pair.map(item=>item.context_tag)).size!==2)failures.push(`two distinct tagged situations required ${concept.key}`);
    for(const text of Object.values(concept.title))if(/\(Korean\)|（韓国語）/.test(text))failures.push(`concept title placeholder ${concept.key}`);
  }
  for(const item of items) {
    if(ids.has(item.id))failures.push(`duplicate id ${item.id}`);ids.add(item.id);
    const concept=concepts.find(value=>value.key===item.concept_key);
    const modes:Record<string,string>={vocab:"vocab_mc",grammar:"grammar_fill",kanji:"kanji_reading",listening:"listening"};
    if(!concept||concept.track!==item.track||concept.level!==item.level||(concept.track==="jlpt-ja"?modes[concept.section]:concept.section)!==item.section)failures.push(`concept/track/level/section mismatch ${item.id}`);
    if(!complete(item.question)||!complete(item.explanation)||!item.context_tag?.trim()||!Number.isInteger(item.difficulty)||item.difficulty<1||item.difficulty>5)failures.push(`incomplete authoring fields ${item.id}`);
    const stimulus=item.question.ko.split("\n").slice(1).join("\n");
    for(const language of languages) {
      if(!stimulus.trim()||item.question[language].split("\n").slice(1).join("\n")!==stimulus)failures.push(`target stimulus translated/missing ${item.id}/${language}`);
    }
    const fingerprint=stimulus.replace(/[\s\p{P}]/gu,"");
    if(prompts.has(fingerprint))failures.push(`duplicate target prompt ${item.id}`);prompts.add(fingerprint);
    if(item.section==="writing") {
      if(item.choices||item.answer_index!==undefined||!complete(item.rubric)||!complete(item.sample))failures.push(`invalid constructed response ${item.id}`);
    } else {
      if(item.choices?.length!==4||!Number.isInteger(item.answer_index)||item.answer_index!<0||item.answer_index!>3)failures.push(`invalid answer/choices ${item.id}`);
      for(const language of languages)if(item.choices?.some(choice=>!choice[language]?.trim())||new Set(item.choices?.map(choice=>choice[language].trim())).size!==4)failures.push(`duplicate/empty choice ${item.id}/${language}`);
      if(item.choices?.some(choice=>choice.ko!==choice.ja||choice.ko!==choice.en))failures.push(`test choices translated ${item.id}`);
    }
    if(item.section==="listening") {
      const script=item.audio_script?.trim();
      if(!script)failures.push(`missing listening script ${item.id}`);
      else {const key=script.replace(/\s/g,"");if(scripts.has(key))failures.push(`repeated listening script ${item.id}`);scripts.add(key);
        if(item.question.ko.includes(script))failures.push(`listening script exposed ${item.id}`);}
    } else if(item.audio_script!==undefined)failures.push(`non-listening audio ${item.id}`);
    if(/(?:r2|audio_url|audioUrl|legacy|https?:\/\/)/iu.test(JSON.stringify(item)))failures.push(`forbidden pronunciation transport ${item.id}`);
    if(/Target pattern|目標文型|사용할 문형/u.test(JSON.stringify(item.question)))failures.push(`answer-revealing pattern label ${item.id}`);
  }
  for(const key of new Set(concepts.map(concept=>`${concept.track}/${concept.level}`))) {
    const [track,level]=key.split("/"),group=items.filter(item=>item.track===track&&item.level===level);
    if(group.length!==40)failures.push(`grade ${key} requires 40 items`);
    const sections=track==="jlpt-ja"?["vocab_mc","grammar_fill","kanji_reading","listening"]:["vocab","grammar","reading","listening","writing"];
    for(const section of sections) {
      const selected=group.filter(item=>item.section===section),expected=track==="jlpt-ja"?10:8;
      if(selected.length!==expected)failures.push(`section count ${key}/${section}`);
      if(section!=="writing") {const answers=[0,1,2,3].map(answer=>selected.filter(item=>item.answer_index===answer).length);
        if(track==="jlpt-ja"?Math.max(...answers)-Math.min(...answers)>1:answers.some(count=>count!==2))failures.push(`section answer imbalance ${key}/${section}`);}
    }
    const expected=track==="jlpt-ja"?10:8;
    if([0,1,2,3].some(answer=>group.filter(item=>item.answer_index===answer).length!==expected))failures.push(`grade answer imbalance ${key}`);
  }
  return failures;
}
