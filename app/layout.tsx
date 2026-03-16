import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "VALORANT AI 전술 코치",
  description: "Riot API와 Gemini를 기반으로 한 VALORANT 맞춤형 전술 분석 대시보드"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-[#07090d] text-stone-100 antialiased">
        {children}
      </body>
    </html>
  );
}
