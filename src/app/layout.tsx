import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import RootLayoutClient from "@/components/layout/RootLayoutClient";
import LiveMetricsWidget from "@/components/common/LiveMetricsWidget";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { BRAND } from "@/constants/brand";

const inter = Inter({
  subsets: ["vietnamese", "latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadataBase = new URL(BRAND.domain);

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.domain),
  title: {
    default: `${BRAND.name} - ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: "Nền tảng tổ chức, quản lý và đăng ký tham gia giải đấu thể thao chuyên nghiệp (Pickleball, Cầu lông, Quần vợt, Bóng bàn, Bóng đá).",
  keywords: [BRAND.name, "quản lý giải đấu", "giải đấu pickleball", "tổ chức giải đấu", "bảng xếp hạng ELO", "cầu lông", "quần vợt", "bóng đá"],
  authors: [{ name: `${BRAND.name} Team` }],
  creator: BRAND.name,
  publisher: BRAND.name,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${BRAND.name} - ${BRAND.tagline}`,
    description: "Nền tảng tổ chức và tham gia giải đấu thể thao câu lạc bộ chuyên nghiệp.",
    siteName: BRAND.name,
    url: BRAND.domain,
    type: "website",
    locale: "vi_VN",
    images: [
      {
        url: BRAND.assets.logoIcon,
        width: 1200,
        height: 630,
        alt: `${BRAND.name} - Nền tảng Quản lý giải đấu`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} - ${BRAND.tagline}`,
    description: "Nền tảng tổ chức và tham gia giải đấu thể thao câu lạc bộ chuyên nghiệp.",
    images: [BRAND.assets.logoIcon],
  },
  icons: {
    icon: [
      { url: BRAND.assets.favicon, sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: BRAND.assets.logo512, type: 'image/png', sizes: '512x512' },
      { url: BRAND.assets.logoIcon, type: 'image/svg+xml' },
    ],
    shortcut: [
      { url: BRAND.assets.favicon },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: BRAND.assets.appleTouchIcon, sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  const structuredSchemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'SportsOrganization',
      name: BRAND.name,
      alternateName: `${BRAND.name} Asia`,
      url: BRAND.domain,
      logo: {
        '@type': 'ImageObject',
        url: 'https://sporto.asia/sporto_512.png',
        width: '512',
        height: '512',
      },
      image: 'https://sporto.asia/sporto_1024.png',
      description: `${BRAND.name} - ${BRAND.tagline}. Nền tảng tổ chức và tham gia giải đấu thể thao chuyên nghiệp.`,
      sameAs: [],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: BRAND.name,
      alternateName: `${BRAND.name} - ${BRAND.tagline}`,
      url: BRAND.domain,
    },
  ];

  return (
    <html lang={locale} className={`h-full antialiased ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="512x512" />
        <link rel="icon" href="/sporto_512.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/manifest.webmanifest" />
        {structuredSchemas.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body className={`min-h-full flex flex-col text-slate-900 font-sans ${inter.className}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <RootLayoutClient>{children}</RootLayoutClient>
          <Toaster />
          <LiveMetricsWidget />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
