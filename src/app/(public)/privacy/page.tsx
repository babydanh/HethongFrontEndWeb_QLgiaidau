import React from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Privacy');
  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  };
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("Privacy");

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm leading-relaxed text-slate-700">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 pb-4 border-b border-slate-200">
          {t("heading")}
        </h1>

        <p className="text-xs text-slate-400 font-semibold mb-6">
          {t("lastUpdated")}
        </p>

        <section className="space-y-6 text-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("section1")}</h2>
            <p>
              {t('intro')}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("section2")}</h2>
            <p className="mb-2">
              {t('collectionIntro')}
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li>{t('collectionBasic')}</li>
              <li>{t('collectionLeaderboard')}</li>
              <li>{t('collectionConsent')}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("section3")}</h2>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li>{t('purposeAuth')}</li>
              <li>{t('purposeElo')}</li>
              <li>{t('purposeNotifications')}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("section4")}</h2>
            <p>
              {t('sharing')}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("section5")}</h2>
            <p>
              {t('rights')}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("section6")}</h2>
            <p>
              {t('contactIntro')}
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600 mt-2">
              <li><strong>{t('emailLabel')}</strong>: contact@sporto.asia</li>
              <li><strong>{t('websiteLabel')}</strong>: https://sporto.asia</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

