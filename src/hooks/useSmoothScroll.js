import { useEffect, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Initializes Lenis smooth scrolling on a scroll container element
 * and syncs it with GSAP's ticker so ScrollTrigger stays in sync.
 *
 * @param {React.RefObject<HTMLElement>} scrollRef - Ref to the scrollable container
 * @returns {React.RefObject<Lenis|null>} Ref to the Lenis instance
 */
export default function useSmoothScroll(scrollRef) {
  const lenisRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const lenis = new Lenis({
      wrapper: el,
      content: el.children[0],
      smoothWheel: true,
      lerp: 0.08,
      wheelMultiplier: 0.8,
      autoRaf: false,
    });
    lenisRef.current = lenis;

    // Connect Lenis scroll events to ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // Sync Lenis to GSAP's ticker (single shared rAF loop)
    const tickerCallback = (time) => {
      lenis.raf(time * 1000); // GSAP gives seconds, Lenis wants ms
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [scrollRef]);

  return lenisRef;
}
