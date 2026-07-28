# TOPIK I v1 Local Evidence Revalidation Addendum

기준일: 2026-07-29 KST
대상: `topik-i-self-authored-preview-v1`

## 사실과 범위

v1의 candidate source, manifest, release state 또는 reviewer sign-off는 변경하지 않는다.
v1은 계속 `draft`이며 public `published` release가 아니다.

2026-07-29의 local regression 실행이 gitignored
`.artifacts/release-candidates/topik-i-self-authored-preview-v1/` 아래의 세
verifier report 경로를 다시 생성했다. 이 때문에
`TOPIK_I_RELEASE_GATE_ASSESSMENT_2026-07-28.md`에 기록된 이전 report SHA와
현재 파일 SHA가 일치하지 않는다.

원 assessment에 보존된 역사적 SHA는 다음과 같다.

| Artifact | Historical SHA-256 |
| --- | --- |
| local candidate verification | `ba437ca0379ef4f7a3ce859464431e9cbdfb97e804f370bc1897920c23950d80` |
| content contract verification | `3132cd217cc3870aae7be896829b71701d7abca8a24f8cfbd5b75e6810029144` |
| control-plane verification | `c3f8ea1192340a18aa7d1e51a2b42ffb8030348f821c5bc9c717b3b23a78a31c` |

workspace duplicate, package-local artifact, Git reflog 및 unreachable blob을
조회했지만 이 세 byte-identical object는 발견되지 않았다. SHA만으로 원문을
복원할 수 없으므로 현재 report를 원본이라고 주장하지 않는다.

## 결정

1. 원 assessment는 historical record로 보존한다. 그 SHA가 가리키던 원문은
   현재 local workspace에서 재검증할 수 없는 historical-only evidence다.
2. 현재 root v1 report 경로의 새 파일은 원본 evidence의 대체물이 아니다.
   새 revalidation은 별도 dated artifact prefix에만 기록한다.
3. v1은 public G0~G5 판정, `human_reviewed`, `published`, preview promotion 또는
   owner-private claim의 근거로 사용하지 않는다. 따라서 원본 local report의
   부재가 production exposure를 허용하지 않는다.
4. owner-private v3는 독립 release ID·manifest·local verifier report를 사용한다. Preview에 남은 v2는 unclaimed draft로 보존하며 source metadata를 수정하거나 claim하지 않는다.
   v1 evidence를 상속하거나 수정하지 않는다.
5. 향후 v1을 다시 다루려면 새 immutable candidate와 현재 public review/gate
   절차를 사용한다. 이 addendum은 reviewer sign-off나 public gate를 대체하지 않는다.

## Revalidation record

아래 표는 current checkout에서 별도 prefix로 다시 실행한 결과만 기록한다.
원본 2026-07-28 artifact와 동일하다는 주장은 하지 않는다.

| Artifact | Local path | SHA-256 | Result |
| --- | --- | --- | --- |
| local candidate verification | `.artifacts/revalidations/2026-07-29/topik-i-self-authored-preview-v1/local-candidate-verification.json` | `78d6e349d8b8e7402cfbfee5c9852525a6eefc6653f1749da1d4c7aa0b9063c4` | PASS |
| content contract verification | `.artifacts/revalidations/2026-07-29/topik-i-self-authored-preview-v1/content-contract-verification.json` | `aa9cdf2c525acd6379e6c703c179972d44b6ce9f6a10b7023e22b61c7cef7cec` | PASS |
| control-plane verification | `.artifacts/revalidations/2026-07-29/topik-i-self-authored-preview-v1/control-plane-verification.json` | `45678c573db90655a7511385917c32bc30a53d1b2a6cb797f0a55e4de58709ad` | PASS |

이 문서는 raw item body, answer, owner subject, session, email 또는 token을
기록하지 않는다.
