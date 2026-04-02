# Scroll Animation System — Architecture & Research

## Overview

The Calculus view uses a scroll-driven 3D animation system where scrolling through text controls the state of React Three Fiber (R3F) scenes. This document covers the architecture, the research behind it, and the techniques used.

## Architecture

```
User scrolls center text panel
  ↓
Lenis (smooth scroll library) adds momentum/inertia
  ↓
GSAP ScrollTrigger tracks per-Part progress (0-1)
  ↓
Writes to scrollState.js (plain mutable JS object)
  ↓
R3F useFrame reads scrollState every frame
  ↓
maath easing.damp smooths the progress value
  ↓
Scene properties set imperatively via Three.js refs
```

### Key Files

| File | Purpose |
|------|---------|
| `src/components/calculus/scrollState.js` | Shared mutable progress store — GSAP writes, useFrame reads |
| `src/hooks/useSmoothScroll.js` | Lenis initialization + GSAP ticker sync |
| `src/components/CalculusView.jsx` | Orchestrator — GSAP ScrollTrigger setup, scene crossfade, UI state |

### Why Not React State?

React `useState` triggers component re-renders. During scrolling, this means 60+ re-renders per second across the entire scene tree. Each re-render forces React to diff the virtual DOM and reconcile Three.js objects — causing visible judder.

The solution: a plain mutable JS object (`scrollState`) that bypasses React entirely. GSAP writes to it from scroll callbacks, and R3F's `useFrame` loop reads from it every animation frame.

## Tech Stack

### Lenis (Smooth Scrolling)
- **Package:** `lenis` v1.3.x
- **What it does:** Replaces native browser scrolling with lerp-based interpolation. Adds momentum/inertia to scroll.
- **Config:** `lerp: 0.08`, `smoothWheel: true`, `autoRaf: false`
- **Critical:** Must sync to GSAP ticker (not its own RAF loop) to prevent desync

```js
const lenis = new Lenis({ wrapper, content, smoothWheel: true, lerp: 0.08, autoRaf: false });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

### GSAP ScrollTrigger (Scroll-to-Progress Binding)
- **Package:** `gsap` + `@gsap/react`
- **What it does:** Creates per-section progress values (0-1) bound to scroll position
- **Config:** `scrub: 0` (instant), with `start: "top 30%"`, `end: "bottom 30%"`
- **Pattern:** `onUpdate: (self) => { scrollState.partProgress = self.progress }`

Why `scrub: 0` and not `scrub: 1.5`? Because we already have Lenis smoothing + maath damping. Adding GSAP scrub delay on top creates triple-layered smoothing that feels laggy.

### maath easing.damp (Frame-Rate Independent Damping)
- **Package:** `maath`
- **What it does:** Exponential decay toward a target value, normalized by delta time
- **Why not manual lerp?** `lerp(current, target, 0.1)` gives different speeds at 30fps vs 144fps. `damp` uses delta time for consistent behavior.

```js
const damped = useRef({ progress: 0 });
useFrame((_, delta) => {
  damp(damped.current, "progress", scrollState.partProgress, 0.25, delta);
  // Use damped.current.progress for all animations
});
```

Smoothing factors:
- `0.15` — Very smooth, noticeable lag (cameras)
- `0.25` — Smooth with slight lag (scroll-driven scenes) ← our default
- `0.35` — Responsive, minimal lag
- `0.5+` — Near-instant

### Scene Crossfade (Dip-to-Background)
When switching between Parts that use different 3D scenes, a `CrossfadeOverlay` mesh fades to the background color (#FAF7F2) and back:
- Triangle wave opacity: 0 → peak at midpoint → 0
- ~400ms total duration (`delta * 2.5`)
- Both scenes mounted during transition; outgoing hidden after fade completes

### Post-Processing
- **Bloom:** `luminanceThreshold: 0.35`, `intensity: 0.7`, `mipmapBlur`
- **Vignette:** `offset: 0.3`, `darkness: 0.4` — adds cinematic edge darkening

## Scene Component Pattern

All scene components follow this pattern:

1. **No props** — read from `scrollState` directly
2. **All elements unconditionally mounted** — use `visible={false}` instead of conditional `{flag && <mesh>}`
3. **All animation in useFrame** — materials, scales, positions set via refs
4. **Damped progress** — `maath/easing.damp` applied before any calculations

```jsx
export default function MyScene() {
  const meshRef = useRef();
  const matRef = useRef();
  const damped = useRef({ progress: 0 });

  useFrame((_, delta) => {
    const pi = scrollState.activePartIndex;
    if (pi !== MY_PART_INDEX) return;

    damp(damped.current, "progress", scrollState.partProgress, 0.25, delta);
    const p = damped.current.progress;

    // Set properties imperatively
    meshRef.current.visible = p > 0.1;
    meshRef.current.scale.setScalar(p);
    matRef.current.opacity = p;
  });

  return (
    <mesh ref={meshRef} visible={false}>
      <sphereGeometry />
      <meshStandardMaterial ref={matRef} transparent opacity={0} />
    </mesh>
  );
}
```

## Anti-Patterns to Avoid

- **Don't use `useState` for scroll position** — causes 60+ re-renders/second
- **Don't use `react-scrollama`** — triggers React state on every scroll event
- **Don't use CSS `scroll-behavior: smooth`** — conflicts with Lenis
- **Don't put Lenis on a separate RAF from GSAP** — they'll desync
- **Don't use conditional rendering for progress-dependent elements** — mount everything, toggle `visible`
- **Don't use `locomotive-scroll`** — outdated, buggy. Lenis is its successor.

## Research Sources

- **Lenis:** https://github.com/darkroomengineering/lenis
- **GSAP ScrollTrigger:** https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- **maath:** https://github.com/pmndrs/maath
- **Codrops R3F tutorials:** https://tympanus.net/codrops/tag/three-js/
- **Wawa Sensei scene transitions:** https://wawasensei.dev/tuto/how-to-create-scene-transitions-with-react-three-fiber
- **Awwwards WebGL collection:** https://www.awwwards.com/websites/webgl/
