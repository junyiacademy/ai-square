"use client";

import { ReactNode } from "react";
import styles from "./GlassCard.module.css";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({
  children,
  className = "",
  hover = true,
}: GlassCardProps) {
  return (
    <div
      className={`${styles.card} ${hover ? styles.hover : ""} ${className}`}
    >
      {children}
    </div>
  );
}
