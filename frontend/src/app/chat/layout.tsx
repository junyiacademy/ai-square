"use client";

import { useEffect } from "react";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Hide footer and adjust main for chat page
    const footer = document.querySelector("footer");
    const main = document.querySelector("main");

    if (footer) footer.style.display = "none";
    if (main) {
      main.style.height = "calc(100vh - 64px)"; // 64px is header height
      main.style.overflow = "hidden";
    }

    return () => {
      // Restore when leaving chat page
      if (footer) footer.style.display = "";
      if (main) {
        main.style.height = "";
        main.style.overflow = "";
      }
    };
  }, []);

  return <>{children}</>;
}
