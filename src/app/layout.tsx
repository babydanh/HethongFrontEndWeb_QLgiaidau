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

export const metadata: Metadata = {
  title: "VNDC Sport - Nền tảng Quản lý giải đấu",
  description: "Nền tảng tổ chức và tham gia giải đấu thể thao câu lạc bộ.",
  openGraph: {
    title: "VNDC Sport - Nền tảng Quản lý giải đấu",
    description: "Nền tảng tổ chức và tham gia giải đấu thể thao câu lạc bộ.",
    siteName: "VNDC Sport",
    type: "website",
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

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
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
