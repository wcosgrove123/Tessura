import React, { useState } from "react";
import { X } from "lucide-react";
import { PALETTE as P, } from "../data/constants.js";
import { DIAGRAM_CATEGORIES } from "../data/diagrams.js";

// ── Template Definitions ──────────────────────────────────

const TEMPLATES = [
  // ═══ SEQUENTIAL ═══
  {
    type: "hierarchy", category: "sequential",
    label: "Staircase Hierarchy", description: "Ascending stages or levels",
    examples: "Piaget, Tyler, Bruner",
    nodes: [
      { id: "h1", type: "diagram", position: { x: 0, y: 180 }, data: { label: "Stage 1", subtitle: "", color: "#2A5F7C", shape: "rounded", fontSize: 12 } },
      { id: "h2", type: "diagram", position: { x: 180, y: 120 }, data: { label: "Stage 2", subtitle: "", color: "#2A5F7C", shape: "rounded", fontSize: 12 } },
      { id: "h3", type: "diagram", position: { x: 360, y: 60 }, data: { label: "Stage 3", subtitle: "", color: "#2A5F7C", shape: "rounded", fontSize: 12 } },
      { id: "h4", type: "diagram", position: { x: 540, y: 0 }, data: { label: "Stage 4", subtitle: "", color: "#2A5F7C", shape: "rounded", fontSize: 12 } },
    ],
    edges: [
      { id: "he1", source: "h1", target: "h2", type: "smoothstep", style: { stroke: "#B0CCE0", strokeWidth: 2 } },
      { id: "he2", source: "h2", target: "h3", type: "smoothstep", style: { stroke: "#B0CCE0", strokeWidth: 2 } },
      { id: "he3", source: "h3", target: "h4", type: "smoothstep", style: { stroke: "#B0CCE0", strokeWidth: 2 } },
    ],
  },
  {
    type: "process", category: "sequential",
    label: "Process Flow", description: "Sequential process with decision points",
    examples: "UBD backward design, Tyler's rationale",
    nodes: [
      { id: "p1", type: "diagram", position: { x: 0, y: 80 }, data: { label: "Start", color: "#2D6B5A", shape: "pill", fontSize: 12 } },
      { id: "p2", type: "diagram", position: { x: 170, y: 80 }, data: { label: "Process", color: "#2A5F7C", shape: "rounded", fontSize: 12 } },
      { id: "p3", type: "diagram", position: { x: 340, y: 80 }, data: { label: "Decision?", color: "#9E5A2A", shape: "diamond", fontSize: 11 } },
      { id: "p4", type: "diagram", position: { x: 520, y: 20 }, data: { label: "Path A", color: "#2A5F7C", shape: "rounded", fontSize: 12 } },
      { id: "p5", type: "diagram", position: { x: 520, y: 140 }, data: { label: "Path B", color: "#2A5F7C", shape: "rounded", fontSize: 12 } },
    ],
    edges: [
      { id: "pe1", source: "p1", target: "p2", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 1.5 } },
      { id: "pe2", source: "p2", target: "p3", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 1.5 } },
      { id: "pe3", source: "p3", target: "p4", type: "smoothstep", label: "Yes", style: { stroke: "#2D6B5A", strokeWidth: 1.5 } },
      { id: "pe4", source: "p3", target: "p5", type: "smoothstep", label: "No", style: { stroke: "#943D3D", strokeWidth: 1.5 } },
    ],
  },
  {
    type: "emergence", category: "sequential",
    label: "Emergence Ladder", description: "Each level requires all below it",
    examples: "Gravity → Instinct → Memory → Metacognition",
    nodes: [
      { id: "em1", type: "diagram", position: { x: 200, y: 400 }, data: { label: "Foundation", subtitle: "Base layer", color: "#6B6052", shape: "rounded", fontSize: 13 } },
      { id: "em2", type: "diagram", position: { x: 200, y: 300 }, data: { label: "Level 2", subtitle: "Requires foundation", color: "#7C6A2A", shape: "rounded", fontSize: 12 } },
      { id: "em3", type: "diagram", position: { x: 200, y: 200 }, data: { label: "Level 3", subtitle: "Requires levels below", color: "#2D6B5A", shape: "rounded", fontSize: 12 } },
      { id: "em4", type: "diagram", position: { x: 200, y: 100 }, data: { label: "Level 4", subtitle: "Emergent", color: "#2A5F7C", shape: "rounded", fontSize: 12 } },
      { id: "em5", type: "diagram", position: { x: 200, y: 0 }, data: { label: "Apex", subtitle: "Requires all below", color: "#6B3A6E", shape: "rounded", fontSize: 13 } },
      { id: "em-b", type: "diagram", position: { x: 420, y: 200 }, data: { label: "Branch", subtitle: "Splits from Level 3", color: "#943D3D", shape: "pill", fontSize: 11 } },
    ],
    edges: [
      { id: "eme1", source: "em1", target: "em2", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 2 } },
      { id: "eme2", source: "em2", target: "em3", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 2 } },
      { id: "eme3", source: "em3", target: "em4", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 2 } },
      { id: "eme4", source: "em4", target: "em5", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 2 } },
      { id: "eme-b", source: "em3", target: "em-b", type: "smoothstep", style: { stroke: "#943D3D80", strokeWidth: 1.5, strokeDasharray: "4 4" } },
    ],
  },
  {
    type: "timeline", category: "sequential",
    label: "Timeline", description: "Chronological progression with annotations",
    examples: "250-year curriculum history, acceleration curve",
    nodes: [
      { id: "t1", type: "diagram", position: { x: 0, y: 80 }, data: { label: "1780s", subtitle: "Jefferson", color: "#943D3D", shape: "rounded", fontSize: 12 } },
      { id: "t2", type: "diagram", position: { x: 180, y: 80 }, data: { label: "1890s", subtitle: "Dewey", color: "#943D3D", shape: "rounded", fontSize: 12 } },
      { id: "t3", type: "diagram", position: { x: 360, y: 80 }, data: { label: "1949", subtitle: "Tyler", color: "#943D3D", shape: "rounded", fontSize: 12 } },
      { id: "t4", type: "diagram", position: { x: 540, y: 80 }, data: { label: "2013", subtitle: "Fink", color: "#943D3D", shape: "rounded", fontSize: 12 } },
    ],
    edges: [
      { id: "te1", source: "t1", target: "t2", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 2 } },
      { id: "te2", source: "t2", target: "t3", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 2 } },
      { id: "te3", source: "t3", target: "t4", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 2 } },
    ],
  },

  // ═══ CLASSIFICATORY ═══
  {
    type: "taxonomy", category: "classificatory",
    label: "Taxonomy Pyramid", description: "Tiered pyramid with substrate layer",
    examples: "Bloom's taxonomy, memory-as-substrate",
    nodes: [
      { id: "tx1", type: "diagram", position: { x: 250, y: 0 }, data: { label: "Create", color: "#6B3A6E", shape: "rounded", fontSize: 12 } },
      { id: "tx2", type: "diagram", position: { x: 160, y: 80 }, data: { label: "Evaluate", color: "#2D6B5A", shape: "rounded", fontSize: 12 } },
      { id: "tx3", type: "diagram", position: { x: 340, y: 80 }, data: { label: "Analyze", color: "#2D6B5A", shape: "rounded", fontSize: 12 } },
      { id: "tx4", type: "diagram", position: { x: 80, y: 160 }, data: { label: "Apply", color: "#2A5F7C", shape: "rounded", fontSize: 12 } },
      { id: "tx5", type: "diagram", position: { x: 250, y: 160 }, data: { label: "Understand", color: "#2A5F7C", shape: "rounded", fontSize: 12 } },
      { id: "tx6", type: "diagram", position: { x: 420, y: 160 }, data: { label: "Remember", color: "#2A5F7C", shape: "rounded", fontSize: 12 } },
      { id: "tx-sub", type: "diagram", position: { x: 100, y: 260 }, data: { label: "SUBSTRATE: This layer permeates all levels above", color: "#7C6A2A", shape: "substrate", fontSize: 10 } },
    ],
    edges: [
      { id: "txe1", source: "tx2", target: "tx1", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 1.5 } },
      { id: "txe2", source: "tx3", target: "tx1", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 1.5 } },
      { id: "txe3", source: "tx4", target: "tx2", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 1 } },
      { id: "txe4", source: "tx5", target: "tx2", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 1 } },
      { id: "txe5", source: "tx5", target: "tx3", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 1 } },
      { id: "txe6", source: "tx6", target: "tx3", type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 1 } },
    ],
  },
  {
    type: "dual-axis", category: "classificatory",
    label: "Dual-Axis Spectrum", description: "Two-axis space with quadrants",
    examples: "Overexplored / underexplored identity, content vs cognition",
    nodes: [
      { id: "ax-h", type: "diagram", position: { x: 480, y: 200 }, data: { label: "→ Axis A", color: "#6B6052", shape: "pill", fontSize: 10 } },
      { id: "ax-v", type: "diagram", position: { x: 220, y: -10 }, data: { label: "↑ Axis B", color: "#6B6052", shape: "pill", fontSize: 10 } },
      { id: "q1", type: "diagram", position: { x: 350, y: 50 }, data: { label: "Quadrant I", subtitle: "High A, High B", color: "#2D6B5A", shape: "rounded", fontSize: 11 } },
      { id: "q2", type: "diagram", position: { x: 80, y: 50 }, data: { label: "Quadrant II", subtitle: "Low A, High B", color: "#2A5F7C", shape: "rounded", fontSize: 11 } },
      { id: "q3", type: "diagram", position: { x: 80, y: 280 }, data: { label: "Quadrant III", subtitle: "Low A, Low B", color: "#943D3D", shape: "rounded", fontSize: 11 } },
      { id: "q4", type: "diagram", position: { x: 350, y: 280 }, data: { label: "Quadrant IV", subtitle: "High A, Low B", color: "#9E5A2A", shape: "rounded", fontSize: 11 } },
    ],
    edges: [],
  },
  {
    type: "comparison", category: "classificatory",
    label: "Comparison Panel", description: "Side-by-side with cross-links",
    examples: "Thermometer vs thermostat, content vs metacognition",
    nodes: [
      { id: "ca", type: "diagram", position: { x: 0, y: 0 }, data: { label: "Framework A", color: "#2A5F7C", shape: "rounded", fontSize: 14 } },
      { id: "cb", type: "diagram", position: { x: 350, y: 0 }, data: { label: "Framework B", color: "#9E5A2A", shape: "rounded", fontSize: 14 } },
      { id: "ca1", type: "diagram", position: { x: 0, y: 100 }, data: { label: "Feature 1", color: "#2A5F7C", shape: "pill", fontSize: 11 } },
      { id: "cb1", type: "diagram", position: { x: 350, y: 100 }, data: { label: "Feature 1", color: "#9E5A2A", shape: "pill", fontSize: 11 } },
      { id: "ca2", type: "diagram", position: { x: 0, y: 180 }, data: { label: "Feature 2", color: "#2A5F7C", shape: "pill", fontSize: 11 } },
      { id: "cb2", type: "diagram", position: { x: 350, y: 180 }, data: { label: "Feature 2", color: "#9E5A2A", shape: "pill", fontSize: 11 } },
    ],
    edges: [
      { id: "cae1", source: "ca", target: "ca1", type: "smoothstep", style: { stroke: "#B0CCE0", strokeWidth: 1 } },
      { id: "cae2", source: "ca", target: "ca2", type: "smoothstep", style: { stroke: "#B0CCE0", strokeWidth: 1 } },
      { id: "cbe1", source: "cb", target: "cb1", type: "smoothstep", style: { stroke: "#D4B89C", strokeWidth: 1 } },
      { id: "cbe2", source: "cb", target: "cb2", type: "smoothstep", style: { stroke: "#D4B89C", strokeWidth: 1 } },
      { id: "cx1", source: "ca1", target: "cb1", type: "straight", label: "differs", animated: true, style: { stroke: "#D4C9B8", strokeWidth: 1, strokeDasharray: "4 4" } },
      { id: "cx2", source: "ca2", target: "cb2", type: "straight", label: "inverts", animated: true, style: { stroke: "#D4C9B8", strokeWidth: 1, strokeDasharray: "4 4" } },
    ],
  },

  // ═══ CYCLICAL ═══
  {
    type: "directed-cycle", category: "cyclical",
    label: "Directed Cycle", description: "Circular loop with intervention points",
    examples: "Wheeler, Nicholls, cognitive oppression cycle",
    nodes: (() => {
      const labels = ["Stage 1\nInternalization", "Stage 2\nExternalization", "Stage 3\nInstitutional", "Stage 4\nInterpersonal"];
      const r = 160, cx = 220, cy = 200;
      return [
        ...labels.map((label, i) => {
          const angle = (2 * Math.PI * i) / labels.length - Math.PI / 2;
          return { id: `cy${i}`, type: "diagram", position: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }, data: { label: label.split("\n")[0], subtitle: label.split("\n")[1] || "", color: "#943D3D", shape: "rounded", fontSize: 12 } };
        }),
        { id: "cy-int", type: "diagram", position: { x: cx + 250, y: cy - 60 }, data: { label: "Intervention", subtitle: "Break the cycle here", color: "#2D6B5A", shape: "intervention", fontSize: 11 } },
      ];
    })(),
    edges: [
      { id: "cye0", source: "cy0", target: "cy1", type: "smoothstep", animated: true, style: { stroke: "#943D3D80", strokeWidth: 2 } },
      { id: "cye1", source: "cy1", target: "cy2", type: "smoothstep", animated: true, style: { stroke: "#943D3D80", strokeWidth: 2 } },
      { id: "cye2", source: "cy2", target: "cy3", type: "smoothstep", animated: true, style: { stroke: "#943D3D80", strokeWidth: 2 } },
      { id: "cye3", source: "cy3", target: "cy0", type: "smoothstep", animated: true, style: { stroke: "#943D3D80", strokeWidth: 2 } },
      { id: "cye-int", source: "cy-int", target: "cy1", type: "straight", style: { stroke: "#2D6B5A", strokeWidth: 2, strokeDasharray: "6 4" } },
    ],
  },
  {
    type: "multi-cycle", category: "cyclical",
    label: "Multi-Scale Cycle", description: "Nested cycles at different scales",
    examples: "Infinite simultaneous cycles — individual to societal",
    nodes: (() => {
      const layers = [
        { prefix: "i", r: 80, color: "#2A5F7C", labels: ["Internalize", "Externalize", "Accumulate", "Re-enter"], label: "Individual" },
        { prefix: "m", r: 160, color: "#9E5A2A", labels: ["Internalize", "Externalize", "Accumulate", "Re-enter"], label: "Institutional" },
        { prefix: "o", r: 240, color: "#6B3A6E", labels: ["Internalize", "Externalize", "Accumulate", "Re-enter"], label: "Societal" },
      ];
      const cx = 300, cy = 280;
      const nodes = [];
      for (const layer of layers) {
        layer.labels.forEach((lbl, i) => {
          const angle = (2 * Math.PI * i) / layer.labels.length - Math.PI / 2;
          nodes.push({
            id: `${layer.prefix}${i}`, type: "diagram",
            position: { x: cx + layer.r * Math.cos(angle), y: cy + layer.r * Math.sin(angle) },
            data: { label: lbl, subtitle: layer.label, color: layer.color, shape: "pill", fontSize: 10, ring: layers.indexOf(layer) },
          });
        });
      }
      return nodes;
    })(),
    edges: (() => {
      const edges = [];
      for (const prefix of ["i", "m", "o"]) {
        const color = prefix === "i" ? "#2A5F7C" : prefix === "m" ? "#9E5A2A" : "#6B3A6E";
        for (let i = 0; i < 4; i++) {
          edges.push({
            id: `${prefix}e${i}`, source: `${prefix}${i}`, target: `${prefix}${(i + 1) % 4}`,
            type: "smoothstep", animated: true, style: { stroke: `${color}70`, strokeWidth: 1.5 },
          });
        }
      }
      return edges;
    })(),
  },
  {
    type: "spiral", category: "cyclical",
    label: "Spiral", description: "Revisiting themes at expanding depth",
    examples: "Bruner's spiral curriculum",
    nodes: (() => {
      const themes = ["Theme A", "Theme B", "Theme C", "Theme A+", "Theme B+", "Theme C+", "Theme A++"];
      const cx = 300, cy = 280, startR = 50, growth = 35;
      return themes.map((label, i) => {
        const angle = (Math.PI * 0.7) * i;
        const r = startR + growth * i;
        return {
          id: `sp${i}`, type: "diagram",
          position: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) },
          data: { label, subtitle: `Depth ${Math.floor(i / 3) + 1}`, color: ["#2A5F7C", "#2D6B5A", "#9E5A2A"][i % 3], shape: "rounded", fontSize: 11 },
        };
      });
    })(),
    edges: (() => {
      const edges = [];
      for (let i = 0; i < 6; i++) {
        edges.push({
          id: `spe${i}`, source: `sp${i}`, target: `sp${i + 1}`,
          type: "smoothstep", animated: true, style: { stroke: "#D4C9B8", strokeWidth: 1.5 },
        });
      }
      return edges;
    })(),
  },

  // ═══ RELATIONAL ═══
  {
    type: "orrery", category: "relational",
    label: "Orrery", description: "Central node with orbiting concepts, no hierarchy",
    examples: "Fink's significant learning, 6 metacognitive habits",
    nodes: (() => {
      const orbiters = ["Concept A", "Concept B", "Concept C", "Concept D", "Concept E", "Concept F"];
      const cx = 250, cy = 220, r = 180;
      return [
        { id: "or0", type: "diagram", position: { x: cx, y: cy }, data: { label: "Core Idea", color: "#2D6B5A", shape: "circle", fontSize: 14 } },
        ...orbiters.map((label, i) => {
          const angle = (2 * Math.PI * i) / orbiters.length - Math.PI / 2;
          return { id: `or${i + 1}`, type: "diagram", position: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }, data: { label, color: "#9E5A2A", shape: "pill", fontSize: 12 } };
        }),
      ];
    })(),
    edges: (() => {
      const edges = [];
      for (let i = 1; i <= 6; i++) {
        edges.push({ id: `ore${i}`, source: "or0", target: `or${i}`, type: "straight", animated: true, style: { stroke: "#D4C9B8", strokeWidth: 1.5 } });
      }
      // Inter-satellite connections
      edges.push({ id: "ore-s1", source: "or1", target: "or2", type: "straight", style: { stroke: "#D4C9B820", strokeWidth: 1 } });
      edges.push({ id: "ore-s2", source: "or3", target: "or4", type: "straight", style: { stroke: "#D4C9B820", strokeWidth: 1 } });
      return edges;
    })(),
  },
  {
    type: "knowledge-graph", category: "relational",
    label: "Knowledge Graph", description: "Force-directed living network — nodes reorganize dynamically",
    examples: "The fifth sequence model — every node can change any other",
    nodes: [
      { id: "kg1", type: "diagram", position: { x: 200, y: 100 }, data: { label: "Concept A", color: "#2A5F7C", shape: "circle", fontSize: 12 } },
      { id: "kg2", type: "diagram", position: { x: 400, y: 80 }, data: { label: "Concept B", color: "#2D6B5A", shape: "circle", fontSize: 12 } },
      { id: "kg3", type: "diagram", position: { x: 150, y: 280 }, data: { label: "Concept C", color: "#9E5A2A", shape: "circle", fontSize: 12 } },
      { id: "kg4", type: "diagram", position: { x: 350, y: 300 }, data: { label: "Concept D", color: "#6B3A6E", shape: "circle", fontSize: 12 } },
      { id: "kg5", type: "diagram", position: { x: 300, y: 180 }, data: { label: "Concept E", color: "#943D3D", shape: "circle", fontSize: 12 } },
      { id: "kg6", type: "diagram", position: { x: 100, y: 180 }, data: { label: "Concept F", color: "#7C6A2A", shape: "circle", fontSize: 12 } },
      { id: "kg7", type: "diagram", position: { x: 450, y: 200 }, data: { label: "New Node", subtitle: "Add me to see ripple", color: "#2A5F7C", shape: "circle", fontSize: 11 } },
    ],
    edges: [
      { id: "kge1", source: "kg1", target: "kg2", type: "straight", animated: true, style: { stroke: "#D4C9B8", strokeWidth: 1.5 } },
      { id: "kge2", source: "kg1", target: "kg5", type: "straight", animated: true, style: { stroke: "#D4C9B8", strokeWidth: 1.5 } },
      { id: "kge3", source: "kg2", target: "kg4", type: "straight", animated: true, style: { stroke: "#D4C9B8", strokeWidth: 1.5 } },
      { id: "kge4", source: "kg3", target: "kg5", type: "straight", animated: true, style: { stroke: "#D4C9B8", strokeWidth: 1.5 } },
      { id: "kge5", source: "kg3", target: "kg6", type: "straight", animated: true, style: { stroke: "#D4C9B8", strokeWidth: 1.5 } },
      { id: "kge6", source: "kg4", target: "kg5", type: "straight", animated: true, style: { stroke: "#D4C9B8", strokeWidth: 1.5 } },
      { id: "kge7", source: "kg5", target: "kg7", type: "straight", animated: true, style: { stroke: "#2A5F7C60", strokeWidth: 1 } },
      { id: "kge8", source: "kg6", target: "kg1", type: "straight", animated: true, style: { stroke: "#D4C9B8", strokeWidth: 1.5 } },
      { id: "kge9", source: "kg7", target: "kg2", type: "straight", animated: true, style: { stroke: "#2A5F7C60", strokeWidth: 1 } },
    ],
  },
  {
    type: "force-diagram", category: "relational",
    label: "Force Diagram", description: "Push-pull dynamics on a contested center",
    examples: "Curricular change forces, Apple's coalition",
    nodes: [
      { id: "fd-c", type: "diagram", position: { x: 250, y: 180 }, data: { label: "Contested\nCenter", color: "#7C6A2A", shape: "hexagon", fontSize: 13 } },
      { id: "fd-l1", type: "diagram", position: { x: 20, y: 100 }, data: { label: "Force A", subtitle: "Progressive", color: "#2D6B5A", shape: "rounded", fontSize: 11 } },
      { id: "fd-l2", type: "diagram", position: { x: 20, y: 260 }, data: { label: "Force B", subtitle: "Bottom-up", color: "#2D6B5A", shape: "rounded", fontSize: 11 } },
      { id: "fd-r1", type: "diagram", position: { x: 450, y: 100 }, data: { label: "Force C", subtitle: "Conservative", color: "#943D3D", shape: "rounded", fontSize: 11 } },
      { id: "fd-r2", type: "diagram", position: { x: 450, y: 260 }, data: { label: "Force D", subtitle: "Top-down", color: "#943D3D", shape: "rounded", fontSize: 11 } },
    ],
    edges: [
      { id: "fde1", source: "fd-l1", target: "fd-c", type: "straight", animated: true, label: "pulls ←", style: { stroke: "#2D6B5A", strokeWidth: 2.5 } },
      { id: "fde2", source: "fd-l2", target: "fd-c", type: "straight", animated: true, label: "pulls ←", style: { stroke: "#2D6B5A", strokeWidth: 2 } },
      { id: "fde3", source: "fd-r1", target: "fd-c", type: "straight", animated: true, label: "→ pulls", style: { stroke: "#943D3D", strokeWidth: 2.5 } },
      { id: "fde4", source: "fd-r2", target: "fd-c", type: "straight", animated: true, label: "→ pulls", style: { stroke: "#943D3D", strokeWidth: 2 } },
    ],
  },

  // ═══ SPATIAL ═══
  {
    type: "concentric", category: "spatial",
    label: "Concentric Regions", description: "Nested rings with labeled boundaries",
    examples: "Noemascape, Bronfenbrenner's systems",
    nodes: (() => {
      const cx = 280, cy = 260;
      return [
        { id: "cc0", type: "diagram", position: { x: cx, y: cy }, data: { label: "Core", subtitle: "Innermost", color: "#6B3A6E", shape: "circle", fontSize: 13, ring: 0 } },
        { id: "cc1a", type: "diagram", position: { x: cx - 100, y: cy - 80 }, data: { label: "Inner A", color: "#2A5F7C", shape: "pill", fontSize: 11, ring: 1 } },
        { id: "cc1b", type: "diagram", position: { x: cx + 100, y: cy + 60 }, data: { label: "Inner B", color: "#2A5F7C", shape: "pill", fontSize: 11, ring: 1 } },
        { id: "cc2a", type: "diagram", position: { x: cx - 180, y: cy - 160 }, data: { label: "Middle A", color: "#2D6B5A", shape: "pill", fontSize: 11, ring: 2 } },
        { id: "cc2b", type: "diagram", position: { x: cx + 180, y: cy - 80 }, data: { label: "Middle B", color: "#2D6B5A", shape: "pill", fontSize: 11, ring: 2 } },
        { id: "cc2c", type: "diagram", position: { x: cx, y: cy + 170 }, data: { label: "Middle C", color: "#2D6B5A", shape: "pill", fontSize: 11, ring: 2 } },
        { id: "cc3a", type: "diagram", position: { x: cx - 260, y: cy }, data: { label: "Outer A", color: "#9E5A2A", shape: "pill", fontSize: 11, ring: 3 } },
        { id: "cc3b", type: "diagram", position: { x: cx + 260, y: cy + 140 }, data: { label: "Outer B", color: "#9E5A2A", shape: "pill", fontSize: 11, ring: 3 } },
        // Ring boundaries (label-only nodes)
        { id: "ccr1", type: "diagram", position: { x: cx + 130, y: cy - 130 }, data: { label: "— Inner Ring —", color: "#2A5F7C", shape: "substrate", fontSize: 9 } },
        { id: "ccr2", type: "diagram", position: { x: cx - 220, y: cy + 130 }, data: { label: "— Middle Ring —", color: "#2D6B5A", shape: "substrate", fontSize: 9 } },
        { id: "ccr3", type: "diagram", position: { x: cx + 200, y: cy - 200 }, data: { label: "— Outer Ring —", color: "#9E5A2A", shape: "substrate", fontSize: 9 } },
      ];
    })(),
    edges: [
      { id: "cce1", source: "cc0", target: "cc1a", type: "straight", style: { stroke: "#D4C9B840", strokeWidth: 1 } },
      { id: "cce2", source: "cc0", target: "cc1b", type: "straight", style: { stroke: "#D4C9B840", strokeWidth: 1 } },
      { id: "cce3", source: "cc1a", target: "cc2a", type: "straight", style: { stroke: "#D4C9B830", strokeWidth: 1, strokeDasharray: "3 3" } },
      { id: "cce4", source: "cc1b", target: "cc2b", type: "straight", style: { stroke: "#D4C9B830", strokeWidth: 1, strokeDasharray: "3 3" } },
      { id: "cce5", source: "cc1b", target: "cc2c", type: "straight", style: { stroke: "#D4C9B830", strokeWidth: 1, strokeDasharray: "3 3" } },
    ],
  },
];

// ── Template Picker Component ────────────────────────────

export default function DiagramTemplates({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState("sequential");

  const filteredTemplates = TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(44,36,24,0.4)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "modalBackdropIn 200ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 720, maxHeight: "85vh", background: P.bg,
          border: `1px solid ${P.bd}`, borderRadius: 12,
          boxShadow: "0 20px 60px rgba(44,36,24,0.2)",
          overflow: "hidden", animation: "modalIn 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: `1px solid ${P.bd}`, flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: P.tx }}>
              Choose a Template
            </div>
            <div style={{ fontSize: 11, color: P.tf, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
              Organized by your thesis's five sequence models
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: P.t3, cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Category tabs */}
        <div style={{
          display: "flex", gap: 2, padding: "8px 20px", borderBottom: `1px solid ${P.bl}`,
          background: P.sf, flexShrink: 0,
        }}>
          {Object.entries(DIAGRAM_CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              style={{
                padding: "6px 14px", borderRadius: 4, fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace", border: "none",
                background: activeCategory === key ? P.ac : "transparent",
                color: activeCategory === key ? "#fff" : P.tm,
                cursor: "pointer", transition: "all 0.15s", letterSpacing: 0.5,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Category description */}
        <div style={{ padding: "8px 20px", fontSize: 11, color: P.tf, fontFamily: "'Spectral', serif", fontStyle: "italic", borderBottom: `1px solid ${P.bl}`, flexShrink: 0 }}>
          {DIAGRAM_CATEGORIES[activeCategory]?.description}
        </div>

        {/* Template grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
          padding: 20, overflowY: "auto", flex: 1,
        }}>
          {filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.type}
              onClick={() => {
                const ts = Date.now();
                const idMap = {};
                const newNodes = tmpl.nodes.map((n, i) => {
                  const newId = `n-${ts}-${i}`;
                  idMap[n.id] = newId;
                  return { ...n, id: newId };
                });
                const newEdges = tmpl.edges.map((e, i) => ({
                  ...e,
                  id: `e-${ts}-${i}`,
                  source: idMap[e.source] || e.source,
                  target: idMap[e.target] || e.target,
                }));
                onSelect(newNodes, newEdges, tmpl.type);
              }}
              style={{
                padding: 14, borderRadius: 8,
                border: `1px solid ${P.bd}`, background: P.sf,
                cursor: "pointer", transition: "all 0.2s",
                display: "flex", flexDirection: "column", gap: 8,
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = P.ac; e.currentTarget.style.boxShadow = `0 4px 16px ${P.ac}15`; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = P.bd; e.currentTarget.style.boxShadow = "none"; }}
            >
              {/* Mini preview */}
              <div style={{
                width: "100%", height: 75, borderRadius: 6,
                background: P.bg, border: `1px solid ${P.bl}`,
                overflow: "hidden", position: "relative",
              }}>
                <MiniPreview nodes={tmpl.nodes} edges={tmpl.edges} />
              </div>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 600, color: P.tx }}>
                  {tmpl.label}
                </div>
                <div style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.4 }}>
                  {tmpl.description}
                </div>
                {tmpl.examples && (
                  <div style={{ fontSize: 9, color: P.t3, fontFamily: "'Spectral', serif", fontStyle: "italic", marginTop: 3 }}>
                    e.g. {tmpl.examples}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SVG mini-preview ──────────────────────────────────────

function MiniPreview({ nodes, edges }) {
  if (!nodes.length) return null;

  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const minX = Math.min(...xs) - 30;
  const minY = Math.min(...ys) - 30;
  const maxX = Math.max(...xs) + 130;
  const maxY = Math.max(...ys) + 80;
  const w = maxX - minX;
  const h = maxY - minY;

  const nodeMap = {};
  nodes.forEach((n) => { nodeMap[n.id] = n; });

  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} style={{ width: "100%", height: "100%" }}>
      {edges.map((e) => {
        const src = nodeMap[e.source];
        const tgt = nodeMap[e.target];
        if (!src || !tgt) return null;
        const color = e.style?.stroke || "#D4C9B8";
        return (
          <line
            key={e.id}
            x1={src.position.x + 50} y1={src.position.y + 25}
            x2={tgt.position.x + 50} y2={tgt.position.y + 25}
            stroke={`${color}60`} strokeWidth={2}
          />
        );
      })}
      {nodes.map((n) => {
        const color = n.data?.color || P.ac;
        const shape = n.data?.shape;
        if (shape === "circle" || shape === "ring") {
          return <circle key={n.id} cx={n.position.x + 50} cy={n.position.y + 25} r={18} fill={`${color}15`} stroke={`${color}50`} strokeWidth={1.5} />;
        }
        if (shape === "substrate") {
          return <rect key={n.id} x={n.position.x} y={n.position.y + 8} width={100} height={20} rx={3} fill={`${color}08`} stroke={`${color}30`} strokeWidth={1} strokeDasharray="3 3" />;
        }
        if (shape === "hexagon") {
          const cx = n.position.x + 50, cy = n.position.y + 25, r = 16;
          const pts = Array.from({ length: 6 }, (_, i) => {
            const a = (Math.PI / 3) * i - Math.PI / 6;
            return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
          }).join(" ");
          return <polygon key={n.id} points={pts} fill={`${color}15`} stroke={`${color}50`} strokeWidth={1.5} />;
        }
        return (
          <rect
            key={n.id}
            x={n.position.x + 20} y={n.position.y + 10}
            width={60} height={30}
            rx={shape === "pill" ? 15 : shape === "diamond" ? 2 : 6}
            fill={`${color}15`} stroke={`${color}50`} strokeWidth={1.5}
            transform={shape === "diamond" ? `rotate(45 ${n.position.x + 50} ${n.position.y + 25})` : undefined}
          />
        );
      })}
    </svg>
  );
}
