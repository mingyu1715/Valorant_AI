import type { Metadata } from "next";

import { LanguageProvider } from "@/components/language-provider";
import { getServerLanguageContext } from "@/src/server/i18n/request";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "VALORANT AI 전술 코치",
  description: "Riot API와 Gemini를 기반으로 한 VALORANT 맞춤형 전술 분석 대시보드"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { lang, prefix } = await getServerLanguageContext();

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className="min-h-screen bg-[#07090d] text-stone-100 antialiased">
        <LanguageProvider initialLanguage={lang} initialPrefix={prefix}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
