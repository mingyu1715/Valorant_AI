# VALORANT AI Tactical Coach

Riot API와 Gemini를 이용해 최근 VALORANT 경기 데이터를 수집하고, 공수 운영, 경제, 클러치, 유틸리티 효율을 섹션별로 분석하는 Next.js 기반 프로토타입입니다.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Riot Account API / VAL Match API
- Google Gemini API

## Features

- Riot ID와 Tag 입력 기반 분석 요청
- 최근 경기 수집 후 4개 세그먼트 분석
- Gemini 기반 행동 교정 피드백 3개 생성
- Riot RSO 로그인 진입점 뼈대 포함
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
      login/          Riot RSO 시작
      callback/       Riot RSO 콜백
  dashboard/          분석 대시보드
components/           대시보드 및 운영 UI
src/server/           Riot, Gemini, 분석 파이프라인 로직
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
- `GEMINI_API_KEY`
- `ADMIN_ACCESS_TOKEN`
- `RIOT_RSO_CLIENT_ID`
- `RIOT_RSO_REDIRECT_URI`

4. 개발 서버 실행

```bash
npm run dev
```

기본 주소는 `http://localhost:3000` 입니다.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `RIOT_API_KEY` | Yes | Riot API 키 |
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
| `RIOT_RSO_CLIENT_ID` | No | Riot RSO 클라이언트 ID |
| `RIOT_RSO_REDIRECT_URI` | No | Riot RSO 콜백 URL |
| `RIOT_RSO_SCOPE` | No | Riot RSO scope |

## Main Routes

- `/` : 랜딩 페이지
- `/dashboard` : 분석 대시보드
- `/admin/logs` : 관리자 로그 콘솔
- `/api/analyze` : 분석 작업 생성 및 상태 조회
- `/api/auth/login` : Riot RSO 시작
- `/api/auth/callback` : Riot RSO 콜백

## Security Notes

- `.env`, `.env.local`은 Git에 포함되지 않습니다.
- 관리자 로그 콘솔은 `ADMIN_ACCESS_TOKEN` 기반 세션 인증이 필요합니다.
- `/api/analyze`는 IP 기준 rate limit이 적용됩니다.
- 로그에 기록되는 API 키, 쿠키, 토큰은 마스킹됩니다.
- 응답 헤더에 `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`를 설정합니다.

## Current Limitations

- Riot RSO는 로그인 진입과 콜백 검증 뼈대만 구현되어 있습니다.
- 실제 운영 전에는 토큰 교환, PKCE, 사용자 세션 연동이 추가로 필요합니다.
- 타입 체크는 `typescript` 설치 후 `npx tsc -p tsconfig.json --noEmit`로 검증할 수 있습니다.
