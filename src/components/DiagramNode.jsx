import React, { useState, useRef, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { PALETTE as P } from "../data/constants.js";

const SHAPE_STYLES = {
  rounded: { borderRadius: 8 },
  pill: { borderRadius: 24 },
  diamond: { borderRadius: 4, transform: "rotate(45deg)" },
  circle: { borderRadius: "50%", minWidth: 100, minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  ring: { borderRadius: "50%", minWidth: 140, minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center", borderStyle: "dashed", borderWidth: 2 },
  substrate: { borderRadius: 6, minWidth: 300, borderStyle: "dashed", borderWidth: 1.5, opacity: 0.7 },
  intervention: { borderRadius: 4, borderWidth: 2.5, borderStyle: "solid" },
  hexagon: { borderRadius: 8, clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)", minWidth: 100, minHeight: 90 },
};

export default function DiagramNode({ data, selected, id }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(data.label || "");
  const inputRef = useRef(null);

  const color = data.color || P.ac;
  const shape = data.shape || "rounded";
  const shapeStyle = SHAPE_STYLES[shape] || SHAPE_STYLES.rounded;
  const isDiamond = shape === "diamond";

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditText(data.label || "");
    setEditing(true);
  };

  const commitEdit = () => {
    setEditing(false);
    if (data.onLabelChange && editText !== data.label) {
      data.onLabelChange(id, editText);
    }
  };

  const innerContent = (
    <>
      {editing ? (
        <input
          ref={inputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
          style={{
            background: "transparent", border: "none", outline: "none", textAlign: "center",
            fontFamily: "'Cormorant Garamond', serif", fontSize: data.fontSize || 13,
            fontWeight: 600, color: P.tx, width: "100%",
          }}
        />
      ) : (
        <div style={{ textAlign: "center", fontFamily: "'Cormorant Garamond', serif", fontSize: data.fontSize || 13, fontWeight: 600, color: P.tx, lineHeight: 1.3 }}>
          {data.label || "Node"}
        </div>
      )}
      {data.subtitle && !editing && (
        <div style={{ textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: P.tf, marginTop: 2, lineHeight: 1.2 }}>
          {data.subtitle}
        </div>
      )}
    </>
  );

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: color, width: 6, height: 6, border: `2px solid ${P.bg}` }} />
      <Handle type="target" position={Position.Left} style={{ background: color, width: 6, height: 6, border: `2px solid ${P.bg}` }} />

      <div
        onDoubleClick={handleDoubleClick}
        style={{
          background: selected ? `${color}12` : P.bg,
          border: `${selected ? 2 : 1.5}px solid ${selected ? color : `${color}60`}`,
          padding: isDiamond ? "16px" : shape === "circle" ? "16px" : "10px 16px",
          minWidth: shape === "circle" ? 100 : 100,
          maxWidth: isDiamond ? 140 : 200,
          boxShadow: selected
            ? `0 0 0 2px ${color}20, 0 4px 16px rgba(44,36,24,0.1)`
            : "0 2px 8px rgba(44,36,24,0.06)",
          transition: "all 0.2s ease",
          cursor: "grab",
          ...shapeStyle,
        }}
      >
        {isDiamond ? (
          <div style={{ transform: "rotate(-45deg)", padding: 4 }}>{innerContent}</div>
        ) : innerContent}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 6, height: 6, border: `2px solid ${P.bg}` }} />
      <Handle type="source" position={Position.Right} style={{ background: color, width: 6, height: 6, border: `2px solid ${P.bg}` }} />
    </>
  );
}
