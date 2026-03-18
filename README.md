# VALORANT AI Tactical Coach

Riot API와 Gemini를 이용해 최근 VALORANT 경기 데이터를 수집하고, 공수 운영, 경제, 클러치, 유틸리티 효율을 섹션별로 분석하는 Next.js 기반 프로토타입입니다.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma ORM
- Riot Account API / VAL Match API
- Google Gemini API

## Features

- Riot ID와 Tag 입력 기반 분석 요청
- 최근 경기 수집 후 4개 세그먼트 분석
- Gemini 기반 행동 교정 피드백 3개 생성
- Riot RSO mock/real provider 분리 + 내부 세션 발급 골격
- RiotAccount(puuid) 기반 최근 match 증분 sync 골격 (mock/real client 분리)
- 관리자 토큰 기반 운영 로그 콘솔
- 분석 요청 rate limit 및 민감 로그 마스킹

## Project Structure

```text
app/
  api/
    analyze/          분석 작업 생성 및 조회
    admin/
      logs/           보호된 운영 로그 API
      session/        관리자 세션 생성/해제
    auth/
      login/          레거시 진입점 (riot/start로 리다이렉트)
      callback/       레거시 콜백 (riot/callback로 리다이렉트)
      riot/
        start/        Riot RSO 시작 (mock/real provider)
        callback/     Riot RSO 콜백 + 내부 세션 발급
      logout/         내부 세션 로그아웃
      session/        현재 로그인 세션 조회
    matches/
      sync/           내 경기 증분 동기화
  dashboard/          분석 대시보드
components/           대시보드 및 운영 UI
src/server/           Riot, Gemini, 분석 파이프라인 로직
src/server/auth/      RSO provider, 세션 저장소 추상화, 쿠키 헬퍼
src/server/db/        Prisma client + repository 골격
src/server/match-sync/ match sync service + mock/real Riot API client
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
- `RIOT_MATCH_API_PROVIDER` (`mock` 또는 `real`, 기본 `mock`)
- `GEMINI_API_KEY`
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

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | DB 사용 시 필수 | Prisma 연결 문자열 |
| `RIOT_API_KEY` | Yes | Riot API 키 |
| `RIOT_MATCH_API_PROVIDER` | No | match sync API client 선택 (`mock` / `real`) |
| `RIOT_MATCH_SYNC_MAX_IDS` | No | 한 번에 동기화할 최대 match id 수 |
| `RIOT_MATCH_LIST_BASE_URL` | No | Real client용 matchlist base URL |
| `RIOT_MATCH_DETAIL_BASE_URL` | No | Real client용 match detail base URL |
| `GEMINI_API_KEY` | Yes | Gemini API 키 |
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
- `/api/analyze` : 분석 작업 생성 및 상태 조회
- `/api/matches/sync` : 내 경기 증분 동기화 실행
- `/api/auth/riot/start` : Riot RSO 시작
- `/api/auth/riot/callback` : Riot RSO 콜백
- `/api/auth/session` : 내부 로그인 세션 상태 조회
- `/api/auth/logout` : 내부 로그인 세션 로그아웃
- `/api/auth/login` : 레거시 로그인 진입점(리다이렉트)
- `/api/auth/callback` : 레거시 콜백 진입점(리다이렉트)

## Security Notes

- `.env`, `.env.local`은 Git에 포함되지 않습니다.
- 예시 환경변수 파일은 `.env.local.example` 하나만 유지합니다.
- 커밋 전 시크릿 검사 스크립트: `npm run security:check`
- pre-commit 훅 사용 시 1회 설정: `git config core.hooksPath .githooks`
- 관리자 로그 콘솔은 `ADMIN_ACCESS_TOKEN` 기반 세션 인증이 필요합니다.
- `/api/analyze`는 IP 기준 rate limit이 적용됩니다.
- 로그에 기록되는 API 키, 쿠키, 토큰은 마스킹됩니다.
- 응답 헤더에 `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`를 설정합니다.

## Current Limitations

- `RIOT_AUTH_PROVIDER=real`일 때는 콜백 토큰 교환/사용자 식별 로직이 아직 TODO 상태입니다.
- `RIOT_MATCH_API_PROVIDER=real`일 때 Riot match list/detail 호출은 아직 TODO 상태입니다.
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
