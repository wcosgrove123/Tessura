/**
 * Shared mutable scroll state — no React, no subscriptions.
 * GSAP ScrollTrigger writes here; R3F useFrame reads here.
 * This avoids React re-renders in the animation loop entirely.
 */
export const scrollState = {
  /** Current active Part index (0-9) */
  activePartIndex: 0,
  /** Raw progress within the active Part (0-1), set by GSAP ScrollTrigger */
  partProgress: 0,
  /** Previous Part index before the last transition */
  prevPartIndex: -1,
  /** Crossfade transition progress: 0 = just switched, 1 = fully transitioned */
  transitionProgress: 1,
};
