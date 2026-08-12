import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import RootLayoutClient from "@/components/layout/RootLayoutClient";
import LiveMetricsWidget from "@/components/common/LiveMetricsWidget";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
});

export const metadataBase = new URL('https://sporto.asia');

export const metadata: Metadata = {
  metadataBase: new URL('https://sporto.asia'),
  title: {
    default: "Sporto - Nền tảng Quản lý và Tổ chức Giải đấu Thể thao",
    template: "%s | Sporto",
  },
  description: "Nền tảng tổ chức, quản lý và đăng ký tham gia giải đấu thể thao chuyên nghiệp (Pickleball, Cầu lông, Quần vợt, Bóng bàn, Bóng đá).",
  keywords: ["Sporto", "quản lý giải đấu", "giải đấu pickleball", "tổ chức giải đấu", "bảng xếp hạng ELO", "cầu lông", "quần vợt", "bóng đá"],
  authors: [{ name: "Sporto Team" }],
  creator: "Sporto",
  publisher: "Sporto",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Sporto - Nền tảng Quản lý giải đấu",
    description: "Nền tảng tổ chức và tham gia giải đấu thể thao câu lạc bộ chuyên nghiệp.",
    siteName: "Sporto",
    url: 'https://sporto.asia',
    type: "website",
    locale: "vi_VN",
    images: [
      {
        url: '/sporto_v1\.svg',
        width: 1200,
        height: 630,
        alt: 'Sporto - Nền tảng Quản lý giải đấu',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sporto - Nền tảng Quản lý giải đấu",
    description: "Nền tảng tổ chức và tham gia giải đấu thể thao câu lạc bộ chuyên nghiệp.",
    images: ['/sporto_v1\.svg'],
  },
  icons: {
    icon: [
      { url: '/icon.png?v=2', type: 'image/png' },
      { url: '/favicon.ico?v=2' },
    ],
    shortcut: '/icon.png?v=2',
    apple: '/icon.png?v=2',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: 'Sporto',
    url: 'https://sporto.asia',
    logo: 'https://sporto.asia/sporto_v1\.svg',
    description: 'Nền tảng tổ chức, quản lý và tham gia giải đấu thể thao câu lạc bộ chuyên nghiệp.',
    sameAs: [],
  };

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col text-slate-900">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <RootLayoutClient>{children}</RootLayoutClient>
          <Toaster />
          <LiveMetricsWidget />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

