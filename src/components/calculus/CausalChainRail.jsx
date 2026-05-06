import React from "react";
import { motion } from "framer-motion";
import { PALETTE as P } from "../../data/constants.js";
import { EMERGENCE_LEVELS } from "./sceneUtils.js";

// Map Part indices to chain positions
const PART_TO_CHAIN = [0, 0, 1, 2, 3, 3, 4, 5, 5, 5]; // 10 parts -> 6 levels

const PART_LABELS = [
  "Genesis", "Primitives", "Temporal", "Axioms", "Operators",
  "Spatial", "Cognitive", "Compose", "Reference", "Open Q",
];

const springTransition = { type: "spring", stiffness: 300, damping: 25 };
const gentleSpring = { type: "spring", stiffness: 200, damping: 20 };

export default function CausalChainRail({ activePartIndex, onNavigate }) {
  const activeChain = PART_TO_CHAIN[activePartIndex] ?? 0;

  return (
    <div style={{
      width: 160,
      borderLeft: `1px solid ${P.bd}`,
      background: P.sb,
      padding: "20px 12px",
      overflowY: "auto",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Title */}
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: P.tf,
        marginBottom: 20,
        paddingLeft: 6,
      }}>
        Causal Chain
      </div>

      {/* Chain nodes */}
      <div style={{ position: "relative", paddingLeft: 12, flex: "0 0 auto" }}>
        {/* Connecting line */}
        <div style={{
          position: "absolute",
          left: 17,
          top: 10,
          width: 1.5,
          height: "calc(100% - 20px)",
          background: `linear-gradient(to bottom, ${EMERGENCE_LEVELS[0].color}30, ${EMERGENCE_LEVELS[5].color}30)`,
          borderRadius: 1,
        }} />

        {EMERGENCE_LEVELS.map((level, i) => {
          const isActive = i === activeChain;
          const isPast = i < activeChain;
          const color = level.color;

          return (
            <motion.button
              key={level.id}
              onClick={() => {
                const partIdx = PART_TO_CHAIN.indexOf(i);
                if (partIdx >= 0) onNavigate(partIdx);
              }}
              whileHover={{ backgroundColor: isActive ? `${color}12` : `${color}08` }}
              animate={{
                backgroundColor: isActive ? `${color}12` : "rgba(0,0,0,0)",
              }}
              transition={gentleSpring}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "7px 6px",
                marginBottom: i < EMERGENCE_LEVELS.length - 1 ? 4 : 0,
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                position: "relative",
              }}
            >
              {/* Node circle */}
              <motion.div
                animate={{
                  background: isActive ? color : isPast ? `${color}50` : "transparent",
                  borderColor: isActive ? color : isPast ? `${color}35` : `${P.bd}80`,
                  boxShadow: isActive ? `0 0 10px ${color}40` : "0 0 0px transparent",
                  scale: isActive ? 1.15 : 1,
                }}
                transition={springTransition}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "2px solid",
                  flexShrink: 0,
                }}
              />

              {/* Symbol */}
              <motion.span
                animate={{
                  color: isActive ? color : isPast ? P.tm : P.tf,
                  fontWeight: isActive ? 600 : 400,
                }}
                transition={gentleSpring}
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 16,
                  fontStyle: "italic",
                  minWidth: 18,
                }}
              >
                {level.symbol}
              </motion.span>

              {/* Label */}
              <motion.span
                animate={{
                  color: isActive ? P.tx : P.tf,
                }}
                transition={gentleSpring}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10.5,
                  letterSpacing: "0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {level.label}
              </motion.span>
            </motion.button>
          );
        })}
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: `${P.bd}80`, margin: "20px 6px" }} />

      {/* Part list */}
      <div style={{ flex: "1 1 auto" }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: P.tf,
          marginBottom: 10,
          paddingLeft: 6,
        }}>
          Parts
        </div>

        {PART_LABELS.map((label, i) => {
          const isActive = i === activePartIndex;
          return (
            <motion.button
              key={i}
              onClick={() => onNavigate(i)}
              whileHover={{ color: isActive ? "#2D6B5A" : P.tm }}
              animate={{
                backgroundColor: isActive ? "#2D6B5A10" : "rgba(0,0,0,0)",
                borderLeftColor: isActive ? "#2D6B5A" : "transparent",
                color: isActive ? "#2D6B5A" : P.tf,
                fontWeight: isActive ? 600 : 400,
              }}
              transition={gentleSpring}
              style={{
                display: "block",
                width: "100%",
                padding: "5px 6px 5px 10px",
                border: "none",
                borderLeft: "2.5px solid transparent",
                borderRadius: 0,
                cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                textAlign: "left",
                lineHeight: 1.4,
              }}
            >
              {label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
