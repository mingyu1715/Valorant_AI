import Image from "next/image";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function PrivacyPage() {
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300/90">Policy</p>
              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">개인정보처리방침 / Privacy Policy</h1>
            </div>
          </div>
          <p className="text-sm text-slate-300">
            시행일(Effective Date): 2026-03-18 | 최종 업데이트(Last Updated): 2026-03-18
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            본 문서는 서비스 이용자에게 개인정보 처리 기준을 투명하게 안내하기 위해 작성되었습니다. 한국어와
            영어 버전을 함께 제공하며, 해석상 차이가 있는 경우 한국어 본문을 우선으로 적용합니다.
          </p>
        </section>

        <section className="mt-8 rounded-3xl border border-gray-700/50 bg-gray-900/55 p-6 backdrop-blur-sm sm:p-8">
          <h2 className="text-2xl font-semibold">한국어 (Korean)</h2>

          <article className="mt-6 space-y-5 text-sm leading-7 text-slate-300">
            <div>
              <h3 className="text-lg font-semibold text-stone-100">1. 개인정보 처리자 및 연락처</h3>
              <p>
                서비스명은 VALORANT AI Coach이며, 개인정보 관련 문의를 위해 아래 창구를 운영합니다. 일반 문의와
                보안 사고 신고를 분리 접수하며, 접수된 요청은 신원 확인 후 처리됩니다.
              </p>
              <p>
                문의 이메일: privacy@valorant-ai-coach.com / 보안 신고: security@valorant-ai-coach.com
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">2. 수집하는 개인정보 항목</h3>
              <p>
                서비스는 Riot 계정 기반 인증 흐름에서 필요한 최소 정보만 처리합니다. 수집 또는 생성될 수 있는 항목은
                (1) 계정 식별값(예: Riot 계정명, 태그, 내부 식별자), (2) 세션 식별값 및 인증 상태 정보,
                (3) 서비스 이용 로그(요청 시간, 응답 코드, 오류 코드, 사용자 에이전트, IP 일부 마스킹 정보),
                (4) 문의 응대 기록입니다.
              </p>
              <p>
                결제정보, 주민등록번호 등 고유식별정보는 수집하지 않으며, 민감정보를 의도적으로 요구하지 않습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">3. 개인정보 처리 목적</h3>
              <p>
                수집한 정보는 인증 세션 유지, 계정 도용 방지, 분석 결과 제공, 서비스 안정성 모니터링, 장애 분석,
                보안 이벤트 대응, 법적 의무 이행 목적으로만 사용합니다. 위 목적 외 사용이 필요한 경우 사전 고지 후
                관련 법령에 따라 별도 동의를 받습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">4. 보유 및 이용 기간</h3>
              <p>
                인증 세션 정보는 세션 만료 또는 로그아웃 시까지 보관합니다. 운영 로그는 보안 및 장애 분석을 위해
                일반적으로 최대 90일 보관하며, 법령상 보존 의무가 있는 경우 해당 기간 동안 분리 보관합니다. 보관
                기간이 종료되면 복구 불가능한 방식으로 지체 없이 파기합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">5. 쿠키 및 세션 사용</h3>
              <p>
                서비스는 로그인 상태 유지와 요청 위변조 방지를 위해 HttpOnly, Secure, SameSite 속성을 갖춘 세션
                쿠키를 사용할 수 있습니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우
                로그인 기반 기능 일부가 제한될 수 있습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">6. 제3자 제공 및 처리 위탁</h3>
              <p>
                서비스는 인증을 위해 Riot Games의 인증 시스템을 이용할 수 있으며, 인프라 운영을 위해 호스팅,
                모니터링, 로그 관리 도구를 사용할 수 있습니다. 이용자의 개인정보를 판매하지 않으며, 법령 근거 또는
                이용자 요청이 없는 한 제3자에게 임의 제공하지 않습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">7. 국외 이전 가능성</h3>
              <p>
                클라우드 인프라 및 외부 인증 서비스 특성상 정보가 국외 데이터센터에서 처리될 수 있습니다. 이 경우
                관련 법령이 요구하는 보호조치를 적용하고, 전송 구간 암호화 및 접근 통제를 유지합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">8. 이용자의 권리와 행사 방법</h3>
              <p>
                이용자는 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지, 동의 철회를 요청할 수 있습니다.
                요청은 이메일 접수 후 본인 확인 절차를 거쳐 처리하며, 법령상 예외 사유가 없는 한 지체 없이
                조치합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">9. 아동의 개인정보</h3>
              <p>
                서비스는 관련 법령이 정한 연령 미만 아동을 주된 대상으로 설계하지 않습니다. 필요 시 연령 확인 및
                법정대리인 동의 절차를 요청할 수 있으며, 요건을 충족하지 못한 계정은 이용이 제한될 수 있습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">10. 보안 조치</h3>
              <p>
                서비스는 접근권한 최소화, 비밀번호/토큰 비노출 정책, 전송 구간 암호화, 관리자 접근 통제, 보안 로그
                모니터링, 비정상 요청 탐지 등 합리적이고 기술적인 보호조치를 적용합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">11. 정책 변경</h3>
              <p>
                정책이 변경되는 경우 시행일 이전에 서비스 화면 또는 공지사항을 통해 안내합니다. 중요한 변경은
                변경 사유와 적용 일자를 함께 명시합니다.
              </p>
            </div>
          </article>
        </section>

        <section className="mt-8 rounded-3xl border border-gray-700/50 bg-gray-900/55 p-6 backdrop-blur-sm sm:p-8">
          <h2 className="text-2xl font-semibold">English</h2>

          <article className="mt-6 space-y-5 text-sm leading-7 text-slate-300">
            <div>
              <h3 className="text-lg font-semibold text-stone-100">1. Data Controller and Contact</h3>
              <p>
                This Privacy Policy applies to VALORANT AI Coach. We maintain dedicated channels for privacy and
                security inquiries. Requests are processed after reasonable identity verification.
              </p>
              <p>
                Privacy: privacy@valorant-ai-coach.com | Security: security@valorant-ai-coach.com
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">2. Categories of Data We Process</h3>
              <p>
                We process only the minimum data necessary for authentication and service delivery, which may include:
                (a) account identifiers (for example Riot account name, tag, internal identifier), (b) session identifiers
                and authentication status, (c) operational logs (request time, response code, error code, user agent,
                partially masked IP information), and (d) support communication records.
              </p>
              <p>
                We do not intentionally collect national ID numbers, payment card data, or special categories of personal
                data.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">3. Purposes of Processing</h3>
              <p>
                We process personal data to operate login sessions, prevent account abuse, deliver gameplay analytics,
                monitor service quality, troubleshoot incidents, respond to security events, and comply with legal
                obligations. If additional uses are required, we provide prior notice and obtain consent where legally
                required.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">4. Retention</h3>
              <p>
                Session data is retained until logout or session expiration. Operational logs are generally retained for up
                to 90 days for security and reliability purposes, unless a longer retention period is required by law.
                Data is deleted or irreversibly destroyed when retention is no longer necessary.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">5. Cookies and Session Technologies</h3>
              <p>
                We may use session cookies with HttpOnly, Secure, and SameSite attributes to maintain authenticated
                sessions and reduce request forgery risk. You may disable cookies in your browser, but some authenticated
                features may not function correctly.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">6. Sharing and Processors</h3>
              <p>
                We may rely on Riot authentication services and infrastructure providers for hosting, monitoring, and log
                processing. We do not sell personal data. We disclose data to third parties only when required for service
                operation, compliance, or at your direction.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">7. International Transfers</h3>
              <p>
                Due to cloud and authentication infrastructure, data may be processed in jurisdictions outside your country.
                We apply safeguards such as access control, encrypted transport, and contractual protections where
                applicable.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">8. Your Rights</h3>
              <p>
                Subject to applicable law, you may request access, correction, deletion, restriction, objection, and
                withdrawal of consent. We will respond within legally required timelines and may request additional
                information to verify identity.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">9. Children</h3>
              <p>
                The Service is not designed for young children as a primary audience. Where required, we may request
                guardian consent and limit access if legal conditions are not satisfied.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">10. Security Measures</h3>
              <p>
                We implement reasonable technical and organizational safeguards, including least-privilege access,
                credential protection, encrypted transport, administrative controls, and security event monitoring.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-stone-100">11. Policy Changes</h3>
              <p>
                We may update this Policy from time to time. Material changes will be announced before they become
                effective, together with the effective date and key revisions.
              </p>
            </div>
          </article>
        </section>
      </main>

      <SiteFooter className="relative z-10 border-t border-gray-800/80 bg-black/30" />
    </div>
  );
}
