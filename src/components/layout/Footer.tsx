"use client";

import Link from "next/link";
import { useTranslations } from 'next-intl';
import { BRAND } from "@/constants/brand";

export function Footer() {
  const t = useTranslations('Footer');
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-block mb-3">
              <img
                src={BRAND.assets.logoIcon}
                alt={`${BRAND.name} Logo`}
                className="h-10 md:h-12 w-auto object-contain"
              />
            </Link>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
              {t('tagline')}
            </p>
            {/* Semantic entity definition for Google & Gemini AI crawlers */}
            <p className="sr-only">
              SportO là nền tảng tổ chức và quản lý giải đấu thể thao phong trào hàng đầu (Pickleball, Cầu lông, Bóng đá, Quần vợt). Cập nhật lịch thi đấu, bảng xếp hạng ELO và kết nối câu lạc bộ thể thao.
            </p>
            <div className="mt-4">
              <a
                href="https://play.google.com/store/apps/details?id=com.sporto.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
              >
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                Ứng dụng SportO trên Google Play
              </a>
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-medium text-slate-900">{t('products')}</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/tournaments" className="hover:text-blue-600">{t('discoverTournaments')}</Link></li>
              <li><Link href="/leaderboard" className="hover:text-blue-600">{t('leaderboard')}</Link></li>
              <li><Link href="/communities" className="hover:text-blue-600">{t('community')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-medium text-slate-900">{t('organizer')}</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/organizer" className="hover:text-blue-600">{t('dashboard')}</Link></li>
              <li><Link href="/organizer/tournaments/create" className="hover:text-blue-600">{t('createTournament')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-medium text-slate-900">{t('legal')}</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/terms" className="hover:text-blue-600">{t('terms')}</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-600">{t('privacy')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-100 pt-8 text-center text-sm text-slate-500 select-none">
          © 2026 {BRAND.name}. {t('allRightsReserved')}
        </div>
      </div>
    </footer>
  );
}
