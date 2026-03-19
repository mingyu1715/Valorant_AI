"use client";

import Image from "next/image";

import { LocalizedLink } from "@/components/localized-link";
import { t, useLanguage } from "@/components/language-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  const { language, tr } = useLanguage();

  return (
    <div className="app-page-shell">
      <div className="app-page-bg" />
      <SiteHeader hideDashboardLink />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="mb-8">
              <span className="inline-flex items-center rounded-full bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 ring-1 ring-red-500/20">
                <Image
                  src="/logo.svg"
                  alt={t(language, { ko: "서비스 로고", en: "Service logo" })}
                  width={20}
                  height={16}
                  className="mr-2 h-4 w-auto rounded-sm bg-amber-50/90 p-0.5"
                />
                {tr("home.badge")}
              </span>
            </div>

            <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl lg:text-8xl">
              <span className="block">{tr("home.hero.line1")}</span>
              <span className="block bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                {tr("home.hero.line2")}
              </span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-xl leading-8 text-gray-300">
              {tr("home.hero.description")}
            </p>

            <div className="mt-12 flex items-center justify-center">
              <LocalizedLink
                href="/api/auth/riot/start"
                className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-red-500/25 transition-all duration-200 hover:shadow-red-500/40 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
                {tr("home.startWithRiot")}
              </LocalizedLink>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-red-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </section>

      {/* Stats Section */}
      <section className="relative px-6 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-red-400 mb-2">99.9%</div>
              <div className="text-sm text-gray-400 uppercase tracking-wide">{tr("home.stats.uptime")}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">10K+</div>
              <div className="text-sm text-gray-400 uppercase tracking-wide">{tr("home.stats.completed")}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">50ms</div>
              <div className="text-sm text-gray-400 uppercase tracking-wide">{tr("home.stats.response")}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">24/7</div>
              <div className="text-sm text-gray-400 uppercase tracking-wide">{tr("home.stats.monitoring")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white sm:text-5xl mb-4">
              {tr("home.features.title")}
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {tr("home.features.subtitle")}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 backdrop-blur-sm border border-gray-700/50 hover:border-red-500/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{t(language, { ko: "실시간 분석", en: "Real-time Analysis" })}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {t(language, {
                    ko: "최신 매치 데이터를 실시간으로 분석하여 즉각적인 피드백을 제공합니다. 당신의 플레이가 어떻게 평가되는지 바로 확인하세요.",
                    en: "Analyze recent match data in real time and get immediate feedback. See how your gameplay is evaluated instantly."
                  })}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 backdrop-blur-sm border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{t(language, { ko: "AI 코칭", en: "AI Coaching" })}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {t(language, {
                    ko: "Gemini AI가 당신의 플레이를 심층 분석하고 맞춤형 전략을 제안합니다. 프로 선수들의 플레이 패턴을 학습한 AI 코치입니다.",
                    en: "Gemini AI deeply analyzes your play and suggests personalized strategy. It learns from pro-level play patterns."
                  })}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 backdrop-blur-sm border border-gray-700/50 hover:border-green-500/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{t(language, { ko: "상세 통계", en: "Detailed Metrics" })}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {t(language, {
                    ko: "공수 진영, 경제, 클러치 상황 등 세부적인 통계를 제공합니다. 데이터 기반으로 당신의 강점과 약점을 정확히 파악하세요.",
                    en: "Get detailed metrics for attack/defense, economy, and clutch situations. Identify strengths and weaknesses with data."
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="text-center rounded-3xl bg-gradient-to-r from-red-600/20 via-orange-600/20 to-yellow-600/20 p-12 backdrop-blur-sm border border-red-500/20">
            <h2 className="text-4xl font-bold text-white mb-6">
              {tr("home.cta.title")}
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              {t(language, {
                ko: "VALORANT AI 전술 코치로 당신의 게임을 한 단계 업그레이드하세요. 프로 선수들의 전략을 당신의 것으로 만드세요.",
                en: "Level up your gameplay with VALORANT AI Tactical Coach. Make pro strategies your own."
              })}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <LocalizedLink
                href="/api/auth/riot/start"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-red-500/25 transition-all duration-200 hover:shadow-red-500/40 hover:scale-105"
              >
                {tr("home.cta.buttonPrimary")}
              </LocalizedLink>
              <LocalizedLink
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-gray-600 bg-gray-800/50 px-8 py-4 text-lg font-semibold text-gray-300 backdrop-blur-sm transition-all duration-200 hover:bg-gray-700/50 hover:border-gray-500"
              >
                {tr("home.cta.buttonSecondary")}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
