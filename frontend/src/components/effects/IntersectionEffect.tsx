"use client";

import React from "react";
import styles from "./IntersectionEffect.module.css";

interface IntersectionEffectProps {
  className?: string;
}

/**
 * The Intersection Effect - Visual motif representing the convergence of
 * Blue (professionalism) and Orange (energy) in an X pattern.
 * Inspired by Junyi Academy's mission to connect education and innovation.
 */
export default function IntersectionEffect({
  className = "",
}: IntersectionEffectProps) {
  return (
    <div className={`${styles.intersectionContainer} ${className}`}>
      {/* Blue beam from top-left */}
      <div className={styles.beamBlue} aria-hidden="true" />

      {/* Orange beam from bottom-right */}
      <div className={styles.beamOrange} aria-hidden="true" />

      {/* Intersection glow at center */}
      <div className={styles.intersectionGlow} aria-hidden="true" />
    </div>
  );
}
