// 강성호 2026-10-11: 재배열된 보기를 이전 번호로 설명하는 명확한 회귀만 탐지한다. 정답 의미 검수는 대체하지 않는다.
import type { AuthoredItem } from "./learning-path-authoring-structure.js";
export function answerPositionFailures(items:readonly AuthoredItem[]) {
  const failures:string[]=[];
  const indices:Record<string,number>={"첫":0,"두":1,"둘":1,"세":2,"셋":2,"네":3,"넷":3,"一":0,"二":1,"三":2,"四":3,first:0,second:1,third:2,fourth:3};
  for(const item of items) if(item.answer_index!==undefined) {
    const patterns=[/\b(first|second|third|fourth)\s+(?:option|choice|answer)\s+(?:is\s+(?:correct|right)|fits|matches)/giu,/(첫|두|둘|세|셋|네|넷)\s*번째(?:\s*선택지)?가\s*(?:맞|정답)/gu,/(一|二|三|四)つ目(?:の選択肢)?が(?:正解|正しい)/gu];
    for(const [language,text] of Object.entries(item.explanation)) for(const pattern of patterns) for(const match of text.matchAll(pattern)) if(indices[match[1]!.toLowerCase()]!==item.answer_index) failures.push(`answer ordinal mismatch ${item.id}/${language}: ${match[1]}`);
  }
  return failures;
}
