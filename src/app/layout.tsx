import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import RootLayoutClient from "@/components/layout/RootLayoutClient";
import LiveMetricsWidget from "@/components/common/LiveMetricsWidget";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { BRAND } from "@/constants/brand";

const inter = Inter({
  subsets: ["vietnamese", "latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadataBase = new URL(BRAND.domain);

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const tagline = t('tagline');
  const description = t('description');
  const keywords = t.raw('keywords') as string[];
  const title = `${BRAND.name} - ${tagline}`;

  return {
    metadataBase: new URL(BRAND.domain),
    title: {
      default: title,
      template: `%s | ${BRAND.name}`,
    },
    description,
    keywords,
    authors: [{ name: `${BRAND.name} Team` }],
    creator: BRAND.name,
    publisher: BRAND.name,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title,
      description,
      siteName: BRAND.name,
      url: BRAND.domain,
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'vi_VN',
      images: [
        {
          url: BRAND.assets.logo512,
          width: 512,
          height: 512,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [BRAND.assets.logo512],
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
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const [messages, metadataT] = await Promise.all([
    getMessages(),
    getTranslations({ locale, namespace: 'Metadata' }),
  ]);
  const tagline = metadataT('tagline');
  const description = metadataT('description');

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
      description: `${BRAND.name} - ${tagline}. ${description}`,
      sameAs: [],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: BRAND.name,
      alternateName: `${BRAND.name} - ${tagline}`,
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
