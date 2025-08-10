import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";

// Use local fonts for better offline build support
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
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
