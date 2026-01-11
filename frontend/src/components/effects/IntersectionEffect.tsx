"use client";

import { ReactNode } from "react";
import styles from "./IntersectionEffect.module.css";

interface IntersectionEffectProps {
  children: ReactNode;
  className?: string;
}

export function IntersectionEffect({
  children,
  className = "",
}: IntersectionEffectProps) {
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.beamBlue} aria-hidden="true" />
      <div className={styles.beamOrange} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
