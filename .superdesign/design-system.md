# JLPT · TOPIK — 작은 발걸음 학습 지도

## Product and state
- Personal/family language-learning PWA. Korean-speaking JLPT learner and Japanese-speaking TOPIK learner have equal priority. Mobile first (390px), tablet/desktop retain the same learning order.
- Existing React/Vite/Tailwind UI has Today, Learn, Review, Records; existing lessons, FSRS, sessions, XP and voice remain authoritative. No DB migration, reseed, invented mastery, or API changes in the first UI pass.
- User approved continuing the selected map direction and requested refined imagery plus lesson/completion implementation on 2026-10-13. Local React implementation is not yet a deployed release. All progress counts in drafts are synthetic examples, never real learner records.
- Current baseline: Today.tsx configured profile branch; existing account header, routine panel, two time buttons, goal setup and Learn/Records links. Reproduction must use current source exactly, not the proposed map styles below.

## Approved design direction
Friendly game-like learning path with freedom to explore. Duolingo inspires clear next action and bite-size practice, NOT its owl, proprietary fonts, exact green identity, public marketing landing page, or paywall/hearts mechanics.
The extracted public website is only a visual reference, not evidence of the authenticated Duolingo app.

## Tokens and component language
- Keep local identity: porcelain background #F7F3EA, surface #FFFCF6, ink #172536, secondary text #465565, JLPT vermilion #C7483D, pressed vermilion #AA382F, TOPIK indigo #214764, jade #527A69, success #5C7F4F. Soft fills #F8E7E3 (JLPT), #E6EEF3 (TOPIK), #F0EDE5 (neutral). Borders rgba(0,0,0,.1). White #FFFFFF for primary button text.
- System sans only: -apple-system, BlinkMacSystemFont, Hiragino Kaku Gothic ProN, Yu Gothic, Apple SD Gothic Neo, Segoe UI, sans-serif. No external proprietary fonts, serif headlines, all-caps English dashboard labels.
- Body 16px / 1.6; labels 14px; section titles 20px/700; screen titles 28px/800. Never shrink Japanese to fit; wrap naturally.
- Spacing 4/8/12/16/24/32px; mobile side inset 20px; map content max-width 560px; bottom navigation 64px plus safe area.
- Proposed controls: minimum 48px height, radius 16px, solid track accent, a 4px bottom edge in darker track color; active press translates 2px. Cards radius 20px, 1px neutral border, no glass or gradients.
- Path nodes 64px (current 80px), circular with shallow dimensional base; connectors subdued and decorative. Done has check + localized label; current has pointer + label; future is available, never padlocked. Neutral nodes remain high-contrast/tappable.
- Modest book/leaf/spark decoration only; not a new logo or owl. On mobile current source has no logo slot, so do not invent one. Real desktop logo must be retained when designing that shell.
- Icons use existing Lucide house, book-open-text, rotate-ccw, chart-no-axes-column-increasing. Meaning always accompanied by text.
- Motion 120–200ms; no infinite pulsing. prefers-reduced-motion disables animation and smooth scroll.

## Home/path information architecture
- Top bar: track + target level, compact streak, account action. No large hero/banner.
- One dominant CTA: resume existing session, else due FSRS review, else next public lesson, else review/free practice. No two equal primary time buttons.
- A real lesson title is visible beside the current node. Show 5 lessons per numbered segment; don't invent thematic chapters or imply official exam mastery.
- Main map remains visible above the fold. Secondary links: free practice, 20-minute routine, goal setting. Current-position affordance appears after exploring away.
- Four equal bottom destinations: 오늘/학습/복습/기록 or 今日/学ぶ/復習/記録.
- Japanese TOPIK UI uses Japanese actions and explanations but Korean learning text and audio. Korean JLPT UI preserves Japanese learning text/audio.

## Lesson/completion contracts
- Lesson title and actual step progress above a single focused card; learn/recall/practice labels reflect real state, not four invented server phases.
- Existing StudySpeech control remains a direct user gesture; no new audio fetching. Listening text/translation must be hidden until initial answer.
- Selected answer, submitting, unsynced, accepted feedback are distinct. Never claim completion offline before server acceptance.
- Bottom CTA is for current action only. Notes stay optional/secondary. No rewards for opening the map or revealing explanations.
- Completion: studied concepts, first-response and retry counts separately, actual next-review time or unavailable message, primary return-to-map action.
- Preserve version-pinned sessions, account/track isolation, withdrawn-content guards and idempotency.

## Delivery order
Current source reproduction -> one proposed map direction -> user canvas approval -> connected lesson and completion bilingual designs -> React implementation -> local/browser/Preview gates -> current Production approval.
The selected direction is approved for implementation; a new production rollout still needs its separate gates and current approval. Draft interactions are illustrative, not connected to DB or real speech.

## Refined asset and connected flow
- Original decorative paper-book journey with Japanese machiya/Korean hanok motifs: `apps/web/public/learning-journey.png`. Empty alt, normal document flow, max100px height. Never overlap a lesson title or action. Do not infer curriculum topics from the architecture.
- Connected drafts: lesson `0149889b-e697-48ad-9611-caf10e759533`, completion `08f5a941-b42e-4494-a557-9698937d3d00`.
- Actual app must not copy generated sample questions, skip semantics, example XP or dates. Use original server records and exact version-matched lesson titles. App illustration optimized separately; original generation retained.

## 2026-10-14 unified UI extension — awaiting visual approval
- The map is now deployed. Extend its visual language to every page, without changing API, DB, speech, scoring, FSRS, or reward behavior. Earlier undeployed statements above describe the original map design stage.
- Preserve light/dark/system preference. Both themes must use the same layout and component geometry. Light uses porcelain/surface/ink above; dark uses background #111110, surface #1C1C1A, raised #242422, primary text #EDEDEB, secondary #ADADAB, border rgba(255,255,255,.16). Avoid low-contrast muted labels. TOPIK dark accent #74A6C5 uses dark ink button text; JLPT accent #C7483D uses white. Verify final contrast rather than assuming token names ensure it.
- Replace full-width account details/summary with compact track/goal header and 48px profile button. Mobile opens a bottom dialog, desktop an anchored dialog; close button, Escape, focus containment/return. Settings/logout, admin-only user management; no new profile data or destructive actions.
- Four destinations stay Today/Learn/Review/Records. Secondary pages show context/back affordance; focused exercises retain their existing pause/exit semantics.
- Reuse cards20px, controls16px, minimum48px, shallow4px primary button base, body16px/1.6 and screen title28px/800 sans. No oversized serif UI headings, giant banners, invented mascots or equal competing primary buttons.
- Learn groups: free exercises, mistakes where supported, materials; plans/diagnostics secondary. Review: recall then reveal then rating, never expose meaning before reveal. Records: real source scopes distinct, no answers means no data not0% mastery, past due means overdue not future. No new backend metrics.
- All draft pages must offer a clearly marked preview-only language/track switch and independent light/dark switch; demo metrics and interactions labeled as examples. No auth, saving, actual speech or remote API calls. Japanese TOPIK learning content remains Korean; Korean JLPT learning content remains Japanese.
- First six connected drafts: shared shell/account, Learn hub, Review, Records, free-practice setup, welcome/login. One direction only. Actual React implementation waits for approval of this extension.
