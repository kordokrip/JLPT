type Illustration = 'study-book' | 'recall-cards' | 'listening' | 'growth-journal' | 'kanji-tile';
/** 강성호 2026-10-14: 장식 이미지는 숨기고 실제 버튼 제목을 접근성 이름으로 유지한다. */
export function LearningIllustration({ kind, size = 64, glyph = '漢' }: {kind: Illustration; size?: 48 | 64 | 96; glyph?: '漢' | 'あ' | '가'}) {
  return <span aria-hidden="true" className="relative inline-flex shrink-0 items-center justify-center" style={{width:size,height:size}}>
    <img src={`/learning-icons/${kind}.webp`} width={size} height={size} alt="" loading="lazy" className="h-full w-full object-contain" onError={e => { e.currentTarget.hidden = true; }} />
    {kind === 'kanji-tile' && <span className="absolute left-[27%] top-[23%] font-serif font-bold text-[#214764]" style={{fontSize:size*0.33}}>{glyph}</span>}
  </span>;
}
