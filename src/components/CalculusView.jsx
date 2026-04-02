import React, { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect, Suspense, lazy } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PALETTE as P } from "../data/constants.js";
import { renderTermLinks } from "./TermHighlight.jsx";
import CausalChainRail from "./calculus/CausalChainRail.jsx";
import { AC } from "./calculus/sceneUtils.js";
import { scrollState } from "./calculus/scrollState.js";
import useSmoothScroll from "../hooks/useSmoothScroll.js";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

// Lazy-load 3D scenes to avoid blocking initial render
const OrreryScene = lazy(() => import("./calculus/OrreryScene.jsx"));
const AxiomWebScene = lazy(() => import("./calculus/AxiomWebScene.jsx"));
const SpatialScene = lazy(() => import("./calculus/SpatialScene.jsx"));
const EmergenceScene = lazy(() => import("./calculus/EmergenceScene.jsx"));
const NoemagraphBackground = lazy(() => import("./calculus/NoemagraphBackground.jsx"));

// — Color constants —
const AC_LIGHT = "#2D6B5A08";
const AC_BORDER = "#2D6B5A30";

// — Part icons (Unicode) —
const PART_ICONS = ["✦", "ν", "μ", "=*", "⊢", "℘", "κ", "{ }", "Σ", "?"];

// Scene label mapping
const SCENE_LABELS = [
  "Noematic Orrery", "Noematic Orrery", "Noemagraph",
  "Axiom Dependency Web", "Noemagraph", "Spatial Architecture",
  "Cognitive Emergence", "Noemagraph", "Noemagraph", "Noemagraph",
];

// ============================================================
// NotationCard — renders formal axioms/primitives in a tinted card
// ============================================================
function NotationCard({ label, notation, name }) {
  return (
    <div style={{
        margin: "28px 0",
        padding: "28px 32px",
        background: `linear-gradient(135deg, ${AC_LIGHT}, #2D6B5A05)`,
        border: `1px solid ${AC_BORDER}`,
        borderLeft: `3px solid ${AC}`,
        borderRadius: 6,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 80, height: 80,
        background: `radial-gradient(circle at top right, ${AC}06, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {label && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
          color: AC, marginBottom: 8, opacity: 0.7,
        }}>
          {label}
        </div>
      )}

      {notation && (
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 26, fontWeight: 400, color: P.tx,
          letterSpacing: "0.02em", lineHeight: 1.4,
          marginBottom: name ? 6 : 0,
        }}>
          {notation}
        </div>
      )}

      {name && (
        <div style={{
          fontFamily: "'Spectral', serif",
          fontSize: 14, fontStyle: "italic", color: P.tm, lineHeight: 1.5,
        }}>
          {name}
        </div>
      )}
    </div>
  );
}

// ============================================================
// OperatorRow
// ============================================================
function OperatorRow({ text, index }) {
  const parts = text.split(" | ").map(s => s.trim());
  const parsed = {};
  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx > 0) {
      parsed[part.substring(0, colonIdx).trim().toLowerCase()] = part.substring(colonIdx + 1).trim();
    }
  }
  if (!parsed.symbol && !parsed.name) return null;

  return (
    <div style={{
        display: "grid", gridTemplateColumns: "64px 140px 1fr",
        gap: 12, padding: "10px 0",
        borderBottom: `1px solid ${P.bd}60`, alignItems: "baseline",
      }}
    >
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 20, color: AC, textAlign: "center", fontWeight: 500,
      }}>
        {parsed.symbol || ""}
      </div>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11, color: P.tx, fontWeight: 500,
      }}>
        {parsed.name || ""}
      </div>
      <div style={{
        fontFamily: "'Spectral', serif",
        fontSize: 13.5, color: P.tm, lineHeight: 1.55,
      }}>
        {parsed.meaning || parsed.definition || ""}
      </div>
    </div>
  );
}

// ============================================================
// SectionBlock — individual section with motion reveal
// ============================================================
function SectionBlock({ section, linkedTerms, onTermClick, onEditSection, projectId }) {
  const title = section.title;
  const isNotation = isNotationTitle(title);
  const isOperatorTable = isOperatorSection(section);
  const { label, notation, name } = isNotation ? parseNotationTitle(title) : {};

  return (
    <div style={{ marginBottom: 40, position: "relative" }}>

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
        {!isNotation && (
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 20, fontWeight: 500, color: P.tx,
            margin: 0, lineHeight: 1.3,
          }}>
            {title}
          </h3>
        )}
        <button
          onClick={() => onEditSection(projectId, section.id)}
          title="Edit in Editor"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: P.tf, padding: 2, opacity: 0.4, transition: "opacity 0.2s", flexShrink: 0,
          }}
          onMouseOver={e => e.currentTarget.style.opacity = 1}
          onMouseOut={e => e.currentTarget.style.opacity = 0.4}
        >
          <Pencil size={12} />
        </button>
      </div>

      {/* Notation card */}
      {isNotation && <NotationCard label={label} notation={notation} name={name} />}

      {/* Operator table */}
      {isOperatorTable ? (
        <div style={{
          border: `1px solid ${P.bd}`, borderRadius: 6,
          padding: "4px 20px", background: P.bg,
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "64px 140px 1fr",
            gap: 12, padding: "10px 0", borderBottom: `2px solid ${P.bd}`,
          }}>
            {["Symbol", "Name", "Meaning"].map(h => (
              <div key={h} style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
                color: P.tf, textAlign: h === "Symbol" ? "center" : "left",
              }}>
                {h}
              </div>
            ))}
          </div>
          {section.paragraphs.map((p, i) => (
            <OperatorRow key={p.id} text={p.text} index={i} />
          ))}
        </div>
      ) : (
        section.paragraphs.map((para, pi) => {
          if (isNotation && pi === 0 && para.text.length < 120) return null;
          return (
            <p key={para.id} style={{
              fontFamily: "'Spectral', serif",
              fontSize: 15.5, lineHeight: 1.85, color: P.tx,
              margin: "0 0 14px 0",
            }}>
              {renderTermLinks(para.text, para.linkedTerms, linkedTerms, onTermClick)}
            </p>
          );
        })
      )}
    </div>
  );
}

// ============================================================
// PartDivider
// ============================================================
function PartDivider({ partIndex, title, subtitle, icon }) {
  const cleanTitle = title.replace(/^Part\s+[IVXLC]+:\s*/i, "");
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.2 }}
      style={{ padding: partIndex === 0 ? "20px 0 48px" : "72px 0 48px" }}
    >
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
        color: AC, marginBottom: 10,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ display: "inline-block", width: 20, height: 1, background: AC, opacity: 0.4 }} />
        Part {toRoman(partIndex + 1)}
        <span style={{ fontFamily: "serif", fontSize: 14, opacity: 0.6 }}>{icon}</span>
      </div>

      <h2 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 34, fontWeight: 300, color: P.tx,
        margin: "0 0 10px 0", lineHeight: 1.15, letterSpacing: "-0.01em",
      }}>
        {cleanTitle}
      </h2>

      {subtitle && (
        <p style={{
          fontFamily: "'Spectral', serif",
          fontSize: 14.5, fontStyle: "italic", color: P.tm,
          margin: 0, lineHeight: 1.6, maxWidth: 480,
        }}>
          {subtitle}
        </p>
      )}

      <div style={{
        marginTop: 24, height: 1,
        background: `linear-gradient(to right, ${AC}40, ${P.bd}20, transparent)`,
        maxWidth: 300,
      }} />
    </motion.div>
  );
}

// ============================================================
// CrossfadeOverlay — dip-to-background transition between scenes
// ============================================================
function CrossfadeOverlay() {
  const meshRef = useRef();
  const mountedPartRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const st = scrollState;

    // Advance transition
    if (st.transitionProgress < 1) {
      st.transitionProgress = Math.min(1, st.transitionProgress + delta * 2.5);
    }

    // Smooth bell curve: peaks at midpoint, gentler than triangle wave
    const t = st.transitionProgress;
    const fadeOpacity = Math.sin(t * Math.PI);
    meshRef.current.material.opacity = Math.max(0, fadeOpacity * 0.45);
    meshRef.current.visible = fadeOpacity > 0.01;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 4.5]} renderOrder={999} visible={false}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial
        color="#FAF7F2"
        transparent
        opacity={0}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

// ============================================================
// ActiveScene — reads from scrollState, manages scene mounting
// ============================================================
function ActiveScene() {
  const mountedRef = useRef(0);
  const prevMountedRef = useRef(-1);
  const [mounted, setMounted] = useState({ current: 0, prev: -1 });

  useFrame(() => {
    const st = scrollState;
    const newCurrent = st.activePartIndex;
    const newPrev = st.prevPartIndex;

    // Only trigger a React re-render for scene mount/unmount changes
    if (newCurrent !== mountedRef.current || (st.transitionProgress >= 1 && prevMountedRef.current !== -1)) {
      mountedRef.current = newCurrent;
      if (st.transitionProgress >= 1) {
        prevMountedRef.current = -1;
      } else {
        prevMountedRef.current = newPrev;
      }
      setMounted({ current: mountedRef.current, prev: prevMountedRef.current });
    }
  });

  const partIdx = mounted.current;
  const prevIdx = mounted.prev;

  // Determine which scene types to render
  const renderScene = (idx) => {
    if (idx < 0) return null;
    if (idx <= 1) return <OrreryScene />;
    if (idx === 2 || idx === 4 || idx >= 7) return <NoemagraphBackground />;
    if (idx === 3) return <AxiomWebScene />;
    if (idx === 5) return <SpatialScene />;
    if (idx === 6) return <EmergenceScene />;
    return null;
  };

  // Don't render the same scene type twice during crossfade
  const sameSceneType = prevIdx >= 0 && getSceneType(prevIdx) === getSceneType(partIdx);

  return (
    <Suspense fallback={null}>
      <fog attach="fog" args={["#FAF7F2", 12, 28]} />

      {/* Current scene */}
      {renderScene(partIdx)}

      {/* Previous scene during crossfade (if different type) */}
      {prevIdx >= 0 && !sameSceneType && renderScene(prevIdx)}

      <CrossfadeOverlay />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.35}
          luminanceSmoothing={0.4}
          intensity={0.7}
          mipmapBlur
          levels={3}
        />
        <Vignette eskil={false} offset={0.3} darkness={0.4} />
      </EffectComposer>
    </Suspense>
  );
}

function getSceneType(partIdx) {
  if (partIdx <= 1) return "orrery";
  if (partIdx === 2 || partIdx === 4 || partIdx >= 7) return "noemagraph";
  if (partIdx === 3) return "axiomweb";
  if (partIdx === 5) return "spatial";
  if (partIdx === 6) return "emergence";
  return "none";
}

// ============================================================
// Main CalculusView
// ============================================================
export default function CalculusView({ projects, linkedTerms, onSelectSection, onSelectTerm, onSetView }) {
  const scrollRef = useRef(null);
  const partRefs = useRef([]);
  const containerRef = useRef(null);

  // UI-only state: updated only when part changes (~10 times across full scroll)
  const [uiPartIndex, setUiPartIndex] = useState(0);

  const acProject = useMemo(() =>
    projects.find(p => p.id === "axiometric-calculus"),
    [projects]
  );

  const handleEditSection = useCallback((projectId, sectionId) => {
    onSelectSection(projectId, sectionId);
    onSetView("editor");
  }, [onSelectSection, onSetView]);

  const scrollToPart = useCallback((index) => {
    const el = partRefs.current[index];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Initialize Lenis smooth scrolling
  useSmoothScroll(scrollRef);

  // GSAP ScrollTrigger setup — one trigger per Part section
  useGSAP(() => {
    if (!scrollRef.current || !acProject) return;

    // Set default scroller for all ScrollTriggers in this context
    const parts = acProject.parts;

    parts.forEach((_, i) => {
      const el = partRefs.current[i];
      if (!el) return;

      ScrollTrigger.create({
        trigger: el,
        scroller: scrollRef.current,
        start: "top 30%",
        end: "bottom 30%",
        onUpdate: (self) => {
          scrollState.partProgress = self.progress;
        },
        onEnter: () => {
          if (scrollState.activePartIndex !== i) {
            scrollState.prevPartIndex = scrollState.activePartIndex;
            scrollState.activePartIndex = i;
            scrollState.transitionProgress = 0;
          }
        },
        onEnterBack: () => {
          if (scrollState.activePartIndex !== i) {
            scrollState.prevPartIndex = scrollState.activePartIndex;
            scrollState.activePartIndex = i;
            scrollState.transitionProgress = 0;
          }
        },
      });
    });
  }, { scope: containerRef, dependencies: [acProject] });

  // Lightweight polling for UI-only part index updates
  useEffect(() => {
    let lastIndex = 0;
    let rafId;
    const check = () => {
      if (scrollState.activePartIndex !== lastIndex) {
        lastIndex = scrollState.activePartIndex;
        setUiPartIndex(lastIndex);
      }
      rafId = requestAnimationFrame(check);
    };
    rafId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (!acProject) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: P.tm }}>
        Axiometric Calculus project not found.
      </div>
    );
  }

  const parts = acProject.parts;

  return (
    <div ref={containerRef} style={{ flex: 1, display: "flex", height: "100%", overflow: "hidden", background: P.bg }}>

      {/* Content area — Canvas behind, text on top */}
      <div style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* 3D Canvas — absolute background layer */}
        <Canvas
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            zIndex: 0,
          }}
          camera={{ position: [0, 0, 6], fov: 50 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.6} />
          <pointLight position={[-3, 2, 4]} intensity={0.3} color="#8B4513" />
          <ActiveScene />
        </Canvas>

        {/* Scene label overlay — bottom-left on canvas */}
        <div style={{
          position: "absolute", bottom: 16, left: 20,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
          color: `${P.tf}60`,
          pointerEvents: "none",
          zIndex: 1,
        }}>
          {SCENE_LABELS[uiPartIndex] || ""}
        </div>

        {/* Scrolling text — frosted glass overlay on top of canvas */}
        <div
          ref={scrollRef}
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {/* Glass text container — centered column with frosted parchment background */}
          <div style={{
            maxWidth: 720,
            margin: "0 auto",
            minHeight: "100%",
            background: "rgba(250, 247, 242, 0.68)",
            backdropFilter: "blur(16px) saturate(1.3)",
            WebkitBackdropFilter: "blur(16px) saturate(1.3)",
            borderLeft: `1px solid rgba(45, 107, 90, 0.08)`,
            borderRight: `1px solid rgba(45, 107, 90, 0.08)`,
            boxShadow: "0 0 80px rgba(250, 247, 242, 0.6), inset 0 0 80px rgba(250, 247, 242, 0.15)",
            padding: "0 48px",
          }}>
        {/* Hero header */}
        <div style={{ padding: "48px 0 20px" }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase",
            color: AC, marginBottom: 12,
          }}>
            A Formal Notation System for Metacognitive Operations
          </div>

          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 44, fontWeight: 300, color: P.tx,
            margin: "0 0 10px 0", lineHeight: 1.05, letterSpacing: "-0.02em",
          }}>
            <span style={{ color: AC, fontWeight: 400 }}>Axiometric</span>{" "}Calculus
          </h1>

          <p style={{
            fontFamily: "'Spectral', serif",
            fontSize: 14.5, color: P.tm, lineHeight: 1.7, maxWidth: 460, margin: 0,
          }}>
            Version 4.0 — Complete Foundations with Causal Architecture
          </p>

          {/* Symbol preview */}
          <div style={{
            display: "flex", gap: 16, marginTop: 20, paddingTop: 16,
            borderTop: `1px solid ${P.bd}`, flexWrap: "wrap",
          }}>
            {[["ν", "noema"], ["σ", "schema"], ["E", "endosphere"],
              ["℘", "perifield"], ["=*", "tesseractic"], ["κ", "consciousness"],
            ].map(([sym, name]) => (
              <div key={sym} style={{
                fontFamily: "serif", fontSize: 12, color: P.tm,
                display: "flex", alignItems: "baseline", gap: 3,
              }}>
                <span style={{ fontSize: 16, color: AC, fontStyle: "italic" }}>{sym}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, opacity: 0.6 }}>{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Part sections */}
        <div style={{ paddingBottom: 120 }}>
          {parts.map((part, pi) => (
            <div key={part.id} ref={el => partRefs.current[pi] = el}>
              <PartDivider
                partIndex={pi}
                title={part.title}
                subtitle={part.subtitle}
                icon={PART_ICONS[pi]}
              />

              {part.children.map(section => (
                <SectionBlock
                  key={section.id}
                  section={section}
                  linkedTerms={linkedTerms}
                  onTermClick={onSelectTerm}
                  onEditSection={handleEditSection}
                  projectId="axiometric-calculus"
                />
              ))}
            </div>
          ))}

          {/* Closing */}
          <div style={{ textAlign: "center", padding: "60px 0 40px", color: P.tf }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 28, fontWeight: 300, fontStyle: "italic", color: AC, marginBottom: 8,
            }}>
              A =* A
            </div>
            <div style={{
              fontFamily: "'Spectral', serif", fontSize: 13, fontStyle: "italic", color: P.tf,
            }}>
              And that is enough.
            </div>
          </div>
        </div>

          </div>{/* end glass container */}
        </div>{/* end scroll container */}
      </div>{/* end content area */}

      {/* Causal Chain Rail — far right */}
      <CausalChainRail activePartIndex={uiPartIndex} onNavigate={scrollToPart} />
    </div>
  );
}

// ============================================================
// Helpers (preserved from original)
// ============================================================

function isNotationTitle(title) {
  return /^[PATC][₀₁₂₃₄₅₆₇₈₉]/.test(title) ||
         /^A₁[\.\s₅]/.test(title) ||
         (/[≝=\*∋→↔∴⊢]/.test(title) && !/^[0-9]+\.[0-9]/.test(title));
}

function isOperatorSection(section) {
  if (!section.paragraphs || section.paragraphs.length < 3) return false;
  return section.paragraphs.filter(p =>
    p.text.includes(" | ") && (p.text.includes("Symbol:") || p.text.includes("Name:"))
  ).length >= 3;
}

function parseNotationTitle(title) {
  const match = title.match(/^([PATC][₀₁₂₃₄₅₆₇₈₉](?:[\.₅])?)\s*\(([^)]+)\)(?:\s*:\s*(.+))?$/);
  if (match) return { label: match[1], name: match[2].trim(), notation: match[3]?.trim() || null };
  const match2 = title.match(/^([A-Z][₀₁₂₃₄₅₆₇₈₉](?:\.[₀₁₂₃₄₅₆₇₈₉])?)\s*\(([^)]+)\)(?:\s*:\s*(.+))?/);
  if (match2) return { label: match2[1], name: match2[2].trim(), notation: match2[3]?.trim() || null };
  return { label: null, notation: title, name: null };
}

function toRoman(num) {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
}
