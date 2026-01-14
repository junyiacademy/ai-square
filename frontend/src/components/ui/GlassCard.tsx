"use client";

import React from "react";
import styles from "./GlassCard.module.css";

interface GlassCardProps {
  children: React.ReactNode;
  variant?: "default" | "blue" | "orange";
  className?: string;
  hover?: boolean;
}

/**
 * Glassmorphism Card Component
 * Creates depth and visual hierarchy with frosted glass effect
 * Supports brand color variants (blue/orange)
 */
export default function GlassCard({
  children,
  variant = "default",
  className = "",
  hover = true,
}: GlassCardProps) {
  const variantClass = styles[`glass-${variant}`] || styles["glass-default"];
  const hoverClass = hover ? styles.hover : "";

  return (
    <div className={`${styles.glassCard} ${variantClass} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}
