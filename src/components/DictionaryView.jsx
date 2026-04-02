import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ExternalLink, X, BookOpen, ArrowRight } from "lucide-react";
import { PALETTE as P } from "../data/constants.js";

// — Colors —
const OD = "#9E5A2A";
const AC = "#2D6B5A";

// — Category definitions with colors and ring placement —
const CATEGORIES = {
  substance: { label: "Substance", color: "#9E5A2A", ring: 0 },
  spatial:   { label: "Spatial",   color: "#7A5230", ring: 1 },
  habits:    { label: "Habits",    color: "#6B3A6E", ring: 2 },
  axiomatics:{ label: "Axiomatics",color: "#AA6644", ring: 3 },
  versor:    { label: "Versōr",    color: "#8B5C3E", ring: 3 },
  calculus:  { label: "Calculus",  color: "#2D6B5A", ring: 4 },
};

// — Term → category mapping —
const TERM_CATEGORIES = {
  // Substance (OD Part II core terms)
  noema: "substance", noemata: "substance", noematic: "substance",
  schema: "substance", schemata: "substance", schematize: "substance",
  trace: "substance", bond: "substance", fluxion: "substance",
  nebula: "substance", axis: "substance", constellation: "substance",
  exologue: "substance", cogniscence: "substance", cognesce: "substance",
  cogniscent: "substance", contexture: "substance",
  // Spatial (OD Part II spaces)
  noemascape: "spatial", perifield: "spatial", "outer lens": "spatial",
  threshold: "spatial", exofield: "spatial", noemagraph: "spatial",
  exosphere: "spatial", projection: "spatial", refractal: "spatial",
  endosphere: "spatial",
  // Habits (OD Part III)
  endospecture: "habits", omnipere: "habits", constellare: "habits",
  refracture: "habits", exospecture: "habits",
  endospection: "habits", omniperegrination: "habits", constellaration: "habits",
  refraction: "habits", exospection: "habits", endologue: "habits",
  metacognition: "habits",
  // Axiomatics (OD Part IV)
  axiomatics: "axiomatics", axiomatica: "axiomatics", axiomation: "axiomatics",
  axiomatist: "axiomatics", axiomatize: "axiomatics",
  // Versōr (OD Part V)
  "versōr": "versor", "versūm": "versor", "versūra": "versor",
  versation: "versor", "versātor": "versor", verso: "versor",
  versologue: "versor", versate: "versor",
  // Calculus-origin terms
  gravity: "calculus", instinct: "calculus", thought: "calculus",
  consciousness: "calculus", emotion: "calculus", life: "calculus",
  memory: "calculus", tesseractic: "calculus", oppression: "calculus",
};

// ============================================================
// Custom React Flow Node — Term pill
// ============================================================
function TermNodeComponent({ data }) {
  const isSelected = data.isSelected;
  const isDimmed = data.isDimmed;
  const color = data.color || OD;

  return (
    <div
      onClick={data.onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 20,
        background: isSelected ? `${color}18` : isDimmed ? `${P.bg}90` : `${color}08`,
        border: `1.5px solid ${isSelected ? color : isDimmed ? `${P.bd}60` : `${color}30`}`,
        cursor: "pointer",
        transition: "all 0.35s ease",
        opacity: isDimmed ? 0.3 : 1,
        boxShadow: isSelected ? `0 2px 12px ${color}20` : "none",
        minWidth: 80,
        whiteSpace: "nowrap",
      }}
    >
      {/* Symbol */}
      {data.symbol && (
        <span style={{
          fontFamily: "serif",
          fontSize: 16,
          fontStyle: "italic",
          color: isSelected ? color : isDimmed ? P.tf : color,
          fontWeight: 500,
          transition: "color 0.3s",
        }}>
          {data.symbol}
        </span>
      )}
      {/* Name */}
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        fontWeight: isSelected ? 600 : 400,
        color: isSelected ? P.tx : isDimmed ? P.tf : P.tm,
        letterSpacing: "0.02em",
        transition: "color 0.3s",
      }}>
        {data.label}
      </span>
    </div>
  );
}

// ============================================================
// Category label node
// ============================================================
function CategoryLabelComponent({ data }) {
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 9,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: `${data.color}80`,
      fontWeight: 500,
      pointerEvents: "none",
      whiteSpace: "nowrap",
    }}>
      {data.label}
    </div>
  );
}

const nodeTypes = {
  termNode: TermNodeComponent,
  categoryLabel: CategoryLabelComponent,
};

// ============================================================
// Build the constellation graph
// ============================================================
function buildConstellation(linkedTerms, projects, selectedKey) {
  const termEntries = Object.entries(linkedTerms);
  const termKeys = new Set(Object.keys(linkedTerms));
  const nodes = [];
  const edges = [];

  // Determine connected terms for selection state
  const connectedToSelected = new Set();
  if (selectedKey) connectedToSelected.add(selectedKey);

  // Categorize terms
  const categorized = {};
  for (const cat of Object.keys(CATEGORIES)) categorized[cat] = [];

  for (const [name, data] of termEntries) {
    const cat = TERM_CATEGORIES[name] || "substance";
    categorized[cat].push({ name, ...data });
  }

  // Extract edges from OD project paragraph linkedTerms
  const odProject = projects.find(p => p.id === "ontological-dictionary");
  const acProject = projects.find(p => p.id === "axiometric-calculus");
  const edgeSet = new Set();

  function extractEdgesFromSections(sections, sourceProject) {
    for (const sec of sections) {
      // Match section title to a term
      const secTermName = matchSectionToTerm(sec.title, termKeys);
      if (secTermName && sec.paragraphs) {
        for (const para of sec.paragraphs) {
          for (const ref of (para.linkedTerms || [])) {
            if (ref !== secTermName && termKeys.has(ref)) {
              const edgeId = [secTermName, ref].sort().join("--");
              if (!edgeSet.has(edgeId)) {
                edgeSet.add(edgeId);
                edges.push({
                  id: `e-${edgeId}`,
                  source: `term-${secTermName}`,
                  target: `term-${ref}`,
                  type: "straight",
                  style: { stroke: `${P.tx}10`, strokeWidth: 0.8 },
                  data: { source: secTermName, target: ref },
                });
                // Track connections for selection highlighting
                if (selectedKey === secTermName || selectedKey === ref) {
                  connectedToSelected.add(secTermName);
                  connectedToSelected.add(ref);
                }
              }
            }
          }
        }
      }
      if (sec.children) extractEdgesFromSections(sec.children, sourceProject);
    }
  }

  if (odProject) {
    for (const part of odProject.parts) {
      extractEdgesFromSections(part.children, "ontological-dictionary");
    }
  }
  if (acProject) {
    for (const part of acProject.parts) {
      extractEdgesFromSections(part.children, "axiometric-calculus");
    }
  }

  // Radial layout
  const centerX = 700;
  const centerY = 500;
  const rings = [
    { radius: 220, cats: ["substance"] },
    { radius: 370, cats: ["spatial"] },
    { radius: 490, cats: ["habits"] },
    { radius: 600, cats: ["axiomatics", "versor"] },
    { radius: 720, cats: ["calculus"] },
  ];

  for (const ring of rings) {
    // Collect all terms in this ring
    const ringTerms = [];
    for (const cat of ring.cats) {
      ringTerms.push(...(categorized[cat] || []).map(t => ({ ...t, cat })));
    }
    if (ringTerms.length === 0) continue;

    const angleStep = (2 * Math.PI) / ringTerms.length;
    // Offset each ring slightly to avoid alignment
    const startAngle = ring.radius * 0.01;

    ringTerms.forEach((term, i) => {
      const angle = startAngle + i * angleStep - Math.PI / 2; // Start from top
      const x = centerX + ring.radius * Math.cos(angle);
      const y = centerY + ring.radius * Math.sin(angle);
      const catDef = CATEGORIES[term.cat] || CATEGORIES.substance;

      const isSelected = selectedKey === term.name;
      const isDimmed = selectedKey && !connectedToSelected.has(term.name);

      nodes.push({
        id: `term-${term.name}`,
        type: "termNode",
        position: { x, y },
        draggable: true,
        data: {
          label: term.name,
          symbol: term.symbol,
          color: catDef.color,
          category: term.cat,
          isSelected,
          isDimmed,
          onClick: () => {}, // Will be set via callback
        },
      });
    });

    // Category label at the ring's edge
    if (ring.cats.length === 1) {
      const cat = ring.cats[0];
      const catDef = CATEGORIES[cat];
      nodes.push({
        id: `label-${cat}`,
        type: "categoryLabel",
        position: { x: centerX + ring.radius + 30, y: centerY - 8 },
        draggable: false,
        selectable: false,
        data: { label: catDef.label, color: catDef.color },
      });
    }
  }

  // Update edge styles for selection
  if (selectedKey) {
    const selectedColor = linkedTerms[selectedKey]?.color || OD;
    for (const edge of edges) {
      const isConnected = edge.data.source === selectedKey || edge.data.target === selectedKey;
      edge.style = isConnected
        ? { stroke: `${selectedColor}80`, strokeWidth: 2 }
        : { stroke: `${P.tx}06`, strokeWidth: 0.5 };
      edge.animated = isConnected;
    }
  }

  return { nodes, edges };
}

// ============================================================
// Term Detail Panel
// ============================================================
function TermDetailPanel({ termKey, termData, projects, onClose, onEditSection, linkedTerms }) {
  if (!termKey || !termData) return null;

  // Find the defining section in OD
  const odProject = projects.find(p => p.id === "ontological-dictionary");
  const termSection = odProject ? findTermSection(odProject, termKey) : null;
  const termParas = termSection ? collectAllParagraphs(termSection) : [];

  // Categorize paragraphs
  const definition = termParas.find(p => p.text.toLowerCase().startsWith("definition:"));
  const partOfSpeech = termParas.find(p => p.text.toLowerCase().startsWith("part of speech:"));
  const isItems = termParas.filter(p => {
    const t = p.text.toLowerCase();
    return t.includes(" is ") && t.includes(" is not ");
  });
  const otherParas = termParas.filter(p =>
    p !== definition && p !== partOfSpeech && !isItems.includes(p)
  ).slice(0, 6);

  const catKey = TERM_CATEGORIES[termKey] || "substance";
  const catDef = CATEGORIES[catKey] || CATEGORIES.substance;
  const color = catDef.color;

  // Count refs per project
  const refsByProject = {};
  for (const ref of (termData.refs || [])) {
    refsByProject[ref.project] = (refsByProject[ref.project] || 0) + 1;
  }

  return (
    <div style={{
      width: 320,
      borderLeft: `1px solid ${P.bd}`,
      background: P.sb,
      overflowY: "auto",
      flexShrink: 0,
      padding: 0,
    }}>
      {/* Close button */}
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        padding: "8px 12px 0",
      }}>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: P.tf, padding: 4,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Term header */}
      <div style={{ padding: "4px 24px 20px" }}>
        <div style={{
          fontFamily: "serif",
          fontSize: 30,
          fontStyle: "italic",
          color,
          marginBottom: 4,
        }}>
          {termData.symbol || ""}
        </div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 24,
          fontWeight: 500,
          color,
          marginBottom: 8,
          lineHeight: 1.2,
          textTransform: "capitalize",
        }}>
          {termKey}
        </div>

        {/* Category badge */}
        <div style={{
          display: "inline-block",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: `${color}`,
          background: `${color}10`,
          border: `1px solid ${color}25`,
          borderRadius: 10,
          padding: "2px 8px",
          marginBottom: 12,
        }}>
          {catDef.label}
        </div>

        {/* Part of speech */}
        {partOfSpeech && (
          <div style={{
            fontFamily: "'Spectral', serif",
            fontSize: 12,
            fontStyle: "italic",
            color: P.tm,
            marginBottom: 8,
          }}>
            {partOfSpeech.text.replace(/^Part of Speech:\s*/i, "")}
          </div>
        )}

        {/* Definition */}
        <div style={{
          fontFamily: "'Spectral', serif",
          fontSize: 14,
          lineHeight: 1.65,
          color: P.tx,
        }}>
          {definition
            ? definition.text.replace(/^Definition:\s*/i, "")
            : termData.definition
          }
        </div>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: P.bd, margin: "0 24px" }} />

      {/* Additional content from OD */}
      {otherParas.length > 0 && (
        <div style={{ padding: "16px 24px" }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: P.tf,
            marginBottom: 10,
          }}>
            Details
          </div>
          {otherParas.map((p, i) => (
            <p key={i} style={{
              fontFamily: "'Spectral', serif",
              fontSize: 12.5,
              lineHeight: 1.6,
              color: P.tm,
              margin: "0 0 8px 0",
            }}>
              {p.text}
            </p>
          ))}
        </div>
      )}

      {/* Cross-references */}
      {(termData.refs || []).length > 0 && (
        <div style={{ padding: "8px 24px 20px" }}>
          <div style={{ height: 1, background: P.bd, marginBottom: 16 }} />
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: P.tf,
            marginBottom: 10,
          }}>
            {(termData.refs || []).length} References
          </div>

          {Object.entries(refsByProject).map(([projId, count]) => {
            const proj = projects.find(p => p.id === projId);
            const projColor = proj?.color || P.tm;
            return (
              <div key={projId} style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: P.tm,
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: projColor,
                }} />
                <span>{proj?.name || projId}</span>
                <span style={{ color: P.tf, marginLeft: "auto" }}>{count}</span>
              </div>
            );
          })}

          {/* Sample snippets */}
          {(termData.refs || []).slice(0, 3).map((ref, i) => {
            const proj = projects.find(p => p.id === ref.project);
            return (
              <div key={i} style={{
                marginTop: 8,
                padding: "8px 10px",
                background: P.bg,
                borderRadius: 4,
                borderLeft: `2px solid ${proj?.color || P.bd}`,
              }}>
                <div style={{
                  fontFamily: "'Spectral', serif",
                  fontSize: 11,
                  fontStyle: "italic",
                  color: P.tm,
                  lineHeight: 1.5,
                }}>
                  {ref.snippet}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View in Editor button */}
      {termSection && (
        <div style={{ padding: "8px 24px 24px" }}>
          <button
            onClick={() => onEditSection("ontological-dictionary", termSection.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              padding: "8px 12px",
              background: `${color}08`,
              border: `1px solid ${color}25`,
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color,
              transition: "all 0.2s",
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

// ============================================================
// Inner component (needs ReactFlowProvider context)
// ============================================================
function DictionaryViewInner({ projects, linkedTerms, onSelectSection, onSelectTerm, onSetView }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const reactFlowInstance = useReactFlow();

  const handleTermClick = useCallback((termName) => {
    setSelectedKey(prev => prev === termName ? null : termName);
  }, []);

  const handleEditSection = useCallback((projectId, sectionId) => {
    onSelectSection(projectId, sectionId);
    onSetView("editor");
  }, [onSelectSection, onSetView]);

  const handleClose = useCallback(() => {
    setSelectedKey(null);
  }, []);

  // Build graph
  const { nodes: graphNodes, edges: graphEdges } = useMemo(
    () => buildConstellation(linkedTerms, projects, selectedKey),
    [linkedTerms, projects, selectedKey]
  );

  // Inject click handlers into nodes
  const nodesWithHandlers = useMemo(() =>
    graphNodes.map(n => {
      if (n.type === "termNode") {
        return {
          ...n,
          data: { ...n.data, onClick: () => handleTermClick(n.data.label) },
        };
      }
      return n;
    }),
    [graphNodes, handleTermClick]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithHandlers);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphEdges);

  // Update nodes/edges when selection changes
  useEffect(() => {
    setNodes(nodesWithHandlers);
    setEdges(graphEdges);
  }, [nodesWithHandlers, graphEdges, setNodes, setEdges]);

  // Fit to selected term's neighborhood
  useEffect(() => {
    if (!selectedKey || !reactFlowInstance) return;
    const selectedNode = nodes.find(n => n.id === `term-${selectedKey}`);
    if (!selectedNode) return;

    // Collect connected node IDs
    const connectedIds = new Set([`term-${selectedKey}`]);
    for (const edge of graphEdges) {
      if (edge.data?.source === selectedKey) connectedIds.add(`term-${edge.data.target}`);
      if (edge.data?.target === selectedKey) connectedIds.add(`term-${edge.data.source}`);
    }

    const fitNodes = nodes.filter(n => connectedIds.has(n.id));
    if (fitNodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({
          nodes: fitNodes,
          padding: 0.4,
          duration: 600,
        });
      }, 50);
    }
  }, [selectedKey, reactFlowInstance]);

  const selectedTermData = selectedKey ? linkedTerms[selectedKey] : null;

  return (
    <div style={{ flex: 1, display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Graph canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        {/* Title overlay */}
        <div style={{
          position: "absolute",
          top: 16,
          left: 20,
          zIndex: 5,
          pointerEvents: "none",
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: OD,
            marginBottom: 4,
          }}>
            Relational Constellation
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontWeight: 300,
            color: P.tx,
          }}>
            <span style={{ color: OD, fontWeight: 400 }}>Ontological</span>{" "}
            Dictionary
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            color: P.tf,
            marginTop: 4,
          }}>
            {Object.keys(linkedTerms).length} terms &middot; click to explore connections
          </div>
        </div>

        {/* Legend */}
        <div style={{
          position: "absolute",
          bottom: 16,
          left: 20,
          zIndex: 5,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          pointerEvents: "none",
        }}>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <div key={key} style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: `${cat.color}50`,
                border: `1px solid ${cat.color}40`,
              }} />
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 8,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: P.tf,
              }}>
                {cat.label}
              </span>
            </div>
          ))}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.1}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
          onPaneClick={handleClose}
        >
          <Background color={`${P.bd}60`} gap={30} size={1} variant="dots" />
          <Controls
            style={{
              background: P.sf,
              border: `1px solid ${P.bd}`,
              borderRadius: 6,
            }}
            showInteractive={false}
          />
          <MiniMap
            style={{
              background: P.sf,
              border: `1px solid ${P.bd}`,
              borderRadius: 6,
            }}
            nodeColor={(n) => {
              const cat = n.data?.category;
              return cat ? (CATEGORIES[cat]?.color || P.bd) : `${P.bd}40`;
            }}
            maskColor={`${P.bg}90`}
            pannable
            zoomable
          />
        </ReactFlow>
      </div>

      {/* Detail panel */}
      {selectedKey && selectedTermData && (
        <TermDetailPanel
          termKey={selectedKey}
          termData={selectedTermData}
          projects={projects}
          onClose={handleClose}
          onEditSection={handleEditSection}
          linkedTerms={linkedTerms}
        />
      )}
    </div>
  );
}

// ============================================================
// Main export (wraps with ReactFlowProvider)
// ============================================================
export default function DictionaryView(props) {
  return (
    <ReactFlowProvider>
      <DictionaryViewInner {...props} />
    </ReactFlowProvider>
  );
}

// ============================================================
// Helpers
// ============================================================

/** Match a section title to a term name */
function matchSectionToTerm(title, termKeys) {
  const cleaned = title
    .toLowerCase()
    .replace(/^(the\s+|to\s+)/i, "")
    .trim();

  // Direct match
  if (termKeys.has(cleaned)) return cleaned;

  // Try without "the"
  for (const key of termKeys) {
    if (cleaned === key || cleaned === `the ${key}`) return key;
  }

  return null;
}

/** Find a term's defining section in the OD project */
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

/** Collect all paragraphs from a section and its children */
function collectAllParagraphs(section) {
  const paras = [...(section.paragraphs || [])];
  if (section.children) {
    for (const child of section.children) {
      paras.push(...collectAllParagraphs(child));
    }
  }
  return paras;
}
