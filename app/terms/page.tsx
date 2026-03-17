import Image from "next/image";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function TermsPage() {
  return (
    <div className="app-page-shell text-stone-100">
      <div className="app-page-bg" />
      <SiteHeader />

      <main className="relative z-10 mx-auto w-full max-w-5xl px-6 py-10 sm:px-8 lg:px-10">
        <section className="rounded-3xl border border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 backdrop-blur-sm sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center justify-center rounded-xl bg-amber-50/95 p-2 ring-1 ring-amber-100/60">
              <Image src="/logo.svg" alt="VALORANT AI Coach 로고" width={34} height={26} className="h-6 w-auto" priority />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300/90">Terms</p>
              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">이용약관 / Terms of Service</h1>
            </div>
          </div>
          <p className="text-sm text-slate-300">
            시행일(Effective Date): 2026-03-18 | 최종 업데이트(Last Updated): 2026-03-18
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            본 약관은 VALORANT AI Coach 서비스 이용에 관한 기본 조건을 규정합니다. 한국어와 영어 버전을 함께
            제공하며, 해석 충돌 시 한국어 약관을 우선합니다.
          </p>
        </section>

        <section className="mt-8 rounded-3xl border border-gray-700/50 bg-gray-900/55 p-6 backdrop-blur-sm sm:p-8">
          <h2 className="text-2xl font-semibold">한국어 (Korean)</h2>

          <article className="mt-6 space-y-5 text-sm leading-7 text-slate-300">
            <div>
              <h3 className="text-lg font-semibold text-stone-100">1. 약관 동의 및 적용</h3>
              <p>
                이용자는 서비스를 이용함으로써 본 약관 및 관련 운영정책에 동의한 것으로 봅니다. 서비스 운영자는
                관련 법령 범위 내에서 약관을 개정할 수 있으며, 중요한 변경은 시행 전에 공지합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">2. 서비스 내용</h3>
              <p>
                서비스는 Riot 연동 정보를 바탕으로 전적 분석, 대시보드 시각화, 운영 로그 관리 기능을 제공합니다.
                일부 기능은 베타 상태일 수 있으며, 정확도·가용성·지속 제공이 항상 보장되지는 않습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">3. 계정 및 인증</h3>
              <p>
                로그인은 Riot 인증(RSO)을 통해 처리될 수 있으며, 이용자는 자신의 계정 정보를 안전하게 관리해야
                합니다. 계정 도용 또는 무단 접근이 의심되는 경우 즉시 운영자에게 신고해야 합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">4. 이용자의 의무</h3>
              <p>
                이용자는 법령 및 공서양속에 반하는 행위, 서비스 장애를 유발하는 자동화 남용, 역공학·무단 스크래핑,
                타인의 권리 침해, 허위 정보 유포를 해서는 안 됩니다. 위반 시 사전 통지 없이 이용이 제한될 수 있습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">5. 금지 행위</h3>
              <p>
                비인가 API 호출, 보안 취약점 악용, 관리자 기능 우회 시도, 악성 트래픽 유발, 저작권 침해 자료 등록은
                금지됩니다. 운영자는 보안 보호를 위해 해당 행위를 기록하고 필요한 조치를 취할 수 있습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">6. 지식재산권</h3>
              <p>
                서비스의 소스코드, UI, 문서, 상표, 로고를 포함한 저작물의 권리는 운영자 또는 정당한 권리자에게
                귀속됩니다. 이용자는 사전 서면 동의 없이 이를 복제·배포·2차적 저작물로 이용할 수 없습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">7. 외부 서비스 및 데이터</h3>
              <p>
                서비스는 Riot API 및 제3자 인프라에 의존할 수 있습니다. 외부 서비스 정책 변경, 장애, 중단에 따라
                서비스 일부가 제한될 수 있으며, 해당 외부 서비스의 이용약관이 병행 적용될 수 있습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">8. 서비스 변경 및 중단</h3>
              <p>
                운영자는 안정적 운영을 위해 기능을 추가·수정·중단할 수 있으며, 계획된 중단은 사전 공지합니다.
                긴급 보안 대응이나 장애 복구가 필요한 경우 사후 공지로 갈음할 수 있습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">9. 면책</h3>
              <p>
                서비스가 제공하는 분석 결과는 참고용 정보이며, 경기 성적 향상이나 특정 결과를 보장하지 않습니다.
                이용자는 자신의 판단과 책임 하에 서비스를 사용해야 합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">10. 책임 제한</h3>
              <p>
                법령이 허용하는 범위에서 운영자는 간접·특별·결과적 손해에 대해 책임을 부담하지 않습니다. 단, 고의
                또는 중대한 과실에 의한 손해는 관련 법령에 따라 처리합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">11. 약관 위반 및 해지</h3>
              <p>
                본 약관 위반, 보안 위협 행위, 부정 사용이 확인되면 계정 제한 또는 서비스 접근 차단이 이뤄질 수
                있습니다. 이용자는 언제든지 이용을 중단할 수 있으며, 별도 요청 시 관련 법령 범위에서 데이터 삭제를
                신청할 수 있습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">12. 준거법 및 분쟁</h3>
              <p>
                본 약관은 대한민국 법령을 준거법으로 하며, 관련 분쟁은 관할 법원 또는 관련 법령에서 정한 절차에
                따릅니다.
              </p>
              <p>문의: legal@valorant-ai-coach.com</p>
            </div>
          </article>
        </section>

        <section className="mt-8 rounded-3xl border border-gray-700/50 bg-gray-900/55 p-6 backdrop-blur-sm sm:p-8">
          <h2 className="text-2xl font-semibold">English</h2>

          <article className="mt-6 space-y-5 text-sm leading-7 text-slate-300">
            <div>
              <h3 className="text-lg font-semibold text-stone-100">1. Acceptance and Scope</h3>
              <p>
                By accessing or using VALORANT AI Coach, you agree to these Terms and related policies. We may update
                these Terms as permitted by applicable law, and material changes will be announced before they take
                effect.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">2. Service Description</h3>
              <p>
                The Service provides gameplay analytics, dashboard insights, and administrative operations support using
                Riot-connected data. Certain features may be experimental and may change without prior notice.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">3. Accounts and Authentication</h3>
              <p>
                Authentication may be processed through Riot Sign-On (RSO). You are responsible for safeguarding your
                account credentials and for activities occurring under your authenticated session.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">4. User Responsibilities</h3>
              <p>
                You must comply with applicable laws and must not interfere with service stability, abuse automation,
                reverse engineer protected components, scrape unauthorized data, or infringe third-party rights.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">5. Prohibited Conduct</h3>
              <p>
                Prohibited conduct includes unauthorized API use, exploitation of vulnerabilities, bypass attempts against
                admin controls, abusive traffic generation, and upload/distribution of infringing or malicious content.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">6. Intellectual Property</h3>
              <p>
                All software, design assets, documentation, trademarks, and logos are owned by the operator or respective
                rights holders. No license is granted except as strictly necessary to use the Service under these Terms.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">7. Third-Party Dependencies</h3>
              <p>
                The Service may depend on Riot APIs and third-party cloud infrastructure. Availability may be affected by
                external provider outages, policy changes, or rate limits outside our direct control.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">8. Changes and Suspension</h3>
              <p>
                We may modify, suspend, or discontinue parts of the Service for maintenance, security, or operational
                reasons. Planned disruptions will be announced when reasonably possible.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">9. Disclaimer</h3>
              <p>
                Analytics and coaching outputs are provided for informational purposes only and do not guarantee specific
                gameplay outcomes, ranking improvements, or performance gains.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">10. Limitation of Liability</h3>
              <p>
                To the maximum extent permitted by law, we are not liable for indirect, incidental, special, or
                consequential damages. Nothing in these Terms limits liability where such limitation is prohibited by law.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">11. Termination</h3>
              <p>
                We may restrict or terminate access if you violate these Terms, create security risk, or misuse the
                Service. You may stop using the Service at any time.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">12. Governing Law and Contact</h3>
              <p>
                These Terms are governed by the laws of the Republic of Korea, unless mandatory local law requires
                otherwise. For legal inquiries: legal@valorant-ai-coach.com
              </p>
            </div>
          </article>
        </section>
      </main>

      <SiteFooter className="relative z-10 border-t border-gray-800/80 bg-black/30" />
    </div>
  );
}
