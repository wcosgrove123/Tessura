import React, { useMemo } from "react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Edit3, Move, X, Shapes } from "lucide-react";
import { PALETTE as P } from "../data/constants.js";
import DiagramNode from "./DiagramNode.jsx";

const nodeTypes = { diagram: DiagramNode };

function StaticDiagram({ diagram, height }) {
  const nodes = useMemo(() => (diagram.nodes || []).map((n) => ({
    ...n,
    data: { ...n.data, onLabelChange: undefined },
  })), [diagram.nodes]);

  const edges = useMemo(() => diagram.edges || [], [diagram.edges]);

  return (
    <div style={{ width: "100%", height, borderRadius: 6, overflow: "hidden", background: P.bg }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        style={{ background: "transparent" }}
      />
    </div>
  );
}

/**
 * Inline diagram renderer — shows as a floating figure alongside paragraphs.
 *
 * @param {object} diagram - The diagram record
 * @param {number} figureIndex - Figure number (1-based)
 * @param {function} onEdit - Navigate to diagram builder
 * @param {function} onRemove - Detach diagram from paragraph
 * @param {boolean} readOnly - True in PrintPreview
 * @param {boolean} isOutline - True in Outline view (collapsed display)
 */
export default function DiagramInline({ diagram, figureIndex, onEdit, onRemove, onNavigate, sectionTitle, readOnly = false, isOutline = false }) {
  if (!diagram) return null;

  // Outline mode: collapsed single line
  if (isOutline) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
        background: P.sf, borderRadius: 4, border: `1px solid ${P.bl}`,
        fontSize: 11, color: P.tf, fontFamily: "'IBM Plex Mono', monospace",
        margin: "4px 0",
      }}>
        <Shapes size={11} style={{ color: P.ac }} />
        Figure {figureIndex}: {diagram.title}
      </div>
    );
  }

  const diagramHeight = Math.min(diagram.height || 300, 400);

  return (
    <div
      className="diagram-inline-container"
      style={{
        width: "100%",
        maxWidth: 700,
        margin: "20px auto",
        background: P.sf,
        border: `1px solid ${P.bd}`,
        borderRadius: 8,
        overflow: "hidden",
        transition: "box-shadow 0.2s, border-color 0.2s",
        position: "relative",
        clear: "both",
      }}
      onMouseOver={(e) => {
        if (!readOnly) {
          e.currentTarget.style.borderColor = P.ac + "60";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(44,36,24,0.08)";
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = P.bd;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Figure label */}
      <div style={{
        padding: "8px 12px 0",
        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
        letterSpacing: 1.2, textTransform: "uppercase", color: P.t3,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span>Figure {figureIndex}: {diagram.title}</span>
        {/* Hover action buttons */}
        {!readOnly && (
          <div className="diagram-inline-actions" style={{ display: "flex", gap: 4, opacity: 0, transition: "opacity 0.2s" }}>
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(diagram.id); }}
                style={{
                  background: P.ac, color: "#fff", border: "none", borderRadius: 4,
                  padding: "2px 8px", fontSize: 9, cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace",
                  display: "flex", alignItems: "center", gap: 3,
                }}
              >
                <Edit3 size={9} /> Edit
              </button>
            )}
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(diagram.id); }}
                style={{
                  background: "#943D3D20", color: "#943D3D", border: "none", borderRadius: 4,
                  padding: "2px 6px", fontSize: 9, cursor: "pointer",
                }}
                title="Remove from this position"
              >
                <X size={9} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Diagram canvas (read-only) */}
      <div style={{ padding: "4px 8px 8px" }}>
        <ReactFlowProvider>
          <StaticDiagram diagram={diagram} height={diagramHeight} />
        </ReactFlowProvider>
      </div>

      {/* Caption */}
      {diagram.caption && (
        <div style={{
          padding: "0 12px 10px",
          fontFamily: "'Spectral', serif", fontStyle: "italic",
          fontSize: 11, color: P.tm, lineHeight: 1.4,
        }}>
          {diagram.caption}
        </div>
      )}

      {/* Section navigation link */}
      {!readOnly && onNavigate && diagram.sectionId && (
        <div style={{
          padding: "0 12px 8px",
          fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
          color: P.tf, letterSpacing: 0.5,
        }}>
          <span
            onClick={(e) => { e.stopPropagation(); onNavigate(diagram.projectId, diagram.sectionId, diagram.afterParagraphId); }}
            style={{ cursor: "pointer", color: P.ac, transition: "color 0.15s", borderBottom: `1px solid transparent` }}
            onMouseOver={(e) => { e.currentTarget.style.borderBottomColor = P.ac; }}
            onMouseOut={(e) => { e.currentTarget.style.borderBottomColor = "transparent"; }}
          >
            {sectionTitle ? `Section: ${sectionTitle}` : "View in document"} →
          </span>
        </div>
      )}

      {/* CSS for hover reveal */}
      <style>{`
        .diagram-inline-container:hover .diagram-inline-actions { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
