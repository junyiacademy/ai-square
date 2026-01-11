"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { RTLProvider } from "@/components/providers/RTLProvider";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isChat = pathname === "/chat";
  const isLandingPage = pathname === "/";

  return (
    <I18nProvider>
      <RTLProvider>
        <ThemeProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              {!isChat && !isLandingPage && <Header />}
              <main
                className={`flex-1 bg-white dark:bg-slate-900 text-gray-900 dark:text-white ${isChat ? "h-screen" : ""}`}
              >
                {children}
              </main>
              {!isChat && !isLandingPage && <Footer />}
            </div>
          </AuthProvider>
        </ThemeProvider>
      </RTLProvider>
    </I18nProvider>
  );
}
