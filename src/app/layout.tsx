import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import RootLayoutClient from "@/components/layout/RootLayoutClient";
import LiveMetricsWidget from "@/components/common/LiveMetricsWidget";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "TournaHub - Nền tảng Quản lý giải đấu",
  description: "Nền tảng tổ chức và tham gia giải đấu thể thao câu lạc bộ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <RootLayoutClient>{children}</RootLayoutClient>
        <Toaster />
        <LiveMetricsWidget />
      </body>
    </html>
  );
}
