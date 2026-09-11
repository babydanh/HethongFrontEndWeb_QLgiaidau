import React from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  Camera,
  Mic,
  Wifi,
  HardDrive,
  Cpu,
  ShieldCheck,
  Lock,
  EyeOff,
  Users,
  Mail,
  Globe,
  ArrowLeft,
} from 'lucide-react';
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
      icon: Camera,
      title: t('permCameraTitle'),
      desc: t('permCameraDesc'),
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      icon: Mic,
      title: t('permMicTitle'),
      desc: t('permMicDesc'),
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      icon: Wifi,
      title: t('permNetworkTitle'),
      desc: t('permNetworkDesc'),
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      icon: HardDrive,
      title: t('permStorageTitle'),
      desc: t('permStorageDesc'),
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      icon: Cpu,
      title: t('permForegroundTitle'),
      desc: t('permForegroundDesc'),
      color: 'text-rose-600 bg-rose-50 border-rose-100',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-700">
        {/* Top Header Block */}
        <div className="p-6 sm:p-10 border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-400/30">
              <Camera className="w-3.5 h-3.5" />
              {t('badge')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t('heading')}
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-2">
            {t('lastUpdated')}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-10 space-y-8 text-sm leading-relaxed">
          {/* Intro */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5 text-blue-950 font-medium leading-relaxed">
            {t('intro')}
          </div>

          {/* Section 1: Permissions */}
          <section className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                {t('section1Title')}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                {t('section1Desc')}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {permissions.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 shrink-0 border ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Usage and Storage */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-600" />
              {t('section2Title')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  ✓ {t('storageLocalTitle')}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('storageLocalDesc')}
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  🔒 {t('storageNoUploadTitle')}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('storageNoUploadDesc')}
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Third-Party Sharing */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-indigo-600" />
              {t('section3Title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              {t('section3Desc')}
            </p>
          </section>

          {/* Section 4: Data Security */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-700" />
              {t('section4Title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              {t('section4Desc')}
            </p>
          </section>

          {/* Section 5: Children Policy */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              {t('section5Title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              {t('section5Desc')}
            </p>
          </section>

          {/* Section 6: Contact */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              {t('section6Title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              {t('section6Desc')}
            </p>
            <div className="grid gap-2 sm:grid-cols-3 pt-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">{t('developerLabel')}</p>
                <p className="text-slate-900 font-bold mt-0.5">{t('developerValue')}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-500" />
                  {t('emailLabel')}
                </p>
                <a href={`mailto:${t('emailValue')}`} className="text-blue-600 hover:underline font-bold mt-0.5 block">
                  {t('emailValue')}
                </a>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-500" />
                  {t('websiteLabel')}
                </p>
                <a href={t('websiteValue')} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold mt-0.5 block">
                  {t('websiteValue')}
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 font-semibold">{t('allRightsReserved')}</span>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-slate-600 hover:text-slate-900 font-bold transition-colors"
            >
              {t('viewMainPrivacy')}
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
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
