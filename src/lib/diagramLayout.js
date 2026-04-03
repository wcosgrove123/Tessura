import dagre from "@dagrejs/dagre";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";

/**
 * Apply dagre hierarchical layout to nodes and edges.
 */
export function layoutHierarchy(nodes, edges, direction = "TB", opts = {}) {
  const { nodeWidth = 180, nodeHeight = 70, rankSep = 60, nodeSep = 40 } = opts;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: rankSep, nodesep: nodeSep });

  for (const node of nodes) {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const layoutNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
    };
  });

  return { nodes: layoutNodes, edges };
}

/**
 * Radial layout — center node in middle, others in a circle around it.
 */
export function layoutRadial(nodes, edges, opts = {}) {
  const { radius = 200, centerX = 250, centerY = 200 } = opts;

  if (nodes.length === 0) return { nodes, edges };

  const center = nodes[0];
  const orbiters = nodes.slice(1);

  const layoutNodes = [
    { ...center, position: { x: centerX, y: centerY } },
    ...orbiters.map((node, i) => {
      const angle = (2 * Math.PI * i) / orbiters.length - Math.PI / 2;
      return {
        ...node,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
      };
    }),
  ];

  return { nodes: layoutNodes, edges };
}

/**
 * Grid layout — arrange nodes in columns.
 */
export function layoutGrid(nodes, edges, opts = {}) {
  const { columns = 3, cellWidth = 200, cellHeight = 100, startX = 0, startY = 0 } = opts;

  const layoutNodes = nodes.map((node, i) => ({
    ...node,
    position: {
      x: startX + (i % columns) * cellWidth,
      y: startY + Math.floor(i / columns) * cellHeight,
    },
  }));

  return { nodes: layoutNodes, edges };
}

/**
 * Cycle layout — arrange nodes evenly around a circle (no center node).
 */
export function layoutCycle(nodes, edges, opts = {}) {
  const { radius = 180, centerX = 250, centerY = 220 } = opts;

  if (nodes.length === 0) return { nodes, edges };

  const layoutNodes = nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
    };
  });

  return { nodes: layoutNodes, edges };
}

/**
 * Spiral layout — arrange nodes along an expanding spiral path.
 */
export function layoutSpiral(nodes, edges, opts = {}) {
  const { startRadius = 60, growthRate = 30, centerX = 300, centerY = 300 } = opts;

  if (nodes.length === 0) return { nodes, edges };

  const layoutNodes = nodes.map((node, i) => {
    const angle = (Math.PI * 0.7) * i; // ~126° per step for visible spiral
    const r = startRadius + growthRate * i;
    return {
      ...node,
      position: {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      },
    };
  });

  return { nodes: layoutNodes, edges };
}

/**
 * Force-directed layout using d3-force — returns positioned nodes after simulation.
 * For static layout; live simulation handled separately in the builder.
 */
export function layoutForceDirected(nodes, edges, opts = {}) {
  const { strength = -300, distance = 120, centerX = 300, centerY = 250 } = opts;

  if (nodes.length === 0) return { nodes, edges };

  // Create simulation nodes with initial positions
  const simNodes = nodes.map((n, i) => ({
    id: n.id,
    x: n.position?.x || centerX + (Math.random() - 0.5) * 200,
    y: n.position?.y || centerY + (Math.random() - 0.5) * 200,
  }));

  const simLinks = edges.map((e) => ({ source: e.source, target: e.target }));

  const sim = forceSimulation(simNodes)
    .force("link", forceLink(simLinks).id((d) => d.id).distance(distance))
    .force("charge", forceManyBody().strength(strength))
    .force("center", forceCenter(centerX, centerY))
    .force("collide", forceCollide(50))
    .stop();

  // Run simulation to convergence
  for (let i = 0; i < 300; i++) sim.tick();

  const posMap = {};
  for (const sn of simNodes) posMap[sn.id] = { x: sn.x, y: sn.y };

  const layoutNodes = nodes.map((node) => ({
    ...node,
    position: posMap[node.id] || node.position,
  }));

  return { nodes: layoutNodes, edges };
}

/**
 * Pyramid layout — arrange nodes in triangular tiers (1 at top, 2 next, 3 next, etc).
 */
export function layoutPyramid(nodes, edges, opts = {}) {
  const { tierHeight = 90, nodeSpacing = 160, topX = 300, topY = 20 } = opts;

  if (nodes.length === 0) return { nodes, edges };

  // Assign nodes to tiers: 1, 2, 3, 4, ...
  let tier = 0, countInTier = 0, tierSize = 1;
  const layoutNodes = nodes.map((node, i) => {
    if (countInTier >= tierSize) {
      tier++;
      tierSize = tier + 1;
      countInTier = 0;
    }
    const y = topY + tier * tierHeight;
    const tierWidth = (tierSize - 1) * nodeSpacing;
    const x = topX - tierWidth / 2 + countInTier * nodeSpacing;
    countInTier++;
    return { ...node, position: { x, y } };
  });

  return { nodes: layoutNodes, edges };
}

/**
 * Dual-axis layout — position nodes by data.axisX / data.axisY in a coordinate space.
 * Nodes without axis data are placed in center.
 */
export function layoutDualAxis(nodes, edges, opts = {}) {
  const { width = 500, height = 400, originX = 50, originY = 50 } = opts;

  const layoutNodes = nodes.map((node) => {
    const ax = node.data?.axisX ?? 0.5; // 0-1 range
    const ay = node.data?.axisY ?? 0.5;
    return {
      ...node,
      position: {
        x: originX + ax * width,
        y: originY + (1 - ay) * height, // invert Y so higher values go up
      },
    };
  });

  return { nodes: layoutNodes, edges };
}

/**
 * Concentric ring layout — arrange nodes in nested rings by data.ring (0=center, 1=inner, 2=middle...).
 */
export function layoutConcentric(nodes, edges, opts = {}) {
  const { ringSpacing = 120, centerX = 300, centerY = 250 } = opts;

  if (nodes.length === 0) return { nodes, edges };

  // Group by ring
  const rings = {};
  for (const n of nodes) {
    const r = n.data?.ring ?? 0;
    if (!rings[r]) rings[r] = [];
    rings[r].push(n);
  }

  const layoutNodes = [];
  for (const [ring, ringNodes] of Object.entries(rings)) {
    const r = parseInt(ring) * ringSpacing;
    if (r === 0) {
      // Center node(s)
      ringNodes.forEach((n, i) => {
        layoutNodes.push({ ...n, position: { x: centerX + i * 80, y: centerY } });
      });
    } else {
      ringNodes.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / ringNodes.length - Math.PI / 2;
        layoutNodes.push({
          ...n,
          position: { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) },
        });
      });
    }
  }

  return { nodes: layoutNodes, edges };
}

/**
 * Create a live d3-force simulation for the Knowledge Graph template.
 * Returns the simulation object — caller must handle tick updates.
 */
export function createForceSimulation(nodes, edges, opts = {}) {
  const { strength = -200, distance = 100, centerX = 300, centerY = 250 } = opts;

  const simNodes = nodes.map((n) => ({
    id: n.id,
    x: n.position?.x || centerX + (Math.random() - 0.5) * 200,
    y: n.position?.y || centerY + (Math.random() - 0.5) * 200,
    fx: null, fy: null, // allow pinning
  }));

  const simLinks = edges.map((e) => ({
    source: typeof e.source === "object" ? e.source.id : e.source,
    target: typeof e.target === "object" ? e.target.id : e.target,
  }));

  const sim = forceSimulation(simNodes)
    .force("link", forceLink(simLinks).id((d) => d.id).distance(distance).strength(0.3))
    .force("charge", forceManyBody().strength(strength))
    .force("center", forceCenter(centerX, centerY))
    .force("collide", forceCollide(60))
    .alphaDecay(0.02)
    .velocityDecay(0.3);

  return { simulation: sim, simNodes, simLinks };
}

/** Map diagram type to appropriate layout function. */
export function getLayoutForType(type) {
  switch (type) {
    case "hierarchy":
    case "staircase":
    case "emergence":
    case "process":
      return layoutHierarchy;
    case "radial":
    case "orrery":
      return layoutRadial;
    case "cycle":
    case "directed-cycle":
      return layoutCycle;
    case "spiral":
      return layoutSpiral;
    case "knowledge-graph":
    case "force":
      return layoutForceDirected;
    case "taxonomy":
    case "pyramid":
      return layoutPyramid;
    case "dual-axis":
    case "spectrum":
      return layoutDualAxis;
    case "concentric":
      return layoutConcentric;
    default:
      return layoutHierarchy;
  }
}
