"use client";

import { useEffect, useState } from "react";

interface ResponsiveTitleProps {
  children: string;
  className?: string;
}

export function ResponsiveTitle({
  children,
  className = "",
}: ResponsiveTitleProps) {
  const [fontSize, setFontSize] = useState("text-2xl sm:text-3xl");

  useEffect(() => {
    // 根據標題長度動態調整字體大小
    const length = children.length;

    if (length > 40) {
      // 超長標題使用更小的字體
      setFontSize("text-xl sm:text-2xl md:text-3xl");
    } else if (length > 30) {
      // 長標題
      setFontSize("text-2xl sm:text-3xl");
    } else {
      // 正常標題
      setFontSize("text-2xl sm:text-3xl");
    }
  }, [children]);

  return (
    <h1 className={`${fontSize} font-bold text-center px-4 ${className}`}>
      {children}
    </h1>
  );
}
