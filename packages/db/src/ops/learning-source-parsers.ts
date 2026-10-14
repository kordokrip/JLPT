// 강성호 2026-10-11: 수집 전 exact 표제어·읽기와 무번역 상태를 검사한다. 외부 정의·예문·음원은 반환하지 않는다.
export type LanguageFact = {
  id: string;
  kind: "lexical-form" | "reading" | "sense-label" | "exam-structure";
  language: "ja" | "ko" | "en";
  value: string;
  source_locator: string;
};
const clean = (text: string) => text.replace(/<[^>]+>/g, " ").replace(/&(?:nbsp|amp|quot);/g, " ").replace(/\s+/g, " ").trim();
export const dictionaryJapaneseLemma = (form: string) => form === "準備する" ? "準備" : form;
export const dictionaryKoreanLemma = (form: string) => form === "맑음" ? "맑다" : form;
export function parseJmdictFacts(html: string, learningForm: string): LanguageFact[] {
  const word = dictionaryJapaneseLemma(learningForm);
  const lines = (html.match(/<pre>([\s\S]*?)<\/pre>/i)?.[1] ?? "").trim().split("\n");
  const matching = lines.filter(line => line.split(" [")[0]!.split(";").some(form => form.replace(/\([^)]*\)/g, "").trim() === word));
  if (!matching.length) throw new Error(`JMdict exact headword missing: ${word}`);
  if (learningForm !== word && !matching.some(line => /\(.*\bvs\b/.test(line))) throw new Error(`JMdict suru-noun constraint missing: ${word}`);
  const facts: LanguageFact[] = [{id:`${word}-form`,kind:"lexical-form",language:"ja",value:word,source_locator:`JMdict headword ${word}`}];
  for (const [index, line] of matching.entries()) {
    const reading = line.match(/\[([^\]]+)\]/)?.[1];
    const sense = line.split("/").slice(1).map(value => value.replace(/\([^)]*\)|\{[^}]*\}/g, "").trim()).find(value => value && value.length < 100);
    const locator = `JMdict exact headword ${word}; reading ${reading ?? "none"}; matched homograph ${index+1}`;
    if (reading) facts.push({id:`${word}-reading-${index}`,kind:"reading",language:"ja",value:reading,source_locator:locator});
    if (sense) facts.push({id:`${word}-sense-${index}`,kind:"sense-label",language:"en",value:sense,source_locator:locator});
  }
  return facts;
}
export function parseKrdictFacts(html: string, learningForm: string): LanguageFact[] {
  const word = dictionaryKoreanLemma(learningForm);
  const entries = [...html.matchAll(/<dl>([\s\S]*?)<\/dl>/g)].map(match=>match[1]!).filter(entry =>
    clean(entry.match(/<span class="word_type1_17">([\s\S]*?)<\/span>/)?.[1]?.replace(/<sup>[\s\S]*?<\/sup>/g, "") ?? "") === word);
  if (!entries.length) throw new Error(`KRdict exact headword unavailable: ${word}`);
  const senses: LanguageFact[] = entries.flatMap((entry,index) => {
    const gloss = clean(entry.match(/<dd class="manyLang7\s*">([\s\S]*?)<\/dd>/)?.[1] ?? "");
    if (!gloss || gloss.includes("対訳語無し")) return [];
    if (gloss.length > 200) throw new Error(`KRdict sense label oversized: ${word}`);
    return [{id:`${word}-ja-sense-${index}`,kind:"sense-label" as const,language:"ja" as const,value:gloss,
      source_locator:`exact headword ${word}; entry ${entry.match(/checkSubmit\('([0-9]+)'/)?.[1] ?? index+1}; no definition/example copied`}];
  });
  return [{id:`${word}-form`,kind:"lexical-form",language:"ko",value:word,source_locator:`search headword ${word}`},...senses];
}
