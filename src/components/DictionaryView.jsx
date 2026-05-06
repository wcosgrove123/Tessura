import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import ForceGraph3D from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import * as THREE from "three";
import { ExternalLink, X } from "lucide-react";
import { PALETTE as P } from "../data/constants.js";

// ── Colors & Categories ──────────────────────────────────────

const OD = "#9E5A2A";

const CATEGORIES = {
  substance:  { label: "Substance",  color: "#D4845A", emissive: "#9E5A2A" },
  spatial:    { label: "Spatial",    color: "#5AAA88", emissive: "#2D6B5A" },
  habits:     { label: "Habits",     color: "#A86AAD", emissive: "#6B3A6E" },
  axiomatics: { label: "Axiomatics", color: "#CC8855", emissive: "#AA6644" },
  versor:     { label: "Versor",     color: "#B88866", emissive: "#8B5C3E" },
  calculus:   { label: "Calculus",   color: "#5A99B3", emissive: "#2D6B5A" },
};

const TERM_CATEGORIES = {
  noema: "substance", noemata: "substance", noematic: "substance",
  schema: "substance", schemata: "substance", schematize: "substance",
  schematic: "substance", schematatic: "substance",
  trace: "substance", bond: "substance", fluxion: "substance",
  nebula: "substance", axis: "substance", constellation: "substance",
  exologue: "substance", cogniscence: "substance", cognesce: "substance",
  cogniscent: "substance", contexture: "substance",
  noemascape: "spatial", perifield: "spatial", "outer lens": "spatial",
  threshold: "spatial", exofield: "spatial", noemagraph: "spatial",
  exosphere: "spatial", projection: "spatial", refractal: "spatial",
  endosphere: "spatial", nuloscape: "spatial",
  endospecture: "habits", omnipere: "habits", constellare: "habits",
  refracture: "habits", exospecture: "habits", synthesure: "habits",
  endospection: "habits", omniperegrination: "habits", constellaration: "habits",
  refraction: "habits", exospection: "habits", endologue: "habits",
  metacognition: "habits", endospective: "habits", omniperegrinal: "habits",
  constellative: "habits", refractive: "habits", exospective: "habits",
  synthesis: "habits", synthesuric: "habits", holos: "habits",
  axiomatics: "axiomatics", axiomatica: "axiomatics", axiomation: "axiomatics",
  axiomatist: "axiomatics", axiomatize: "axiomatics",
  versation: "versor", verso: "versor", versologue: "versor", versate: "versor",
  gravity: "calculus", instinct: "calculus", thought: "calculus",
  consciousness: "calculus", emotion: "calculus", life: "calculus",
  memory: "calculus", tesseractic: "calculus", oppression: "calculus",
};

// ── Build graph data ─────────────────────────────────────────

function buildGraphData(linkedTerms, projects) {
  const termKeys = new Set(Object.keys(linkedTerms));
  const nodes = [];
  const links = [];
  const linkSet = new Set();

  // Create nodes
  for (const [name, data] of Object.entries(linkedTerms)) {
    const cat = TERM_CATEGORIES[name] || "substance";
    const catDef = CATEGORIES[cat] || CATEGORIES.substance;
    nodes.push({
      id: name,
      symbol: data.symbol || "",
      definition: data.definition,
      category: cat,
      color: catDef.color,
      emissive: catDef.emissive,
      refs: data.refs || [],
      connectionCount: 0,
    });
  }

  // Extract edges from OD + AC sections
  const odProject = projects.find(p => p.id === "ontological-dictionary");
  const acProject = projects.find(p => p.id === "axiometric-calculus");

  function extractEdges(sections) {
    for (const sec of sections) {
      const secTerm = matchSectionToTerm(sec.title, termKeys);
      if (secTerm && sec.paragraphs) {
        for (const para of sec.paragraphs) {
          for (const ref of (para.linkedTerms || [])) {
            if (ref !== secTerm && termKeys.has(ref)) {
              const edgeId = [secTerm, ref].sort().join("--");
              if (!linkSet.has(edgeId)) {
                linkSet.add(edgeId);
                links.push({ source: secTerm, target: ref });
              }
            }
          }
        }
      }
      if (sec.children) extractEdges(sec.children);
    }
  }

  if (odProject) for (const part of odProject.parts) extractEdges(part.children);
  if (acProject) for (const part of acProject.parts) extractEdges(part.children);

  // Count connections per node
  for (const link of links) {
    const src = nodes.find(n => n.id === link.source);
    const tgt = nodes.find(n => n.id === link.target);
    if (src) src.connectionCount++;
    if (tgt) tgt.connectionCount++;
  }

  return { nodes, links };
}

// ── Three.js object cache ────────────────────────────────────

const nodeObjectCache = new Map();
const GLOW_TEXTURE = (() => {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, "rgba(255,255,255,0.6)");
  gradient.addColorStop(0.3, "rgba(255,255,255,0.15)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
})();

function createNodeObject(node, selectedId) {
  const isSelected = node.id === selectedId;
  const isConnected = node._isConnected;
  const isDimmed = selectedId && !isSelected && !isConnected;

  const group = new THREE.Group();

  // Sphere
  const radius = Math.max(1.8, 1.2 + Math.sqrt(node.connectionCount) * 0.5);
  const color = new THREE.Color(node.color);
  const geo = new THREE.SphereGeometry(radius, 24, 16);
  const mat = new THREE.MeshPhongMaterial({
    color: isDimmed ? 0x333333 : color,
    emissive: isDimmed ? 0x111111 : new THREE.Color(node.emissive),
    emissiveIntensity: isSelected ? 0.9 : isConnected ? 0.6 : 0.35,
    shininess: 80,
    transparent: true,
    opacity: isDimmed ? 0.3 : 1,
  });
  const sphere = new THREE.Mesh(geo, mat);
  group.add(sphere);

  // Glow sprite
  const glowMat = new THREE.SpriteMaterial({
    map: GLOW_TEXTURE,
    color: isDimmed ? 0x222222 : color,
    transparent: true,
    opacity: isSelected ? 0.5 : isConnected ? 0.3 : isDimmed ? 0.05 : 0.15,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(radius * 4, radius * 4, 1);
  group.add(glow);

  // Symbol text
  if (node.symbol) {
    const symbolSprite = new SpriteText(node.symbol, isSelected ? 3 : 2.2, isSelected ? "#FFFFFF" : node.color);
    symbolSprite.fontFace = "Georgia, serif";
    symbolSprite.fontWeight = "bold";
    symbolSprite.position.set(0, radius + 2.5, 0);
    symbolSprite.material.depthWrite = false;
    symbolSprite.material.transparent = true;
    symbolSprite.material.opacity = isDimmed ? 0.15 : 1;
    group.add(symbolSprite);
  }

  // Name label
  const labelSprite = new SpriteText(
    node.id,
    isSelected ? 2.2 : isDimmed ? 1.2 : 1.6,
    isDimmed ? "#666655" : (isSelected ? "#FFFFFF" : "#C4B9A8")
  );
  labelSprite.fontFace = "'IBM Plex Mono', Consolas, monospace";
  labelSprite.fontWeight = isSelected ? "600" : "400";
  labelSprite.position.set(0, -(radius + 2.2), 0);
  labelSprite.material.depthWrite = false;
  labelSprite.material.transparent = true;
  labelSprite.material.opacity = isDimmed ? 0.2 : (isSelected ? 1 : 0.8);
  group.add(labelSprite);

  return group;
}

// ── Term Detail Panel ────────────────────────────────────────

function TermDetailPanel({ termKey, termData, projects, onClose, onEditSection }) {
  if (!termKey || !termData) return null;

  const odProject = projects.find(p => p.id === "ontological-dictionary");
  const termSection = odProject ? findTermSection(odProject, termKey) : null;
  const termParas = termSection ? collectAllParagraphs(termSection) : [];

  const definition = termParas.find(p => p.text.toLowerCase().startsWith("definition:"));
  const partOfSpeech = termParas.find(p => p.text.toLowerCase().startsWith("part of speech:"));
  const otherParas = termParas.filter(p => p !== definition && p !== partOfSpeech).slice(0, 5);

  const catKey = TERM_CATEGORIES[termKey] || "substance";
  const catDef = CATEGORIES[catKey] || CATEGORIES.substance;
  const color = catDef.color;

  const refsByProject = {};
  for (const ref of (termData.refs || [])) {
    refsByProject[ref.project] = (refsByProject[ref.project] || 0) + 1;
  }

  return (
    <div style={{
      position: "absolute", top: 0, right: 0, bottom: 0, width: 340,
      background: `${P.sb}F8`, backdropFilter: "blur(12px)",
      borderLeft: `1px solid ${P.bd}60`, overflowY: "auto", zIndex: 10,
      boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
    }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px 0" }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer", color: P.tf, padding: 4,
        }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: "4px 24px 20px" }}>
        {termData.symbol && (
          <div style={{ fontFamily: "serif", fontSize: 30, fontStyle: "italic", color, marginBottom: 4 }}>
            {termData.symbol}
          </div>
        )}
        <div style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 500,
          color, marginBottom: 8, lineHeight: 1.2, textTransform: "capitalize",
        }}>
          {termKey}
        </div>

        <div style={{
          display: "inline-block", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          letterSpacing: "0.1em", textTransform: "uppercase", color,
          background: `${color}15`, border: `1px solid ${color}25`,
          borderRadius: 10, padding: "2px 8px", marginBottom: 12,
        }}>
          {catDef.label}
        </div>

        {partOfSpeech && (
          <div style={{
            fontFamily: "'Spectral', serif", fontSize: 12, fontStyle: "italic",
            color: P.tm, marginBottom: 8,
          }}>
            {partOfSpeech.text.replace(/^Part of Speech:\s*/i, "")}
          </div>
        )}

        <div style={{ fontFamily: "'Spectral', serif", fontSize: 14, lineHeight: 1.65, color: P.tx }}>
          {definition ? definition.text.replace(/^Definition:\s*/i, "") : termData.definition}
        </div>
      </div>

      <div style={{ height: 1, background: P.bd, margin: "0 24px" }} />

      {otherParas.length > 0 && (
        <div style={{ padding: "16px 24px" }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.1em",
            textTransform: "uppercase", color: P.tf, marginBottom: 10,
          }}>
            Details
          </div>
          {otherParas.map((p, i) => (
            <p key={i} style={{
              fontFamily: "'Spectral', serif", fontSize: 12.5, lineHeight: 1.6,
              color: P.tm, margin: "0 0 8px 0",
            }}>
              {p.text}
            </p>
          ))}
        </div>
      )}

      {(termData.refs || []).length > 0 && (
        <div style={{ padding: "8px 24px 20px" }}>
          <div style={{ height: 1, background: P.bd, marginBottom: 16 }} />
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.1em",
            textTransform: "uppercase", color: P.tf, marginBottom: 10,
          }}>
            {(termData.refs || []).length} References
          </div>
          {Object.entries(refsByProject).map(([projId, count]) => {
            const proj = projects.find(p => p.id === projId);
            return (
              <div key={projId} style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: P.tm,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: proj?.color || P.tm }} />
                <span>{proj?.name || projId}</span>
                <span style={{ color: P.tf, marginLeft: "auto" }}>{count}</span>
              </div>
            );
          })}
          {(termData.refs || []).slice(0, 3).map((ref, i) => {
            const proj = projects.find(p => p.id === ref.project);
            return (
              <div key={i} style={{
                marginTop: 8, padding: "8px 10px", background: P.bg,
                borderRadius: 4, borderLeft: `2px solid ${proj?.color || P.bd}`,
              }}>
                <div style={{
                  fontFamily: "'Spectral', serif", fontSize: 11, fontStyle: "italic",
                  color: P.tm, lineHeight: 1.5,
                }}>
                  {ref.snippet}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {termSection && (
        <div style={{ padding: "8px 24px 24px" }}>
          <button
            onClick={() => onEditSection("ontological-dictionary", termSection.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6, width: "100%",
              padding: "8px 12px", background: `${color}08`, border: `1px solid ${color}25`,
              borderRadius: 4, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, color, transition: "all 0.2s",
            }}
            onMouseOver={e => e.currentTarget.style.background = `${color}15`}
            onMouseOut={e => e.currentTarget.style.background = `${color}08`}
          >
            <ExternalLink size={11} />
            View in Editor
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Dictionary View ─────────────────────────────────────

export default function DictionaryView({ projects, linkedTerms, onSelectSection, onSelectTerm, onSetView }) {
  const [selectedId, setSelectedId] = useState(null);
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Build graph data
  const graphData = useMemo(
    () => buildGraphData(linkedTerms, projects),
    [linkedTerms, projects]
  );

  // Track connected nodes for highlighting
  const connectedNodes = useMemo(() => {
    if (!selectedId) return new Set();
    const connected = new Set([selectedId]);
    for (const link of graphData.links) {
      const src = typeof link.source === "object" ? link.source.id : link.source;
      const tgt = typeof link.target === "object" ? link.target.id : link.target;
      if (src === selectedId) connected.add(tgt);
      if (tgt === selectedId) connected.add(src);
    }
    return connected;
  }, [selectedId, graphData.links]);

  // Mark nodes with connection state for rendering
  const nodesWithState = useMemo(() => {
    return graphData.nodes.map(n => ({
      ...n,
      _isConnected: connectedNodes.has(n.id),
    }));
  }, [graphData.nodes, connectedNodes]);

  const graphDataWithState = useMemo(() => ({
    nodes: nodesWithState,
    links: graphData.links,
  }), [nodesWithState, graphData.links]);

  // Node click handler
  const handleNodeClick = useCallback((node) => {
    setSelectedId(prev => prev === node.id ? null : node.id);

    // Fly camera toward node neighborhood — stay far enough to see connected nodes
    if (fgRef.current) {
      const dist = 100;
      const angle = Math.atan2(node.z, node.x);
      fgRef.current.cameraPosition(
        { x: node.x + dist * Math.cos(angle + 0.5), y: node.y + 40, z: node.z + dist * Math.sin(angle + 0.5) },
        { x: node.x, y: node.y, z: node.z },
        1200
      );
    }
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleEditSection = useCallback((projectId, sectionId) => {
    onSelectSection(projectId, sectionId);
    onSetView("editor");
  }, [onSelectSection, onSetView]);

  // Configure scene + forces on mount
  useEffect(() => {
    if (!fgRef.current) return;

    // Configure d3 forces — moderate repulsion, tight link distance
    fgRef.current.d3Force("charge").strength(-60).distanceMax(250);
    fgRef.current.d3Force("link").distance(25);

    const scene = fgRef.current.scene();
    const renderer = fgRef.current.renderer();

    // Background
    scene.background = new THREE.Color("#1a1510");
    scene.fog = new THREE.FogExp2("#1a1510", 0.0008);

    // Lighting
    scene.children = scene.children.filter(c =>
      !(c instanceof THREE.AmbientLight || c instanceof THREE.DirectionalLight || c instanceof THREE.PointLight)
    );

    const ambient = new THREE.AmbientLight(0xfaf7f2, 0.4);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffeedd, 0.6);
    key.position.set(100, 200, 150);
    scene.add(key);

    const fill = new THREE.PointLight(0x9E5A2A, 0.5, 500);
    fill.position.set(-100, -50, 100);
    scene.add(fill);

    const rim = new THREE.PointLight(0x6B3A6E, 0.3, 400);
    rim.position.set(50, -100, -150);
    scene.add(rim);

    // Renderer settings
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Starfield / dust particles
    const particleCount = 2000;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 800;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x9E5A2A,
      size: 0.5,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    particles.name = "starfield";
    scene.add(particles);

    // Orbit controls damping
    const controls = fgRef.current.controls();
    if (controls) {
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.6;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
    }
  }, []);

  // Stop auto-rotate on selection
  useEffect(() => {
    if (!fgRef.current) return;
    const controls = fgRef.current.controls();
    if (controls) {
      controls.autoRotate = !selectedId;
    }
  }, [selectedId]);

  // Custom node rendering
  const nodeThreeObject = useCallback((node) => {
    return createNodeObject(node, selectedId);
  }, [selectedId]);

  // Link styling
  const linkColor = useCallback((link) => {
    if (!selectedId) return "rgba(139, 69, 19, 0.08)";
    const src = typeof link.source === "object" ? link.source.id : link.source;
    const tgt = typeof link.target === "object" ? link.target.id : link.target;
    if (src === selectedId || tgt === selectedId) {
      const node = graphData.nodes.find(n => n.id === (src === selectedId ? tgt : src));
      return node?.color || "rgba(212, 132, 90, 0.6)";
    }
    return "rgba(139, 69, 19, 0.02)";
  }, [selectedId, graphData.nodes]);

  const linkWidth = useCallback((link) => {
    if (!selectedId) return 0.2;
    const src = typeof link.source === "object" ? link.source.id : link.source;
    const tgt = typeof link.target === "object" ? link.target.id : link.target;
    return (src === selectedId || tgt === selectedId) ? 0.6 : 0.08;
  }, [selectedId]);

  const selectedTermData = selectedId ? linkedTerms[selectedId] : null;

  return (
    <div ref={containerRef} style={{ flex: 1, position: "relative", height: "100%", overflow: "hidden" }}>
      {/* Title overlay */}
      <div style={{
        position: "absolute", top: 16, left: 20, zIndex: 5, pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          letterSpacing: "0.16em", textTransform: "uppercase", color: "#D4845A",
          marginBottom: 4,
        }}>
          3D Knowledge Graph
        </div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300,
          color: "#E8E0D4",
        }}>
          <span style={{ color: "#D4845A", fontWeight: 400 }}>Ontological</span> Dictionary
        </div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8A7E6E", marginTop: 4,
        }}>
          {graphData.nodes.length} terms, {graphData.links.length} connections
        </div>
      </div>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 16, left: 20, zIndex: 5,
        display: "flex", flexWrap: "wrap", gap: 12, pointerEvents: "none",
      }}>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: cat.color, boxShadow: `0 0 6px ${cat.color}60`,
            }} />
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              letterSpacing: "0.06em", textTransform: "uppercase", color: "#8A7E6E",
            }}>
              {cat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Controls hint */}
      <div style={{
        position: "absolute", bottom: 16, right: selectedId ? 360 : 20, zIndex: 5,
        pointerEvents: "none", transition: "right 0.3s",
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#5A5244",
          letterSpacing: "0.08em",
        }}>
          drag to orbit, scroll to zoom, click node to inspect
        </div>
      </div>

      {/* 3D Graph */}
      <ForceGraph3D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphDataWithState}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={0.6}
        linkDirectionalParticles={link => {
          if (!selectedId) return 0;
          const src = typeof link.source === "object" ? link.source.id : link.source;
          const tgt = typeof link.target === "object" ? link.target.id : link.target;
          return (src === selectedId || tgt === selectedId) ? 3 : 0;
        }}
        linkDirectionalParticleWidth={0.5}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={link => {
          const src = typeof link.source === "object" ? link.source.id : link.source;
          const node = graphData.nodes.find(n => n.id === src);
          return node?.color || "#D4845A";
        }}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        d3AlphaMin={0.005}
        warmupTicks={120}
        cooldownTicks={300}
        enableNodeDrag={true}
        nodeLabel=""
        backgroundColor="#1a1510"
      />

      {/* Detail panel */}
      {selectedId && selectedTermData && (
        <TermDetailPanel
          termKey={selectedId}
          termData={selectedTermData}
          projects={projects}
          onClose={() => setSelectedId(null)}
          onEditSection={handleEditSection}
        />
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function matchSectionToTerm(title, termKeys) {
  const cleaned = title.toLowerCase().replace(/^(the\s+|to\s+)/i, "").trim();
  if (termKeys.has(cleaned)) return cleaned;
  for (const key of termKeys) {
    if (cleaned === key || cleaned === `the ${key}`) return key;
  }
  return null;
}

function findTermSection(odProject, termName) {
  const target = termName.toLowerCase();
  function search(sections) {
    for (const sec of sections) {
      const title = sec.title.toLowerCase().replace(/^(the\s+|to\s+)/i, "").trim();
      if (title === target || title === `the ${target}`) return sec;
      if (sec.children) {
        const found = search(sec.children);
        if (found) return found;
      }
    }
    return null;
  }
  for (const part of odProject.parts) {
    const found = search(part.children);
    if (found) return found;
  }
  return null;
}

function collectAllParagraphs(section) {
  const paras = [...(section.paragraphs || [])];
  if (section.children) {
    for (const child of section.children) paras.push(...collectAllParagraphs(child));
  }
  return paras;
}
