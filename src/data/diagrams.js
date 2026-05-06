// Diagram types — organized by thesis meta-framework
export const DIAGRAM_CATEGORIES = {
  sequential: { label: "Sequential", description: "One-directional flow" },
  classificatory: { label: "Classificatory", description: "Organizing by type" },
  cyclical: { label: "Cyclical", description: "Looping & returning" },
  relational: { label: "Relational", description: "Non-directional connections" },
  spatial: { label: "Spatial", description: "Dimensional & topological" },
};

export const DIAGRAM_TYPES = {
  // Sequential
  hierarchy:       { label: "Staircase Hierarchy", category: "sequential", icon: "GitBranch", description: "Ascending stages or levels", examples: "Piaget, Tyler, Bruner" },
  process:         { label: "Process Flow", category: "sequential", icon: "ArrowRight", description: "Sequential process with decisions", examples: "UBD backward design, Tyler's rationale" },
  emergence:       { label: "Emergence Ladder", category: "sequential", icon: "Layers", description: "Each level requires all below", examples: "Gravity → Instinct → Memory → Metacognition" },
  timeline:        { label: "Timeline", category: "sequential", icon: "Clock", description: "Chronological progression", examples: "250-year curriculum history" },
  // Classificatory
  taxonomy:        { label: "Taxonomy Pyramid", category: "classificatory", icon: "Triangle", description: "Tiered pyramid with substrate layer", examples: "Bloom's taxonomy, memory-as-substrate" },
  "dual-axis":     { label: "Dual-Axis Spectrum", category: "classificatory", icon: "Crosshair", description: "Two-axis space with quadrants", examples: "Overexplored/underexplored identity" },
  comparison:      { label: "Comparison Panel", category: "classificatory", icon: "Columns2", description: "Side-by-side with cross-links", examples: "Thermometer vs thermostat, content vs metacognition" },
  // Cyclical
  "directed-cycle":{ label: "Directed Cycle", category: "cyclical", icon: "RefreshCw", description: "Circular loop with intervention points", examples: "Wheeler, Nicholls, oppression cycle" },
  "multi-cycle":   { label: "Multi-Scale Cycle", category: "cyclical", icon: "Disc", description: "Nested cycles at different scales", examples: "Infinite simultaneous cycles — individual to societal" },
  spiral:          { label: "Spiral", category: "cyclical", icon: "Radar", description: "Revisiting themes at expanding depth", examples: "Bruner's spiral curriculum" },
  // Relational
  orrery:          { label: "Orrery", category: "relational", icon: "Sun", description: "Central node with orbiting concepts, no hierarchy", examples: "Fink's significant learning, 6 metacognitive habits" },
  "knowledge-graph":{ label: "Knowledge Graph", category: "relational", icon: "Network", description: "Force-directed living network", examples: "The fifth sequence model — every node changes any other" },
  "force-diagram": { label: "Force Diagram", category: "relational", icon: "Magnet", description: "Push-pull dynamics on a contested center", examples: "Curricular change forces, Apple's coalition" },
  // Spatial
  concentric:      { label: "Concentric Regions", category: "spatial", icon: "CircleDot", description: "Nested rings with labeled boundaries", examples: "Noemascape, Bronfenbrenner's systems" },
};

export const DIAGRAM_NODE_SHAPES = {
  rounded: { label: "Rounded" },
  pill: { label: "Pill" },
  diamond: { label: "Diamond" },
  circle: { label: "Circle" },
  ring: { label: "Ring" },
  substrate: { label: "Substrate" },
  intervention: { label: "Intervention" },
  hexagon: { label: "Hexagon" },
};

export function createDiagram(overrides = {}) {
  const now = Date.now();
  return {
    id: `diag-${now}`,
    title: "Untitled Diagram",
    type: "hierarchy",
    projectId: null,
    sectionId: null,
    afterParagraphId: null,
    nodes: [],
    edges: [],
    layout: "TB",
    viewport: { x: 0, y: 0, zoom: 1 },
    width: 600,
    height: 400,
    display: "float",
    floatWidth: 320,
    caption: "",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Arrow marker for directed edges
const ARROW = { type: "arrowclosed" };

// Pre-built starter diagrams
export const DEFAULT_DIAGRAMS = [
  {
    id: "diag-piaget",
    title: "Piaget's Developmental Stages",
    type: "hierarchy",
    projectId: "purpose-of-schools",
    sectionId: "hierarchy",
    afterParagraphId: "hierarchy-p2",
    layout: "LR",
    display: "float",
    floatWidth: 360,
    width: 600,
    height: 300,
    viewport: { x: 0, y: 0, zoom: 1 },
    caption: "Piaget's four-stage model of cognitive development",
    nodes: [
      { id: "pn1", type: "diagram", position: { x: 0, y: 0 }, data: { label: "Sensorimotor", subtitle: "0–2 years", color: "#2A5F7C", shape: "rounded", fontSize: 13 } },
      { id: "pn2", type: "diagram", position: { x: 200, y: 0 }, data: { label: "Preoperational", subtitle: "2–7 years", color: "#2A5F7C", shape: "rounded", fontSize: 13 } },
      { id: "pn3", type: "diagram", position: { x: 400, y: 0 }, data: { label: "Concrete Operational", subtitle: "7–11 years", color: "#2A5F7C", shape: "rounded", fontSize: 13 } },
      { id: "pn4", type: "diagram", position: { x: 600, y: 0 }, data: { label: "Formal Operational", subtitle: "11+ years", color: "#2A5F7C", shape: "rounded", fontSize: 13 } },
    ],
    edges: [
      { id: "pe1", source: "pn1", target: "pn2", type: "smoothstep", animated: false, markerEnd: ARROW, style: { stroke: "#2A5F7C40", strokeWidth: 2 } },
      { id: "pe2", source: "pn2", target: "pn3", type: "smoothstep", animated: false, markerEnd: ARROW, style: { stroke: "#2A5F7C40", strokeWidth: 2 } },
      { id: "pe3", source: "pn3", target: "pn4", type: "smoothstep", animated: false, markerEnd: ARROW, style: { stroke: "#2A5F7C40", strokeWidth: 2 } },
    ],
    createdAt: 1712100000000,
    updatedAt: 1712100000000,
  },
  {
    id: "diag-fink",
    title: "Fink's Significant Learning",
    type: "radial",
    projectId: "purpose-of-schools",
    sectionId: "orrery",
    afterParagraphId: "orrery-p4",
    layout: "TB",
    display: "float",
    floatWidth: 380,
    width: 600,
    height: 500,
    viewport: { x: 0, y: 0, zoom: 1 },
    caption: "Fink's model of Significant Learning — six interdependent dimensions orbiting a central purpose",
    nodes: [
      { id: "fn0", type: "diagram", position: { x: 250, y: 200 }, data: { label: "Significant Learning", subtitle: "", color: "#2D6B5A", shape: "circle", fontSize: 14 } },
      { id: "fn1", type: "diagram", position: { x: 250, y: 0 }, data: { label: "Foundational Knowledge", subtitle: "", color: "#9E5A2A", shape: "pill", fontSize: 13 } },
      { id: "fn2", type: "diagram", position: { x: 460, y: 100 }, data: { label: "Application", subtitle: "", color: "#9E5A2A", shape: "pill", fontSize: 13 } },
      { id: "fn3", type: "diagram", position: { x: 460, y: 300 }, data: { label: "Integration", subtitle: "", color: "#9E5A2A", shape: "pill", fontSize: 13 } },
      { id: "fn4", type: "diagram", position: { x: 250, y: 400 }, data: { label: "Human Dimension", subtitle: "", color: "#9E5A2A", shape: "pill", fontSize: 13 } },
      { id: "fn5", type: "diagram", position: { x: 40, y: 300 }, data: { label: "Caring", subtitle: "", color: "#9E5A2A", shape: "pill", fontSize: 13 } },
      { id: "fn6", type: "diagram", position: { x: 40, y: 100 }, data: { label: "Learning How to Learn", subtitle: "", color: "#9E5A2A", shape: "pill", fontSize: 13 } },
    ],
    edges: [
      { id: "fe1", source: "fn0", target: "fn1", type: "straight", animated: true, style: { stroke: "#9E5A2A40", strokeWidth: 2 } },
      { id: "fe2", source: "fn0", target: "fn2", type: "straight", animated: true, style: { stroke: "#9E5A2A40", strokeWidth: 2 } },
      { id: "fe3", source: "fn0", target: "fn3", type: "straight", animated: true, style: { stroke: "#9E5A2A40", strokeWidth: 2 } },
      { id: "fe4", source: "fn0", target: "fn4", type: "straight", animated: true, style: { stroke: "#9E5A2A40", strokeWidth: 2 } },
      { id: "fe5", source: "fn0", target: "fn5", type: "straight", animated: true, style: { stroke: "#9E5A2A40", strokeWidth: 2 } },
      { id: "fe6", source: "fn0", target: "fn6", type: "straight", animated: true, style: { stroke: "#9E5A2A40", strokeWidth: 2 } },
    ],
    createdAt: 1712100000000,
    updatedAt: 1712100000000,
  },

  // ── Bloom's Taxonomy Pyramid (CLASSIFICATORY) ──
  // Clean tiered pyramid — the conventional (mis)reading. Substrate layer = thesis critique.
  {
    id: "diag-bloom",
    title: "Bloom's Taxonomy",
    type: "taxonomy",
    projectId: "purpose-of-schools",
    sectionId: "taxonomy",
    afterParagraphId: "taxonomy-p3",
    layout: "TB",
    display: "inline",
    floatWidth: 320,
    width: 600,
    height: 360,
    viewport: { x: 0, y: 0, zoom: 1 },
    caption: "Bloom's Taxonomy — traditionally rendered as a pyramid, but memory is the substrate of all levels",
    nodes: [
      // Tier 1: apex (1 node, centered)
      { id: "bl1", type: "diagram", position: { x: 248, y: 10 }, data: { label: "Create", color: "#6B3A6E", shape: "rounded", fontSize: 14 } },
      // Tier 2: middle (2 nodes, centered)
      { id: "bl2", type: "diagram", position: { x: 165, y: 80 }, data: { label: "Evaluate", color: "#2D6B5A", shape: "rounded", fontSize: 13 } },
      { id: "bl3", type: "diagram", position: { x: 330, y: 80 }, data: { label: "Analyze", color: "#2D6B5A", shape: "rounded", fontSize: 13 } },
      // Tier 3: base (3 nodes, full width)
      { id: "bl4", type: "diagram", position: { x: 80, y: 150 }, data: { label: "Apply", color: "#2A5F7C", shape: "rounded", fontSize: 13 } },
      { id: "bl5", type: "diagram", position: { x: 245, y: 150 }, data: { label: "Understand", color: "#2A5F7C", shape: "rounded", fontSize: 13 } },
      { id: "bl6", type: "diagram", position: { x: 410, y: 150 }, data: { label: "Remember", color: "#2A5F7C", shape: "rounded", fontSize: 13 } },
      // Substrate: spans full pyramid width — the thesis critique
      { id: "bl-sub", type: "diagram", position: { x: 65, y: 240 }, data: { label: "MEMORY — substrate of all cognition, not a \"low-level\" skill", color: "#7C6A2A", shape: "substrate", fontSize: 11 } },
    ],
    edges: [
      // Upward "climb" edges with arrowheads — showing the conventional interpretation
      { id: "ble1", source: "bl4", target: "bl2", type: "smoothstep", markerEnd: ARROW, style: { stroke: "#2A5F7C40", strokeWidth: 2 } },
      { id: "ble2", source: "bl5", target: "bl2", type: "smoothstep", markerEnd: ARROW, style: { stroke: "#2A5F7C40", strokeWidth: 2 } },
      { id: "ble3", source: "bl5", target: "bl3", type: "smoothstep", markerEnd: ARROW, style: { stroke: "#2A5F7C40", strokeWidth: 2 } },
      { id: "ble4", source: "bl6", target: "bl3", type: "smoothstep", markerEnd: ARROW, style: { stroke: "#2A5F7C40", strokeWidth: 2 } },
      { id: "ble5", source: "bl2", target: "bl1", type: "smoothstep", markerEnd: ARROW, style: { stroke: "#2D6B5A40", strokeWidth: 2 } },
      { id: "ble6", source: "bl3", target: "bl1", type: "smoothstep", markerEnd: ARROW, style: { stroke: "#2D6B5A40", strokeWidth: 2 } },
    ],
    createdAt: 1712100000000,
    updatedAt: 1712100000000,
  },

  // ── Wheeler's Curriculum Cycle (CYCLICAL) ──
  {
    id: "diag-wheeler",
    title: "Wheeler's Curriculum Cycle",
    type: "directed-cycle",
    projectId: "purpose-of-schools",
    sectionId: "cyclical",
    afterParagraphId: "cyclical-p5",
    layout: "TB",
    display: "inline",
    floatWidth: 320,
    width: 600,
    height: 400,
    viewport: { x: 0, y: 0, zoom: 1 },
    caption: "Wheeler's cyclical model — influence flows in one temporal direction, looping back at completion",
    nodes: (() => {
      const labels = ["Learning\nExperiences", "Aims, Goals\n& Objectives", "Organization\nof Content", "Evaluation\n& Assessment"];
      const r = 150, cx = 220, cy = 200;
      return labels.map((label, i) => {
        const angle = (2 * Math.PI * i) / labels.length - Math.PI / 2;
        return {
          id: `wh${i}`, type: "diagram",
          position: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) },
          data: { label: label.split("\n")[0], subtitle: label.split("\n")[1] || "", color: "#9E5A2A", shape: "rounded", fontSize: 13 },
        };
      });
    })(),
    edges: [
      { id: "whe0", source: "wh0", target: "wh1", type: "smoothstep", animated: true, markerEnd: ARROW, style: { stroke: "#9E5A2A60", strokeWidth: 2 } },
      { id: "whe1", source: "wh1", target: "wh2", type: "smoothstep", animated: true, markerEnd: ARROW, style: { stroke: "#9E5A2A60", strokeWidth: 2 } },
      { id: "whe2", source: "wh2", target: "wh3", type: "smoothstep", animated: true, markerEnd: ARROW, style: { stroke: "#9E5A2A60", strokeWidth: 2 } },
      { id: "whe3", source: "wh3", target: "wh0", type: "smoothstep", animated: true, markerEnd: ARROW, style: { stroke: "#9E5A2A60", strokeWidth: 2 } },
    ],
    createdAt: 1712100000000,
    updatedAt: 1712100000000,
  },

  // ── Knowledge Graph (RELATIONAL) ──
  {
    id: "diag-kg",
    title: "Knowledge Graph",
    type: "knowledge-graph",
    projectId: "purpose-of-schools",
    sectionId: "knowledge-graph",
    afterParagraphId: "knowledge-graph-p8",
    layout: "TB",
    display: "inline",
    floatWidth: 320,
    width: 600,
    height: 420,
    viewport: { x: 0, y: 0, zoom: 1 },
    caption: "A knowledge graph — every node can change any other. Adding new knowledge reorganizes the entire network.",
    nodes: [
      { id: "kg1", type: "diagram", position: { x: 150, y: 60 }, data: { label: "Justice", color: "#2A5F7C", shape: "circle", fontSize: 13 } },
      { id: "kg2", type: "diagram", position: { x: 350, y: 40 }, data: { label: "Power", color: "#943D3D", shape: "circle", fontSize: 13 } },
      { id: "kg3", type: "diagram", position: { x: 80, y: 220 }, data: { label: "Freedom", color: "#2D6B5A", shape: "circle", fontSize: 13 } },
      { id: "kg4", type: "diagram", position: { x: 300, y: 200 }, data: { label: "Race", color: "#6B3A6E", shape: "circle", fontSize: 13 } },
      { id: "kg5", type: "diagram", position: { x: 480, y: 180 }, data: { label: "Dignity", color: "#9E5A2A", shape: "circle", fontSize: 13 } },
      { id: "kg6", type: "diagram", position: { x: 200, y: 340 }, data: { label: "Suffering", color: "#7C6A2A", shape: "circle", fontSize: 13 } },
      { id: "kg7", type: "diagram", position: { x: 420, y: 320 }, data: { label: "Reading\nDouglass", subtitle: "New node", color: "#2A5F7C", shape: "circle", fontSize: 12 } },
    ],
    edges: [
      { id: "kge1", source: "kg1", target: "kg2", type: "straight", animated: true, style: { stroke: "#2A5F7C40", strokeWidth: 2 } },
      { id: "kge2", source: "kg1", target: "kg3", type: "straight", animated: true, style: { stroke: "#2A5F7C40", strokeWidth: 2 } },
      { id: "kge3", source: "kg2", target: "kg4", type: "straight", animated: true, style: { stroke: "#943D3D40", strokeWidth: 2 } },
      { id: "kge4", source: "kg3", target: "kg6", type: "straight", animated: true, style: { stroke: "#2D6B5A40", strokeWidth: 2 } },
      { id: "kge5", source: "kg4", target: "kg5", type: "straight", animated: true, style: { stroke: "#6B3A6E40", strokeWidth: 2 } },
      { id: "kge6", source: "kg4", target: "kg6", type: "straight", animated: true, style: { stroke: "#6B3A6E40", strokeWidth: 2 } },
      { id: "kge7", source: "kg5", target: "kg2", type: "straight", animated: true, style: { stroke: "#9E5A2A40", strokeWidth: 2 } },
      { id: "kge8", source: "kg7", target: "kg1", type: "straight", animated: true, style: { stroke: "#2A5F7C30", strokeWidth: 1.5, strokeDasharray: "4 4" } },
      { id: "kge9", source: "kg7", target: "kg3", type: "straight", animated: true, style: { stroke: "#2A5F7C30", strokeWidth: 1.5, strokeDasharray: "4 4" } },
      { id: "kge10", source: "kg7", target: "kg4", type: "straight", animated: true, style: { stroke: "#2A5F7C30", strokeWidth: 1.5, strokeDasharray: "4 4" } },
      { id: "kge11", source: "kg7", target: "kg6", type: "straight", animated: true, style: { stroke: "#2A5F7C30", strokeWidth: 1.5, strokeDasharray: "4 4" } },
    ],
    createdAt: 1712100000000,
    updatedAt: 1712100000000,
  },

  // ── Microscopes & Satellites Scale (CLASSIFICATORY — dual-axis) ──
  {
    id: "diag-scale",
    title: "The Scale Problem of Assessment",
    type: "dual-axis",
    projectId: "purpose-of-schools",
    sectionId: "microscopes",
    afterParagraphId: "microscopes-p3",
    layout: "TB",
    display: "inline",
    floatWidth: 320,
    width: 600,
    height: 380,
    viewport: { x: 0, y: 0, zoom: 1 },
    caption: "As assessment scales from individual to systemic, flexibility decreases and distortion increases",
    nodes: [
      { id: "sc-ax", type: "diagram", position: { x: 480, y: 200 }, data: { label: "→ Scale (individual to systemic)", color: "#6B6052", shape: "pill", fontSize: 9 } },
      { id: "sc-ay", type: "diagram", position: { x: 180, y: -10 }, data: { label: "↑ Assessment Quality", color: "#6B6052", shape: "pill", fontSize: 9 } },
      { id: "sc1", type: "diagram", position: { x: 60, y: 50 }, data: { label: "Tutor", subtitle: "1:1 — rich, relational", color: "#2D6B5A", shape: "rounded", fontSize: 13 } },
      { id: "sc2", type: "diagram", position: { x: 200, y: 100 }, data: { label: "Classroom", subtitle: "30 students — flexible", color: "#2A5F7C", shape: "rounded", fontSize: 13 } },
      { id: "sc3", type: "diagram", position: { x: 340, y: 180 }, data: { label: "District", subtitle: "Thousands — standardized", color: "#9E5A2A", shape: "rounded", fontSize: 13 } },
      { id: "sc4", type: "diagram", position: { x: 460, y: 280 }, data: { label: "National", subtitle: "55 million — reductive", color: "#943D3D", shape: "rounded", fontSize: 13 } },
    ],
    edges: [
      { id: "sce1", source: "sc1", target: "sc2", type: "smoothstep", markerEnd: ARROW, style: { stroke: "#2A5F7C40", strokeWidth: 2 } },
      { id: "sce2", source: "sc2", target: "sc3", type: "smoothstep", markerEnd: ARROW, style: { stroke: "#9E5A2A40", strokeWidth: 2 } },
      { id: "sce3", source: "sc3", target: "sc4", type: "smoothstep", markerEnd: ARROW, style: { stroke: "#943D3D60", strokeWidth: 2 } },
    ],
    createdAt: 1712100000000,
    updatedAt: 1712100000000,
  },
];
