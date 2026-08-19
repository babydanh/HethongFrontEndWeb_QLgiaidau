'use client';

import { FileText, ShieldAlert } from 'lucide-react';
import { useTranslations } from "next-intl";
import Link from 'next/link';

export default function TermsPage() {
  const t = useTranslations("Terms");

  return (
    <div className="bg-slate-50 min-h-screen py-16 px-4 md:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Block */}
        <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-450">{t("badge")}</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {t("heading")}
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-2">
            {t("lastUpdated")}
          </p>
        </div>

        {/* Content Block */}
        <div className="p-8 md:p-12 space-y-8 text-sm text-slate-650 leading-relaxed font-medium">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              {t("section1")}
            </h2>
            <p>
              {t('intro')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              {t("section2")}
            </h2>
            <p>
              {t('accounts')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              {t("section3")}
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                {t('organizerRules')}
              </li>
              <li>
                {t('athleteRules')}
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              {t("section4")}
            </h2>
            <p>
              {t('payments')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              {t("section5")}
            </h2>
            <p>
              {t('intellectualProperty')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              {t("section6")}
            </h2>
            <p>
              {t('liability')}
            </p>
          </section>

          <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 flex gap-3 text-slate-800 mt-8">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold">{t('warningTitle')}</h4>
              <p className="leading-relaxed font-medium text-amber-800">
                {t('warningBody')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
          <span className="text-slate-450 font-bold">{t('allRightsReserved')}</span>
          <Link
            href="/"
            className="text-blue-650 hover:text-blue-700 font-bold flex items-center gap-1"
          >
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}

