# N2/N1 practice v1 and TOPIK owner Batch 6 source boundary

Generated: 2026-08-23 KST

## Authorship boundary

This repository source covers the planned JLPT N2 and N1 practice v1 banks and
TOPIK owner curriculum Batch 6. Every prompt, choice, listening script, answer,
rubric, and explanation must be newly written for this project. Official JLPT
or TOPIK questions, passages, answer keys, recordings, and transcripts are not
inputs to these banks and must not be copied or adapted.

The JLPT banks each contain the self-authored `vocab_mc`, `grammar_fill`,
`kanji_reading`, and `listening` modes. TOPIK Batch 6 contains grades 3 through
6 and the `vocab`, `grammar`, `reading`, `listening`, and `writing` sections.
This file states the source boundary; it does not constitute reviewer approval
or permission to publish a draft.

## Primary-source licence review

The review below was performed at `2026-08-22T16:12:06Z`. It records compact
licence and interface metadata only. No dictionary body, example sentence,
exam item, passage, answer, transcript, or multimedia asset is stored here.

### JMdict and KANJIDIC2

- Primary terms: <https://www.edrdg.org/edrdg/licence.html>
- Licence: `CC-BY-SA-4.0`,
  <https://creativecommons.org/licenses/by-sa/4.0/>
- Attribution: Electronic Dictionary Research and Development Group (EDRDG),
  including links to the JMdict and KANJIDIC project pages when the data is
  used.
- Verified boundary: the EDRDG statement applies to the Japanese and English
  parts of JMdict and to KANJIDIC2. Other JMdict translation components can
  have separate rights. KANJIDIC2 also contains identified third-party fields,
  so this project must not intake specialist codes or readings unless their
  separate terms are verified.
- Allowed authoring evidence: an individual Japanese lexical form, reading, or
  compact English sense label may be checked as a fact. Dictionary entries,
  definitions, lists, and significant extracts are not copied into questions.
- Terms snapshot SHA-256:
  `52f60ea9ca68170a2f0663d7dba381ebf1bd57c17a3347dfe21153865c156692`.
  This is the SHA-256 of the raw response body retrieved from the primary terms
  URL.

The terms permit sharing and adaptation with attribution and share-alike
conditions. They additionally require acknowledgement and source/licence links
for software using the files, and explicit acknowledgement for significant
extracts. This batch remains independently authored even when a compact fact is
cross-checked.

### Korean Basic Dictionary Open API

- Primary API guide:
  <https://krdict.korean.go.kr/kor/openApi/openApiInfo>
- Primary copyright policy:
  <https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo>
- Licence for site text not otherwise marked: `CC-BY-SA-2.0-KR`,
  <https://creativecommons.org/licenses/by-sa/2.0/kr/>
- Attribution: National Institute of Korean Language, Korean Basic Dictionary
  (`한국어기초사전`), with links to the applicable source and licence.
- Verified boundary: the API requires an issued key and documents a daily call
  limit. It exposes text fields such as headword, text pronunciation, level,
  part of speech, and definition. Authors may retain only a headword, text
  pronunciation, part-of-speech or level label, and a compact sense label as
  fact evidence. Definitions and examples are not copied into questions.
- Multimedia is separately licensed item by item and is excluded from this
  workflow. No API audio, sound, image, video, or pronunciation file may be
  collected, stored, or played.
- API guide normalized SHA-256:
  `eacbbc1c76060a85485607ef9e5e23b15df3f09da781d23ce15e4b17687e7d80`.
- Copyright policy normalized SHA-256:
  `c8fe1a9dc7662705069e2f04866d5537bf0e0a9f8b17625892739990df1bd614`.

The Korean site emits a new CSRF token on each page request. For each normalized
snapshot hash above, the UTF-8 response body was fetched after redirects using
a browser user agent and Korean `Accept-Language`; only the value of the hidden
`_csrf` field was replaced with the literal `<normalized>` before hashing. Two
independent retrievals produced the same normalized hash for each page.

## Official exam-structure review

The review below was performed at `2026-08-22T16:48:32Z`. Only public exam
structure and site-policy metadata was retained. Official sample questions,
passages, choices, answers, scoring keys, recordings, and transcripts were not
opened or stored.

### JLPT N1 and N2

- Primary structure:
  <https://www.jlpt.jp/e/guideline/testsections.html>
- Primary site policy: <https://www.jlpt.jp/e/policy.html>
- Rights holder and attribution: the Japan Foundation and Japan Educational
  Exchanges and Services, Official Worldwide JLPT Website, with links to the
  structure page and site policy.
- Current structure metadata: N1 has a 110-minute Language Knowledge
  (Vocabulary/Grammar) and Reading section plus a 55-minute Listening section.
  N2 has the same two-section grouping with 105 and 50 minutes respectively.
  The official composition groups item purposes under vocabulary, grammar,
  reading, and listening.
- Structure page raw-response SHA-256:
  `b0d15f8ab1464cc1c8fec902a218c2d9390dd9895f39803915c632f85cc92ab5`.
- Site-policy raw-response SHA-256:
  `a1a6f66cf03dac44ddce0482f38c960f75e3b69e046853e8f8de3fb8ca058a70`.

The JLPT site policy states that site works are copyright-protected and limits
copying, public transmission, and adaptation outside an applicable permission
or legal exception. Official test material can also contain third-party works.
This project therefore records the section metadata above as an official
reference only; it does not reproduce or adapt official JLPT content. Two
independent raw-body retrievals produced the same hash for each page.

### TOPIK

- Primary structure:
  <https://www.niied.go.kr/web/niied/contents/niied_topik>
- Primary copyright policy:
  <https://www.niied.go.kr/web/main/contents/copyright>
- Rights holder and attribution: National Institute for International
  Education (NIIED), with links to the TOPIK information and copyright pages.
- Current PBT structure metadata: TOPIK I covers Listening and Reading, with 30
  and 40 items, 100 minutes, 200 total points, and grades 1 through 2. TOPIK II
  covers Listening, Reading, and Writing, with 50, 50, and 4 items, 180 minutes,
  300 total points, and grades 3 through 6.
- Current IBT structure metadata: TOPIK I IBT covers Listening and Reading with
  26 items each, 70 minutes, and 400 total points. TOPIK II IBT covers
  Listening, Reading, and Writing with 30, 30, and 3 items, 125 minutes, and 600
  total points.
- Structure page normalized-visible-text SHA-256:
  `25c3cefb1bc37fd74afad15143437c7b24545854cb99732957a1e683ebe91ae2`.
- Copyright page normalized-visible-text SHA-256:
  `3d84619d4c505d7d9e798d018ed12035b8b6068eb06b64cd47d8507a6717e811`.

NIIED's policy protects site materials, requires specific source attribution
for permitted personal academic or research use of works it wholly controls,
and requires separate permission for third-party or shared-rights material.
The owner curriculum uses only the public structure metadata above and does not
claim to reproduce an official PBT or IBT test. `vocab` and `grammar` remain
project learning categories rather than additional official TOPIK sections.

For each NIIED hash, a real browser loaded the official page to network idle.
The visible body text was normalized by converting line endings to LF, removing
trailing whitespace from each line, trimming the whole value, and appending one
LF before UTF-8 SHA-256. Two isolated browser retrievals produced the same
normalized hash for each page.

## Intake and audio rules

Item authors receive only the validated intake artifact SHA-256 and compact
fact records. They must not receive copied source text. Reviewer A and Reviewer
B assess each authored item independently, and no item is publishable before
both approvals and deterministic validation succeed.

Japanese and Korean listening playback uses browser Google speech only. This
source authorizes no pronunciation audio file, R2 object, stored audio bytes,
generation job, playback URL, or fallback path.
