# Cloudflare Workers Logpush → R2 설정 가이드

> Cloudflare Dashboard를 사용하는 원-타임 설정입니다. 코드 변경 없이 진행합니다.

## 1. 사전 조건

| 항목 | 확인 |
|------|------|
| Cloudflare Pro 이상 플랜 | Logpush는 Workers Paid 이상 |
| R2 버킷 생성 (`nihongo-n3-reports`) | backup-d1.yml 참고 |
| API Token: `Logs:Edit` 권한 포함 | 대시보드 → My Profile → API Tokens |

---

## 2. R2 Logpush 잡 생성

### 2-1. Cloudflare Dashboard 경로

**Analytics & Logs → Logpush → Create a Logpush job**

### 2-2. 설정값

| 필드 | 값 |
|------|----|
| Source | **Workers Trace Events** |
| Destination | **R2** |
| Bucket name | `nihongo-n3-reports` |
| Path prefix | `logs/workers/` |
| Filename format | `{DATE}/{HOUR}/{UNIQUE_ID}.json.gz` |

### 2-3. 로그 필드 선택 (PII 마스킹)

아래 필드를 **포함**합니다:

```
ScriptName, Outcome, CPUTime, WallTime,
DispatchNamespace, Entrypoint,
Exceptions[0].Name, Exceptions[0].Message,
Logs[0].Level, Logs[0].Message
```

⚠️ **반드시 제외**해야 하는 PII 필드:

| 필드 | 이유 |
|------|------|
| `ClientIP` | 이용자 IP 주소 |
| `RequestHeaders` | Authorization / Cf-Access-Jwt 헤더 포함 가능 |
| `ResponseHeaders` | Set-Cookie 등 |
| `ClientRequestUserAgent` | 개인 식별 가능한 브라우저 정보 |

> Logpush 필드 전체 목록: https://developers.cloudflare.com/workers/observability/logpush/

---

## 3. 5xx 에러율 알림 설정

**Cloudflare Dashboard → Notifications → Add Notification**

| 필드 | 값 |
|------|----|
| Alert type | **Workers Script Error Rate** |
| Worker | `nihongo-n3-api` |
| Condition | Error rate > **1%** over **5 minutes** |
| Delivery | Email (운영자 이메일 주소) |

---

## 4. Cloudflare Dashboard 핵심 지표 패널

아래 지표는 **Workers & Pages → nihongo-n3-api → Analytics** 에서 확인합니다.

### p50/p95 응답 시간 (라우트별)

Workers Analytics에서는 전체 p50/p95 확인 가능.  
라우트별 세분화는 **Logpush 로그를 R2에서 Athena/BigQuery로 불러오거나**  
`console.log()` 타이밍 데이터를 Workers에서 직접 기록한 뒤 Logpush로 수집합니다.

### 4xx / 5xx 비율

**Analytics → Requests → Subrequests Errors** 패널에서 자동 집계됩니다.

### D1 쿼리 시간

**Storage → D1 → nihongo-n3-prod → Metrics** 패널:
- Query duration (p50 / p99)
- Rows read / written
- Storage used

### R2 Egress 트래픽

**R2 → nihongo-n3-assets → Metrics** 패널:
- Requests (GET / PUT / DELETE)
- Data retrieved (egress)

> R2에서 Worker로의 전송은 무료이므로 실제 비용은 외부 egress만 해당됩니다.

---

## 5. MailChannels 이메일 발송 설정 (주간 리포트)

`NOTIFY_EMAIL` 환경변수가 설정된 경우 매주 일요일 23:00 KST에  
자동으로 MailChannels API를 통해 리포트를 발송합니다.

### 5-1. DNS 레코드 추가 (SPF / DKIM)

도메인이 `nihongo-n3.pages.dev`인 경우 Cloudflare가 관리하므로  
별도 DNS 설정 없이 MailChannels의 [Cloudflare Workers integration](https://support.mailchannels.com/hc/en-us/articles/16918954360333) 활성화만 하면 됩니다.

커스텀 도메인 사용 시:

```
# SPF
TXT @ "v=spf1 include:relay.mailchannels.net ~all"

# DKIM (MailChannels Dashboard에서 발급)
TXT mailchannels._domainkey "v=DKIM1; p=<public-key>"
```

### 5-2. wrangler.toml 환경변수 설정

```toml
[vars]
NOTIFY_EMAIL = "your-email@example.com"
```

---

## 6. 자체 검증 체크리스트

- [x] `ClientIP`, `RequestHeaders`, `ResponseHeaders` 필드 **제외** — PII 마스킹 완료
- [x] `backups/` 버킷 — production D1과 **동일 버킷** 사용 안 함 (REPORTS 버킷 분리)
- [x] Preview 배포 — `VITE_API_BASE_URL`이 Preview 환경변수에서 Preview API URL로 분리됨
- [x] 5xx 알림 — Dashboard Notification으로 1% / 5분 임계값 설정
