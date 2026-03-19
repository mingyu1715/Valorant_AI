import type { AppLanguage } from "@/src/i18n/config";

const MESSAGES: Record<string, { ko: string; en: string }> = {
  "nav.home": { ko: "홈", en: "Home" },
  "nav.dashboard": { ko: "대시보드", en: "Dashboard" },
  "nav.privacy": { ko: "개인정보처리방침", en: "Privacy Policy" },
  "nav.terms": { ko: "이용약관", en: "Terms of Service" },
  "auth.checkingSession": { ko: "세션 확인 중...", en: "Checking session..." },
  "auth.logout": { ko: "로그아웃", en: "Logout" },
  "auth.riotLogin": { ko: "Riot 로그인", en: "Riot Login" },
  "home.badge": { ko: "VALORANT AI 전술 코치", en: "VALORANT AI Tactical Coach" },
  "home.hero.line1": { ko: "승리를 위한", en: "Built for" },
  "home.hero.line2": { ko: "전략적 통찰", en: "Winning Insights" },
  "home.hero.description": {
    ko: "Riot API와 Gemini AI가 결합된 개인 맞춤형 전술 분석 플랫폼. 당신의 플레이 스타일을 분석하고, 프로급 전략을 제시합니다.",
    en: "A personalized tactical analytics platform powered by Riot API and Gemini AI. Analyze your playstyle and get pro-level strategic guidance."
  },
  "home.startWithRiot": { ko: "Riot 계정으로 시작하기", en: "Start with Riot Account" },
  "home.stats.uptime": { ko: "업타임", en: "Uptime" },
  "home.stats.completed": { ko: "분석 완료", en: "Analyses Completed" },
  "home.stats.response": { ko: "평균 응답시간", en: "Avg Response Time" },
  "home.stats.monitoring": { ko: "모니터링", en: "Monitoring" },
  "home.features.title": { ko: "강력한 분석 엔진", en: "Powerful Analytics Engine" },
  "home.features.subtitle": {
    ko: "최신 AI 기술과 게임 데이터를 결합하여 프로 선수급 인사이트를 제공합니다.",
    en: "Combining modern AI with gameplay data to deliver pro-level insights."
  },
  "home.cta.title": { ko: "지금 바로 시작하세요", en: "Start Now" },
  "home.cta.buttonPrimary": { ko: "무료로 시작하기", en: "Start for Free" },
  "home.cta.buttonSecondary": { ko: "자세히 알아보기", en: "Learn More" },
  "footer.copyright": { ko: "© 2026 VALORANT AI Coach. All rights reserved.", en: "© 2026 VALORANT AI Coach. All rights reserved." },
  "error.title": { ko: "오류가 발생했습니다", en: "Something went wrong" },
  "error.body": { ko: "죄송합니다. 예상치 못한 오류가 발생했습니다.", en: "Sorry, an unexpected error occurred." },
  "error.retry": { ko: "다시 시도", en: "Try Again" },
  "error.backHome": { ko: "홈으로 돌아가기", en: "Back to Home" }
};

export function getMessage(language: AppLanguage, key: string): string {
  const row = MESSAGES[key];
  if (!row) {
    return key;
  }
  return row[language] ?? row.en;
}
