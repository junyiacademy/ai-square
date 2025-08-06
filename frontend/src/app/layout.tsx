import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  fallback: ['system-ui', 'arial'],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  fallback: ['monospace'],
});

export const metadata: Metadata = {
  title: "AI Square - AI Literacy Platform",
  description: "Multi-agent learning platform for AI literacy education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 安全處理字體變量
  const fontClasses = [
    geistSans?.variable || '--font-geist-sans',
    geistMono?.variable || '--font-geist-mono',
    'antialiased'
  ].filter(Boolean).join(' ');
  
  return (
    <html lang="en">
      <body className={fontClasses}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
