/**
 * Constants for Knowledge Graph visualization
 */

export const GRAPH_CONFIG = {
  defaultWidth: 1400,
  defaultHeight: 900,
  maxHeight: 800,
  aspectRatio: 0.67,
  zoomExtent: [0.3, 3] as [number, number],
  zoomLevel: 2.0,
} as const;

export const NODE_RADII = {
  center: 50,
  domain: 35,
  competency: 25,
  ksaTheme: 35,
  ksaCode: 18,
  ksaSubcode: 12,
  default: 15,
} as const;

export const FORCE_CONFIG = {
  linkDistance: {
    ksaSubcode: 80,
    ksaCode: 120,
    ksaTheme: 180,
    default: 200,
  },
  chargeStrength: {
    ksaSubcode: -300,
    ksaCode: -500,
    ksaTheme: -800,
    default: -1000,
  },
  collisionRadius: 20,
  radialDistance: {
    ksaTheme: 200,
    ksaCode: 350,
    ksaSubcode: 450,
  },
  radialStrength: 0.6,
} as const;

export const COLORS = {
  trafficLight: {
    red: "#ef4444", // Completely wrong
    yellow: "#f59e0b", // Partially correct
    green: "#10b981", // All correct
    gray: "#6b7280", // No data
  },
  score: {
    high: "#10b981", // >= 80
    medium: "#f59e0b", // >= 60
    low: "#ef4444", // < 60
  },
  ksa: {
    knowledge: "#3b82f6",
    skills: "#10b981",
    attitudes: "#a855f7",
    default: "#6b7280",
  },
  link: "#999",
  stroke: {
    normal: "#fff",
    selected: "#4f46e5",
  },
} as const;

export const KSA_TYPES = [
  { id: "knowledge", color: COLORS.ksa.knowledge },
  { id: "skills", color: COLORS.ksa.skills },
  { id: "attitudes", color: COLORS.ksa.attitudes },
] as const;

export const ANIMATION = {
  transitionDuration: 750,
  tooltipDelay: 200,
  tooltipFadeout: 500,
  alphaTarget: 0.3,
} as const;
