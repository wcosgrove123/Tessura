import React, { useState, useMemo } from "react";
import { Trash2, ChevronDown, Palette, Type, Move, Link2 } from "lucide-react";
import { PALETTE as P } from "../data/constants.js";
import { DIAGRAM_NODE_SHAPES } from "../data/diagrams.js";
import { flattenSections } from "../hooks/useWorkspaceState.js";

const PRESET_COLORS = [
  { label: "Slate Blue", value: "#2A5F7C" },
  { label: "Forest Green", value: "#2D6B5A" },
  { label: "Burnt Sienna", value: "#9E5A2A" },
  { label: "Saddlebrown", value: "#8B4513" },
  { label: "Deep Purple", value: "#6B3A6E" },
  { label: "Gold", value: "#7C6A2A" },
  { label: "Crimson", value: "#943D3D" },
  { label: "Charcoal", value: "#4A4A4A" },
];

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1.5, textTransform: "uppercase", color: P.t3, marginBottom: 6, marginTop: 16 }}>
      {children}
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: P.tm, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
      <div style={{ flex: 1, maxWidth: 160, marginLeft: 8 }}>{children}</div>
    </div>
  );
}

function SmallInput({ value, onChange, type = "text", ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      style={{
        width: "100%", padding: "4px 8px", borderRadius: 4,
        border: `1px solid ${P.bd}`, background: P.bg, color: P.tx,
        fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", outline: "none",
      }}
      {...props}
    />
  );
}

function SmallSelect({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: "100%", padding: "4px 8px", borderRadius: 4,
        border: `1px solid ${P.bd}`, background: P.bg, color: P.tx,
        fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", outline: "none",
        cursor: "pointer",
      }}
    >
      {children}
    </select>
  );
}

export default function DiagramPropertiesPanel({
  diagram,
  selectedNode,
  selectedEdge,
  onUpdateDiagram,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
  projects,
  activeProjectId,
}) {
  if (!diagram) {
    return (
      <div style={{ padding: 20, color: P.t3, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textAlign: "center", marginTop: 60 }}>
        No diagram selected
      </div>
    );
  }

  const sections = useMemo(() => {
    const proj = projects?.find((p) => p.id === (diagram.projectId || activeProjectId));
    if (!proj) return [];
    return flattenSections(proj.parts);
  }, [projects, diagram.projectId, activeProjectId]);

  const sectionParas = useMemo(() => {
    const sec = sections.find((s) => s.id === diagram.sectionId);
    return sec?.paragraphs || [];
  }, [sections, diagram.sectionId]);

  // ── Node properties ──
  if (selectedNode) {
    const nd = selectedNode.data;
    return (
      <div style={{ padding: "12px 16px", overflowY: "auto", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: P.tx, fontFamily: "'Cormorant Garamond', serif" }}>Node Properties</span>
          <button onClick={() => onDeleteNode(selectedNode.id)} style={{ background: "none", border: "none", color: "#943D3D", cursor: "pointer", padding: 4 }} title="Delete node">
            <Trash2 size={13} />
          </button>
        </div>

        <SectionLabel>Label</SectionLabel>
        <SmallInput value={nd.label || ""} onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })} />

        <SectionLabel>Subtitle</SectionLabel>
        <SmallInput value={nd.subtitle || ""} onChange={(e) => onUpdateNode(selectedNode.id, { subtitle: e.target.value })} />

        <SectionLabel>Shape</SectionLabel>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {Object.entries(DIAGRAM_NODE_SHAPES).map(([key, shape]) => (
            <button
              key={key}
              onClick={() => onUpdateNode(selectedNode.id, { shape: key })}
              style={{
                padding: "4px 10px", borderRadius: 4, fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                border: `1px solid ${nd.shape === key ? P.ac : P.bd}`,
                background: nd.shape === key ? `${P.ac}15` : P.bg,
                color: nd.shape === key ? P.ac : P.tm,
                cursor: "pointer",
              }}
            >
              {shape.label}
            </button>
          ))}
        </div>

        <SectionLabel>Color</SectionLabel>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onUpdateNode(selectedNode.id, { color: c.value })}
              title={c.label}
              style={{
                width: 22, height: 22, borderRadius: "50%", border: `2px solid ${nd.color === c.value ? P.tx : "transparent"}`,
                background: c.value, cursor: "pointer", transition: "border-color 0.15s",
              }}
            />
          ))}
        </div>

        <SectionLabel>Font Size</SectionLabel>
        <SmallInput type="number" value={nd.fontSize || 13} min={9} max={24}
          onChange={(e) => onUpdateNode(selectedNode.id, { fontSize: parseInt(e.target.value) || 13 })} />
      </div>
    );
  }

  // ── Edge properties ──
  if (selectedEdge) {
    return (
      <div style={{ padding: "12px 16px", overflowY: "auto", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: P.tx, fontFamily: "'Cormorant Garamond', serif" }}>Edge Properties</span>
          <button onClick={() => onDeleteEdge(selectedEdge.id)} style={{ background: "none", border: "none", color: "#943D3D", cursor: "pointer", padding: 4 }} title="Delete edge">
            <Trash2 size={13} />
          </button>
        </div>

        <SectionLabel>Style</SectionLabel>
        <div style={{ display: "flex", gap: 4 }}>
          {["smoothstep", "straight", "bezier"].map((type) => (
            <button
              key={type}
              onClick={() => onUpdateEdge(selectedEdge.id, { type })}
              style={{
                padding: "4px 10px", borderRadius: 4, fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                border: `1px solid ${selectedEdge.type === type ? P.ac : P.bd}`,
                background: selectedEdge.type === type ? `${P.ac}15` : P.bg,
                color: selectedEdge.type === type ? P.ac : P.tm,
                cursor: "pointer", textTransform: "capitalize",
              }}
            >
              {type}
            </button>
          ))}
        </div>

        <SectionLabel>Animated</SectionLabel>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={selectedEdge.animated || false}
            onChange={(e) => onUpdateEdge(selectedEdge.id, { animated: e.target.checked })} />
          <span style={{ fontSize: 11, color: P.tm, fontFamily: "'IBM Plex Mono', monospace" }}>Animate flow</span>
        </label>

        <SectionLabel>Stroke Width</SectionLabel>
        <SmallInput type="number" value={selectedEdge.style?.strokeWidth || 1.5} min={0.5} max={6} step={0.5}
          onChange={(e) => onUpdateEdge(selectedEdge.id, { style: { ...(selectedEdge.style || {}), strokeWidth: parseFloat(e.target.value) || 1.5 } })} />

        <SectionLabel>Label</SectionLabel>
        <SmallInput value={selectedEdge.label || ""} onChange={(e) => onUpdateEdge(selectedEdge.id, { label: e.target.value })} placeholder="Optional edge label..." />
      </div>
    );
  }

  // ── Diagram meta properties ──
  return (
    <div style={{ padding: "12px 16px", overflowY: "auto", height: "100%" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: P.tx, fontFamily: "'Cormorant Garamond', serif" }}>Diagram Properties</span>

      <SectionLabel>Title</SectionLabel>
      <SmallInput value={diagram.title} onChange={(e) => onUpdateDiagram(diagram.id, { title: e.target.value })} />

      <SectionLabel>Caption</SectionLabel>
      <SmallInput value={diagram.caption || ""} onChange={(e) => onUpdateDiagram(diagram.id, { caption: e.target.value })} placeholder="Figure caption..." />

      <SectionLabel>Placement</SectionLabel>
      <FieldRow label="Section">
        <SmallSelect value={diagram.sectionId || ""} onChange={(e) => onUpdateDiagram(diagram.id, { sectionId: e.target.value || null, afterParagraphId: null })}>
          <option value="">— None —</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{"  ".repeat(s.depth || 0)}{s.title}</option>
          ))}
        </SmallSelect>
      </FieldRow>

      {diagram.sectionId && (
        <FieldRow label="After ¶">
          <SmallSelect value={diagram.afterParagraphId || ""} onChange={(e) => onUpdateDiagram(diagram.id, { afterParagraphId: e.target.value || null })}>
            <option value="">Top of section</option>
            {sectionParas.map((p, i) => (
              <option key={p.id} value={p.id}>¶{i + 1}: {(p.text || "").slice(0, 35)}...</option>
            ))}
          </SmallSelect>
        </FieldRow>
      )}

      <SectionLabel>Display</SectionLabel>
      <FieldRow label="Mode">
        <SmallSelect value={diagram.display || "float"} onChange={(e) => onUpdateDiagram(diagram.id, { display: e.target.value })}>
          <option value="float">Side-by-side (float)</option>
          <option value="inline">Full width (inline)</option>
        </SmallSelect>
      </FieldRow>

      {diagram.display === "float" && (
        <FieldRow label="Width">
          <SmallInput type="number" value={diagram.floatWidth || 320} min={200} max={500} step={20}
            onChange={(e) => onUpdateDiagram(diagram.id, { floatWidth: parseInt(e.target.value) || 320 })} />
        </FieldRow>
      )}

      <FieldRow label="Height">
        <SmallInput type="number" value={diagram.height || 400} min={150} max={800} step={25}
          onChange={(e) => onUpdateDiagram(diagram.id, { height: parseInt(e.target.value) || 400 })} />
      </FieldRow>
    </div>
  );
}
