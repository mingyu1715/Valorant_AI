import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 py-8 sm:px-6 lg:px-10">
      <section className="panel-shell relative overflow-hidden rounded-[36px] px-6 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div className="max-w-4xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.38em] text-cyan-300/90">
              VALORANT AI TACTICAL COACH
            </p>
            <h1 className="font-display text-[4.5rem] leading-[0.84] text-stone-50 sm:text-[5.8rem] lg:text-[7.4rem]">
              RIOT REVIEW READY FULLSTACK PROTOTYPE
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
              Riot 심사용 흐름에 맞춰 Next.js App Router로 정리한 풀스택 프로토타입입니다. 공식 API 호출, RSO
              진입 골격, Gemini 코칭, 보호된 운영 로그 콘솔을 하나의 Node 런타임 안에 묶었습니다.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/api/auth/login"
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-gradient-to-r from-[#ff7b46] to-[#ff4655] px-7 text-sm font-semibold uppercase tracking-[0.24em] text-white shadow-[0_18px_36px_rgba(255,70,85,0.28)] hover:-translate-y-0.5"
              >
                Riot Sign-On
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/10 bg-white/5 px-7 text-sm font-semibold uppercase tracking-[0.24em] text-slate-100 hover:bg-white/8"
              >
                Open Dashboard
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <article className="surface-panel rounded-[28px] p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/90">RSO Skeleton</p>
              <h2 className="font-display text-4xl leading-none text-stone-100">OAuth 2.0 Entry</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                `api/auth/login`, `api/auth/callback`, `public/riot.txt`까지 Riot 승인 절차를 위한 기본 골격이
                포함됩니다.
              </p>
            </article>
            <article className="surface-panel rounded-[28px] p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-rose-300/90">Analysis Pipeline</p>
              <h2 className="font-display text-4xl leading-none text-stone-100">4 Segment Review</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                공수 진영, 경제, 클러치, 유틸리티 효율성을 각각 세분화하고 Gemini가 행동 교정 포인트 3가지를
                섹션별로 반환합니다.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
        <article className="surface-panel rounded-[30px] p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/90">Riot Review</p>
          <h2 className="font-display text-4xl leading-none text-stone-100">Brand-Aligned Dark UI</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            발로란트 감성의 다크 톤, 강한 레드 포인트, 운영 화면용 정보 계층을 갖춘 대시보드 프로토타입입니다.
          </p>
        </article>
        <article className="surface-panel rounded-[30px] p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/90">Node Backend</p>
          <h2 className="font-display text-4xl leading-none text-stone-100">App Router API</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            `app/api/analyze/route.ts` 기준의 Node 런타임 라우트가 계정 조회, 매치 세분화, Gemini 분석을 처리합니다.
          </p>
        </article>
        <article className="surface-panel rounded-[30px] p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/90">Operations</p>
          <h2 className="font-display text-4xl leading-none text-stone-100">Admin Trace Console</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            API 실패, job 오류, 네트워크 예외를 확인할 수 있는 운영 로그 콘솔이 토큰 기반 접근 제어와 함께 제공됩니다.
          </p>
        </article>
      </section>
    </main>
  );
}
