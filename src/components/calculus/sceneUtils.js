/**
 * Shared utilities and constants for Calculus 3D scenes.
 */

// Axiometric Calculus color
export const AC = "#2D6B5A";
export const AC_RGB = [0.176, 0.420, 0.353];

// Emergence hierarchy colors
export const LEVEL_COLORS = {
  g: "#B33A3A",       // gravity — deep red
  i: "#D4742C",       // instinct — orange
  M: "#C4A82C",       // memory — gold
  theta: "#2D6B5A",   // thought — forest green
  Em: "#B3407A",      // emotion — magenta
  kappa: "#2A7A9E",   // consciousness — cyan
};

// Axiom node positions (pre-computed, roughly circular)
export const AXIOM_NODES = [
  { id: "A0", label: "A₀", name: "Grounding", deps: [], pos: [0, -1.5, 0] },
  { id: "A1", label: "A₁", name: "Identity", deps: ["A0"], pos: [-1.2, -0.5, 0.3] },
  { id: "A1.5", label: "A₁.₅", name: "Expression", deps: ["A1"], pos: [-0.8, 0.5, -0.5] },
  { id: "A2", label: "A₂", name: "Derivation", deps: ["A1", "A1.5"], pos: [0, 1.0, 0.4] },
  { id: "A3", label: "A₃", name: "Difference", deps: ["A0", "A1"], pos: [1.2, -0.5, -0.3] },
  { id: "A4", label: "A₄", name: "Meta", deps: ["A0", "A1", "A1.5", "A2", "A3"], pos: [0, 2.0, 0] },
  { id: "C0", label: "C₀", name: "Gravity-Instinct", deps: [], pos: [2.0, -1.5, 0.5] },
  { id: "C1", label: "C₁", name: "Existence-Structure", deps: ["C0"], pos: [2.2, -0.3, -0.2] },
  { id: "C2", label: "C₂", name: "Drive", deps: ["C0", "C1"], pos: [2.0, 0.8, 0.3] },
];

// Spatial architecture layers
export const SPATIAL_LAYERS = [
  { id: "E", label: "Endosphere", radius: 0.5, color: "#8B4513", opacity: 0.9 },
  { id: "L", label: "Outer Lens", radius: 0.8, color: "#6B6052", opacity: 0.3 },
  { id: "P", label: "Perifield", radius: 1.4, color: "#2D6B5A", opacity: 0.15 },
  { id: "T", label: "Threshold", radius: 2.0, color: "#9E5A2A", opacity: 0.1 },
  { id: "Xf", label: "Exofield", radius: 2.8, color: "#A09580", opacity: 0.05 },
  { id: "N", label: "Noemascape", radius: 3.5, color: "#E2D9CB", opacity: 0.03 },
];

// Cognitive emergence levels
export const EMERGENCE_LEVELS = [
  { id: "g", label: "gravity", symbol: "g", color: "#B33A3A", y: 0, x: 0 },
  { id: "i", label: "instinct", symbol: "i", color: "#D4742C", y: 1.2, x: 0 },
  { id: "M", label: "memory", symbol: "M", color: "#C4A82C", y: 2.4, x: 0 },
  { id: "theta", label: "thought", symbol: "θ", color: "#2D6B5A", y: 3.6, x: 0 },
  { id: "Em", label: "emotion", symbol: "Em", color: "#B3407A", y: 3.6, x: 1.8 },
  { id: "kappa", label: "consciousness", symbol: "κ", color: "#2A7A9E", y: 5.0, x: 0 },
];

// Font paths for 3D text (served from public/)
export const FONT_HEADING = '/fonts/CormorantGaramond-Italic.ttf';
export const FONT_MONO = '/fonts/IBMPlexMono-Regular.ttf';

/**
 * Smoothstep interpolation
 */
export function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

/**
 * Linear interpolation
 */
export function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Map a progress value to a sub-range
 * e.g., subProgress(0.5, 0.3, 0.7) = 0.5 (halfway through the sub-range)
 */
export function subProgress(progress, start, end) {
  return Math.max(0, Math.min(1, (progress - start) / (end - start)));
}
