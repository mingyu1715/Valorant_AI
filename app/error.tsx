'use client';

import { useEffect } from 'react';

import { useLanguage } from "@/components/language-provider";
import { withLanguagePrefix } from "@/src/i18n/config";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { language, prefix, tr } = useLanguage();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {tr("error.title")}
          </h1>
          <p className="text-gray-400 text-sm">
            {tr("error.body")}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-4 rounded-md transition-colors"
          >
            {tr("error.retry")}
          </button>

          <button
            onClick={() => {
              window.location.href = withLanguagePrefix("/", prefix);
            }}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-md transition-colors"
          >
            {tr("error.backHome")}
          </button>
        </div>

        {/* Detailed error info hidden from users */}
        {false && (
          <details className="mt-6 text-left">
            <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
              {language === "en" ? "Developer Details (click to expand)" : "개발자 정보 (클릭하여 펼치기)"}
            </summary>
            <pre className="mt-2 text-xs text-red-400 bg-gray-900 p-3 rounded overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
