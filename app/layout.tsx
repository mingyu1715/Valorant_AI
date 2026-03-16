import type { Metadata } from "next";
import { IBM_Plex_Sans_KR, Teko } from "next/font/google";

import "@/app/globals.css";

const bodyFont = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body"
});

const displayFont = Teko({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "VALORANT AI Tactical Coach",
  description: "Riot API와 Gemini를 기반으로 한 VALORANT 맞춤형 전술 분석 대시보드"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${displayFont.variable} min-h-screen bg-[#07090d] text-stone-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
