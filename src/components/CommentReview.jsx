import React, { useState, useCallback, useMemo } from "react";
import { PALETTE as P } from "../data/constants.js";
import { NOTE_CATEGORIES } from "../data/notes.js";
import { CheckSquare, Square, X, Check, ChevronDown } from "lucide-react";

/**
 * CommentReview — Modal for reviewing and categorizing imported Word comments.
 * Shows each comment with its auto-recommended category, letting the user
 * accept/override before saving to the notes system.
 */

const CATEGORY_OPTIONS = Object.entries(NOTE_CATEGORIES).map(([key, val]) => ({
  key,
  label: val.label,
  icon: val.icon,
  color: val.color,
}));

function CategoryDropdown({ value, onChange }) {
  const cat = NOTE_CATEGORIES[value] || NOTE_CATEGORIES.comment;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: `${cat.color}15`,
        border: `1px solid ${cat.color}40`,
        borderRadius: 4,
        padding: "3px 8px",
        fontSize: 11,
        color: cat.color,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      {CATEGORY_OPTIONS.map((opt) => (
        <option key={opt.key} value={opt.key}>
          {opt.icon} {opt.label}
        </option>
      ))}
    </select>
  );
}

export default function CommentReview({ comments, onSave, onCancel }) {
  // Each comment has: id, text, category, _recommendedCategory, _anchorExcerpt, _author, _reviewStatus
  const [items, setItems] = useState(() =>
    comments.map((c) => ({
      ...c,
      category: c._recommendedCategory || c.category || "comment",
      accepted: false,
      skipped: false,
    }))
  );

  const [filter, setFilter] = useState("all"); // 'all', 'pending', 'accepted', 'skipped'

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "pending") return items.filter((i) => !i.accepted && !i.skipped);
    if (filter === "accepted") return items.filter((i) => i.accepted);
    if (filter === "skipped") return items.filter((i) => i.skipped);
    return items;
  }, [items, filter]);

  const counts = useMemo(() => ({
    all: items.length,
    pending: items.filter((i) => !i.accepted && !i.skipped).length,
    accepted: items.filter((i) => i.accepted).length,
    skipped: items.filter((i) => i.skipped).length,
  }), [items]);

  const updateItem = useCallback((id, updates) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }, []);

  const acceptAll = useCallback(() => {
    setItems((prev) => prev.map((i) => ({ ...i, accepted: true, skipped: false })));
  }, []);

  const handleSave = useCallback(() => {
    // Only save accepted comments as notes (strip internal fields)
    const accepted = items
      .filter((i) => i.accepted)
      .map(({ accepted, skipped, _recommendedCategory, _reviewStatus, _author, _anchorExcerpt, _wordCommentId, ...note }) => note);
    onSave(accepted);
  }, [items, onSave]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(44,36,24,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: P.bg,
          border: `1px solid ${P.bd}`,
          borderRadius: 12,
          width: "min(900px, 90vw)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(44,36,24,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${P.bd}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: P.tx, fontFamily: "'Cormorant Garamond', serif" }}>
              Review Imported Comments
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: P.tf }}>
              {comments.length} Word comments extracted. Review categories and accept to import as notes.
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: P.tf, padding: 6, borderRadius: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            padding: "8px 20px",
            borderBottom: `1px solid ${P.bd}`,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {["all", "pending", "accepted", "skipped"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 12px",
                borderRadius: 4,
                border: `1px solid ${filter === f ? P.ac : P.bd}`,
                background: filter === f ? `${P.ac}15` : "transparent",
                color: filter === f ? P.ac : P.tm,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
                textTransform: "capitalize",
              }}
            >
              {f} ({counts[f]})
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button
            onClick={acceptAll}
            style={{
              padding: "4px 12px",
              borderRadius: 4,
              border: `1px solid #2D6B5A40`,
              background: "#2D6B5A15",
              color: "#2D6B5A",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Accept All Recommendations
          </button>
        </div>

        {/* Comment list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                padding: "10px 20px",
                borderBottom: `1px solid ${P.bd}20`,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                opacity: item.skipped ? 0.4 : 1,
                background: item.accepted ? "#2D6B5A08" : "transparent",
              }}
            >
              {/* Accept/Skip toggle */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 2 }}>
                <button
                  onClick={() => updateItem(item.id, { accepted: !item.accepted, skipped: false })}
                  title={item.accepted ? "Undo accept" : "Accept as note"}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: item.accepted ? "#2D6B5A" : P.tf, padding: 2,
                  }}
                >
                  {item.accepted ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: P.tx, lineHeight: 1.5, marginBottom: 6 }}>
                  {item.text.length > 200 ? item.text.slice(0, 200) + "..." : item.text}
                </div>

                {item._anchorExcerpt && (
                  <div style={{
                    fontSize: 10, color: P.tf, fontStyle: "italic",
                    padding: "4px 8px", background: `${P.bd}20`, borderRadius: 4,
                    marginBottom: 6, borderLeft: `2px solid ${P.bd}`,
                  }}>
                    Anchor: "{item._anchorExcerpt.slice(0, 80)}..."
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <CategoryDropdown
                    value={item.category}
                    onChange={(cat) => updateItem(item.id, { category: cat })}
                  />
                  {item._recommendedCategory && item.category !== item._recommendedCategory && (
                    <span style={{ fontSize: 10, color: P.tf }}>
                      (was: {NOTE_CATEGORIES[item._recommendedCategory]?.label})
                    </span>
                  )}
                  <button
                    onClick={() => updateItem(item.id, { skipped: !item.skipped, accepted: false })}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 10, color: item.skipped ? "#943D3D" : P.tf,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {item.skipped ? "Unskip" : "Skip"}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: P.tf, fontSize: 13 }}>
              No comments in this filter.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${P.bd}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, color: P.tf }}>
            {counts.accepted} accepted, {counts.skipped} skipped, {counts.pending} pending
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onCancel}
              style={{
                padding: "6px 16px", borderRadius: 6,
                border: `1px solid ${P.bd}`, background: "transparent",
                color: P.tm, fontSize: 12, cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: "6px 16px", borderRadius: 6,
                border: "none", background: P.ac, color: "#fff",
                fontSize: 12, cursor: "pointer", fontWeight: 600,
              }}
            >
              Save {counts.accepted} Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
