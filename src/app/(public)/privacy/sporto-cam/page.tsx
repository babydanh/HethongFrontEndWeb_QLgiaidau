import React from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('SportOCamPrivacy');
  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  };
}

export default async function SportOCamPrivacyPage() {
  const t = await getTranslations('SportOCamPrivacy');

  const permissions = [
    {
      title: t('permCameraTitle'),
      desc: t('permCameraDesc'),
    },
    {
      title: t('permMicTitle'),
      desc: t('permMicDesc'),
    },
    {
      title: t('permNetworkTitle'),
      desc: t('permNetworkDesc'),
    },
    {
      title: t('permStorageTitle'),
      desc: t('permStorageDesc'),
    },
    {
      title: t('permForegroundTitle'),
      desc: t('permForegroundDesc'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm leading-relaxed text-slate-700">
        {/* Header Block - Clean Editorial without dark gradient slop */}
        <div className="border-b border-slate-200 pb-6 mb-6">
          <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 tracking-wide mb-3">
            {t('badge')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('heading')}
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-2">
            {t('lastUpdated')}
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-sm">
          {/* Intro */}
          <p className="text-slate-600 leading-relaxed font-medium">
            {t('intro')}
          </p>

          {/* Section 1: Permissions */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {t('section1Title')}
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              {t('section1Desc')}
            </p>

            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              {permissions.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50"
                >
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal mt-1.5">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Usage and Storage */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {t('section2Title')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {t('storageLocalTitle')}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('storageLocalDesc')}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {t('storageNoUploadTitle')}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('storageNoUploadDesc')}
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Third-Party Sharing */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {t('section3Title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t('section3Desc')}
            </p>
          </section>

          {/* Section 4: Data Security */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {t('section4Title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t('section4Desc')}
            </p>
          </section>

          {/* Section 5: Children Policy */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {t('section5Title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t('section5Desc')}
            </p>
          </section>

          {/* Section 6: Contact */}
          <section className="space-y-3 pt-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {t('section6Title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              {t('section6Desc')}
            </p>
            <div className="grid gap-3 sm:grid-cols-3 pt-1 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">{t('developerLabel')}</p>
                <p className="text-slate-900 font-bold mt-1">{t('developerValue')}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">{t('emailLabel')}</p>
                <a href={`mailto:${t('emailValue')}`} className="text-blue-600 hover:underline font-bold mt-1 block">
                  {t('emailValue')}
                </a>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">{t('websiteLabel')}</p>
                <a href={t('websiteValue')} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold mt-1 block">
                  {t('websiteValue')}
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 font-medium">{t('allRightsReserved')}</span>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              {t('viewMainPrivacy')}
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('backHome')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
