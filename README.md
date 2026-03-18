# VALORANT AI Tactical Coach

Riot API와 Gemini를 이용해 최근 VALORANT 경기 데이터를 수집하고, 공수 운영, 경제, 클러치, 유틸리티 효율을 섹션별로 분석하는 Next.js 기반 프로토타입입니다.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma ORM
- Riot API
- Google Gemini API

## Features

- Riot ID와 Tag 입력 기반 분석 요청
- 최근 경기 동기화 후 3개 테마(combat/economy/context) + 최종 종합 분석
- LLM 분석 응답(헤드라인 + 문단형 요약) 생성
- Riot RSO mock/real provider 분리 + 내부 세션 발급 골격
- 헤더에서 로그인 상태 기반으로 `Riot 로그인` / `로그아웃` 버튼 자동 전환
- 로그인 시 헤더에 현재 Riot 계정(`gameName#tagLine`) 표시
- 대시보드에서 세션 계정 Riot ID/Tag 자동 반영 및 입력 잠금(session-bound)
- RiotAccount(puuid) 기반 최근 match 증분 sync 골격 (mock/real client 분리)
- RawMatch -> Round/Match/Aggregate feature extractor 계층
- Theme feature payload 기반 LLM 분석 레이어(mock/real Gemini client 분리)
- 관리자 토큰 기반 운영 로그 콘솔
- 분석 요청 rate limit 및 민감 로그 마스킹

## Project Structure

```text
app/
  api/
    [[...route]]/     catch-all route (실제 라우팅은 src/server/api/router.ts)
  dashboard/          분석 대시보드
components/           대시보드 및 운영 UI
src/server/           Riot, Gemini, 분석 파이프라인 로직
src/server/api/router.ts API path -> handler 매핑
src/server/api/routes/  API route handler 구현
src/server/auth/      RSO provider, 세션 저장소 추상화, 쿠키 헬퍼
src/server/db/        Prisma client + repository 골격
src/server/match-sync/ match sync service + mock/real Riot API client
src/server/features/  feature extractor + snapshot 저장 service
src/server/theme-payloads/ theme feature payload 타입/빌더
src/server/analysis/   prompt builder + mock/real llm client + cache 연동 서비스
prisma/schema.prisma  DB 스키마
public/riot.txt       Riot 심사용 공개 파일
```

## Setup

1. 의존성 설치

```bash
npm install
```

2. 환경 변수 준비

```bash
cp .env.local.example .env.local
```

3. 값 입력

- `RIOT_API_KEY`
- `RIOT_MATCH_API_PROVIDER` (`mock` / `real` / `auto`, 기본 `auto`)
- `GEMINI_API_KEY`
- `LLM_ANALYSIS_PROVIDER` (`mock` 또는 `real`, 기본 `mock`)
- `LLM_ANALYSIS_MODEL` (기본 `gemini-2.5-flash`)
- `ADMIN_ACCESS_TOKEN`
- `DATABASE_URL`
- `RIOT_AUTH_PROVIDER` (`mock` 또는 `real`, 기본 `mock`)
- `RIOT_RSO_CLIENT_ID` (`real` 사용 시)
- `RIOT_RSO_CLIENT_SECRET` (`real` 사용 시)
- `RIOT_RSO_REDIRECT_URI` (`real` 사용 시)

4. 개발 서버 실행

```bash
npm run dev
```

기본 주소는 `http://localhost:3000` 입니다.

## Runtime Mode 전환 (개발환경 CLI)

사이트 UI가 아니라 `.env.local` 값을 CLI로 전환할 수 있습니다.

```bash
# mock 모드로 전환 (auth/match/llm=mock, session=memory)
npm run mode:mock

# production-ready 모드로 전환 (auth/match/llm=real, session=db)
npm run mode:production

# 현재 모드 값 확인
npm run mode:status
```

한 번에 개발 서버까지 실행하려면:

```bash
npm run dev:mock
npm run dev:production
```

## Session UI 동작

- `SiteHeader`는 `/api/auth/session` 응답 기준으로 버튼을 전환합니다.
- 비로그인 상태: `Riot 로그인` 버튼 표시
- 로그인 상태: `로그아웃` 버튼 + 현재 계정(`gameName#tagLine`) 표시
- `Dashboard`는 로그인 세션이 있으면 Riot 계정 입력값을 자동 동기화하고 입력을 잠급니다.

## LLM 샘플 호출 확인

`temp/llm-analysis-input.sample.json` payload를 Gemini로 실제 전송해 결과를 파일로 확인할 수 있습니다.

```bash
# mock client로 로컬 출력 확인
npm run test:llm:mock

# real Gemini 호출 (GEMINI_API_KEY 필요)
npm run test:llm:real
```

- real 호출 결과 파일: `temp/llm-analysis-output.real.json`
- 파일에는 theme/final 프롬프트, 요청 payload, raw 응답 텍스트, 파싱된 결과가 함께 저장됩니다.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | DB 사용 시 필수 | Prisma 연결 문자열 |
| `RIOT_API_KEY` | Yes | Riot API 키 |
| `RIOT_MATCH_API_PROVIDER` | No | match sync API client 선택 (`mock` / `real` / `auto`) |
| `RIOT_MATCH_SYNC_MAX_IDS` | No | 한 번에 동기화할 최대 match id 수 |
| `RIOT_MATCH_LIST_BASE_URL` | No | Real client용 matchlist base URL |
| `RIOT_MATCH_DETAIL_BASE_URL` | No | Real client용 match detail base URL |
| `GEMINI_API_KEY` | Yes | Gemini API 키 |
| `LLM_ANALYSIS_PROVIDER` | No | LLM 분석 client 선택 (`mock` / `real`) |
| `LLM_ANALYSIS_MODEL` | No | LLM 분석용 모델명 |
| `LLM_ANALYSIS_CACHE_TTL_SECONDS` | No | LLM 분석 캐시 TTL(초) |
| `GEMINI_ANALYSIS_ENDPOINT` | No | LLM 분석용 Gemini base endpoint |
| `RIOT_ID` | No | 기본 Riot ID |
| `RIOT_TAG` | No | 기본 Riot Tag |
| `RIOT_MATCH_COUNT` | No | 분석할 최근 경기 수 |
| `GEMINI_MODEL` | No | Gemini 모델명 |
| `GEMINI_TIMEOUT_SECONDS` | No | Gemini 요청 타임아웃 |
| `USE_SAMPLE_ANALYTICS` | No | 샘플 데이터 분석 모드 |
| `DEBUG_HTTP` | No | 외부 HTTP 디버그 로그 |
| `ADMIN_ACCESS_TOKEN` | Recommended | 관리자 로그 콘솔 접근 토큰 |
| `ANALYZE_RATE_LIMIT_MAX` | No | 분석 요청 허용 횟수 |
| `ANALYZE_RATE_LIMIT_WINDOW_SECONDS` | No | 분석 요청 제한 윈도우 |
| `ADMIN_LOGIN_RATE_LIMIT_MAX` | No | 관리자 로그인 허용 횟수 |
| `ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS` | No | 관리자 로그인 제한 윈도우 |
| `RIOT_AUTH_PROVIDER` | No | RSO provider 선택 (`mock` / `real`) |
| `AUTH_SESSION_STORE` | No | 세션 저장소 선택 (`memory` / `db`) |
| `RIOT_AUTH_SESSION_TTL_SECONDS` | No | 내부 로그인 세션 유지 시간(초) |
| `RIOT_AUTH_FLOW_TTL_SECONDS` | No | OAuth state 쿠키 유지 시간(초) |
| `RIOT_AUTH_POST_LOGIN_REDIRECT_URI` | No | 로그인 성공 후 리다이렉트 URI |
| `RIOT_AUTH_POST_LOGOUT_REDIRECT_URI` | No | 로그아웃 후 리다이렉트 URI |
| `RIOT_RSO_CLIENT_ID` | No | Riot RSO 클라이언트 ID |
| `RIOT_RSO_CLIENT_SECRET` | No | Riot RSO 클라이언트 시크릿 |
| `RIOT_RSO_REDIRECT_URI` | No | Riot RSO 콜백 URL |
| `RIOT_RSO_SCOPE` | No | Riot RSO scope |
| `RIOT_RSO_AUTHORIZE_URL` | No | Riot RSO authorize endpoint |
| `RIOT_RSO_TOKEN_URL` | No | Riot RSO token endpoint(향후 real provider용) |
| `MOCK_RIOT_GAME_NAME` | No | mock provider 기본 Riot ID |
| `MOCK_RIOT_TAG_LINE` | No | mock provider 기본 태그 |

## Main Routes

- `/` : 랜딩 페이지
- `/dashboard` : 분석 대시보드
- `/admin/logs` : 관리자 로그 콘솔
- `/api/analysis/result` : theme summary 기반 최종 분석 결과 조회/생성
- `/api/matches/sync` : 내 경기 증분 동기화 실행
- `/api/features/snapshot` : 세션 puuid 기준 feature snapshot 생성/조회
- `/api/features/theme-summary` : feature snapshot 기반 theme feature payload 조회
- `/api/auth/riot/start` : Riot RSO 시작
- `/api/auth/riot/callback` : Riot RSO 콜백
- `/api/auth/session` : 내부 로그인 세션 상태 조회
- `/api/auth/logout` : 내부 로그인 세션 로그아웃

## Security Notes

- `.env`, `.env.local`은 Git에 포함되지 않습니다.
- 예시 환경변수 파일은 `.env.local.example` 하나만 유지합니다.
- 커밋 전 시크릿 검사 스크립트: `npm run security:check`
- pre-commit 훅 사용 시 1회 설정: `git config core.hooksPath .githooks`
- 관리자 로그 콘솔은 `ADMIN_ACCESS_TOKEN` 기반 세션 인증이 필요합니다.
- 로그에 기록되는 API 키, 쿠키, 토큰은 마스킹됩니다.
- 응답 헤더에 `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`를 설정합니다.

## Current Limitations

- `RIOT_AUTH_PROVIDER=real`일 때는 콜백 토큰 교환/사용자 식별 로직이 아직 TODO 상태입니다.
- 실 Riot raw 응답의 round 상세 필드 매핑(`src/server/features/extractor.ts`)은 TODO가 남아 있습니다.
- `AUTH_SESSION_STORE=db`는 세션 스토어 연결부가 아직 TODO 상태이며, 현재 기본은 `memory`입니다.
- 타입 체크는 `typescript` 설치 후 `npx tsc -p tsconfig.json --noEmit`로 검증할 수 있습니다.

## Riot RSO 1단계 이후 직접 해야 하는 작업

1. Riot Developer Portal에 앱 정보를 등록하고 redirect/logout URI를 운영 도메인 기준으로 확정합니다.
1. `.env.local`에 `RIOT_RSO_CLIENT_ID`, `RIOT_RSO_CLIENT_SECRET`, `RIOT_RSO_REDIRECT_URI`를 실제 값으로 입력합니다.
1. `RIOT_AUTH_PROVIDER=real`로 변경하기 전에 `src/server/auth/real-provider.ts`의 TODO(code->token->userinfo/puuid 매핑)를 구현합니다.
1. DB 준비 후 `src/server/auth/session-store.ts`의 `DbAuthSessionStore` TODO(create/get/delete)를 실제 DB adapter로 교체하고 `AUTH_SESSION_STORE=db`로 전환합니다.

## DB 2단계에서 직접 해야 하는 작업

1. `.env.local`에 실제 `DATABASE_URL`을 입력합니다.
1. Prisma 7 기준으로 연결 URL은 `prisma.config.ts`에서 읽습니다.
1. Prisma Client를 생성합니다: `npm run db:generate`
1. 마이그레이션 파일을 생성/적용합니다: `npm run db:migrate:dev -- --name init`
1. 배포 환경에서는 마이그레이션 적용만 실행합니다: `npm run db:migrate:deploy`

## Match Sync 3단계에서 직접 해야 하는 작업

1. DB 마이그레이션이 적용된 상태에서 `RiotAccount` 레코드가 생성되도록 로그인(mock 또는 real)을 먼저 수행합니다.
1. `.env.local`에 `RIOT_API_KEY`를 넣고 `RIOT_MATCH_API_PROVIDER=auto`(또는 `real`)로 `/api/matches/sync`를 검증합니다.
1. Riot API 호출이 차단되면 키 권한(VAL Match 접근 권한/만료)과 rate limit(429)을 먼저 확인합니다.
1. 리전/프록시 환경이 있으면 `RIOT_MATCH_LIST_BASE_URL`, `RIOT_MATCH_DETAIL_BASE_URL`를 운영값으로 조정합니다.

## Feature 4단계에서 직접 확인해야 하는 작업

1. `src/server/features/extractor.ts`의 `TODO(riot-mapping)` 구간에서 Riot 실제 raw round 필드를 `side/won/economyTier/weaponGroup`으로 매핑합니다.
1. 운영 데이터로 `extractAndSaveFeaturesForPlayerFromDb()`를 호출해 `PlayerFeatureSnapshot` 저장 결과를 검증합니다.
1. 샘플 수 기준(confidence target sample)을 운영 기준에 맞게 조정합니다.

## Gemini 6단계에서 직접 해야 하는 작업

1. `.env.local`에 `GEMINI_API_KEY`, `LLM_ANALYSIS_PROVIDER`, `LLM_ANALYSIS_MODEL` 값을 운영 기준으로 입력합니다.
1. real 연동 시 `GEMINI_ANALYSIS_ENDPOINT`, `GEMINI_TIMEOUT_SECONDS`, `LLM_ANALYSIS_MODEL`을 운영 기준으로 조정합니다.
1. 배포 전 캐시 정책을 운영 기준으로 확정하고 `LLM_ANALYSIS_CACHE_TTL_SECONDS`를 조정합니다.
