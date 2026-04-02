import React, { useMemo } from "react";
import { Search, AlignLeft, Network, Hash, GitBranch, Upload, Lightbulb, BookOpen, Waypoints, StickyNote, Check, Loader, AlertCircle, Maximize2 } from "lucide-react";
import { PALETTE as P } from "../data/constants.js";
import { flattenSections } from "../hooks/useWorkspaceState.js";
import { NOTE_CATEGORIES } from "../data/notes.js";

export default function TopBar({ searchQuery, setSearchQuery, view, setView, projects, linkedTerms, notes = [], onTermClick, onSelectDoc, onImport, saveStatus = "saved", onZenMode }) {
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const res = [];
    for (const p of projects) {
      const sections = flattenSections(p.parts);
      for (const s of sections) {
        for (const pa of s.paragraphs || []) {
          if (pa.text?.toLowerCase().includes(q)) res.push({ project: p, section: s, para: pa });
        }
        if (s.spine?.toLowerCase().includes(q)) res.push({ project: p, section: s, isSpine: true });
        if (s.title?.toLowerCase().includes(q)) res.push({ project: p, section: s, isTitle: true });
      }
    }
    for (const [t, data] of Object.entries(linkedTerms)) {
      if (t.includes(q) || data.definition.toLowerCase().includes(q)) res.push({ isTerm: true, term: t, data });
    }
    for (const n of notes) {
      if (n.text?.toLowerCase().includes(q) || n.tags?.some((t) => t.includes(q))) {
        res.push({ isNote: true, note: n });
      }
    }
    return res.slice(0, 12);
  }, [searchQuery, projects, linkedTerms, notes]);

  return (
    <div style={{ height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: `1px solid ${P.bd}`, background: P.tb, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#F5F0E8", fontWeight: 300, letterSpacing: 3, fontStyle: "italic" }}>Tessera</div>
        <span style={{ fontSize: 9, color: "#8A7E6E", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>scholarly workspace</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4, opacity: saveStatus === "saved" ? 0.5 : 1, transition: "opacity 0.3s" }}>
          {saveStatus === "saved" && <Check size={10} style={{ color: "#7C9A6B" }} />}
          {saveStatus === "saving" && <Loader size={10} style={{ color: "#C9A84C", animation: "spin 1s linear infinite" }} />}
          {saveStatus === "error" && <AlertCircle size={10} style={{ color: "#C45B4A" }} />}
          <span style={{
            fontSize: 8, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1.5, textTransform: "uppercase",
            color: saveStatus === "error" ? "#C45B4A" : saveStatus === "saving" ? "#C9A84C" : "#7C9A6B",
          }}>
            {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving..." : "Save failed"}
          </span>
        </div>
      </div>

      <div style={{ position: "relative", width: 340 }}>
        <Search size={13} style={{ position: "absolute", left: 11, top: 9, color: "#8A7E6E" }} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects, terms, spines..."
          style={{ width: "100%", height: 32, background: "#3D3428", border: "1px solid #50473A", borderRadius: 4, padding: "0 12px 0 30px", color: "#E8E0D4", fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", outline: "none" }}
          onFocus={(e) => (e.target.style.borderColor = "#8B6540")}
          onBlur={(e) => (e.target.style.borderColor = "#50473A")}
        />
        {searchResults.length > 0 && searchQuery.length >= 2 && (
          <div style={{ position: "absolute", top: 38, left: 0, right: 0, background: P.bg, border: `1px solid ${P.bd}`, borderRadius: 6, maxHeight: 360, overflowY: "auto", zIndex: 1000, boxShadow: "0 12px 40px rgba(44,36,24,0.15)" }}>
            {searchResults.map((r, i) => (
              <div
                key={i}
                onClick={() => {
                  if (r.isNote) {
                    if (r.note.linkedSectionId && r.note.linkedProjectId) {
                      onSelectDoc(r.note.linkedProjectId, r.note.linkedSectionId);
                    }
                  } else if (r.isTerm) onTermClick(r.term);
                  else onSelectDoc(r.project.id, r.section.id);
                  setSearchQuery("");
                }}
                style={{ padding: "8px 14px", borderBottom: `1px solid ${P.bl}`, cursor: "pointer", transition: "background 0.15s" }}
                onMouseOver={(e) => (e.currentTarget.style.background = P.sh)}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {r.isNote ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <StickyNote size={11} style={{ color: (NOTE_CATEGORIES[r.note.category] || NOTE_CATEGORIES.idea).color }} />
                    <span style={{ fontSize: 10, color: (NOTE_CATEGORIES[r.note.category] || NOTE_CATEGORIES.idea).color, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {(NOTE_CATEGORIES[r.note.category] || NOTE_CATEGORIES.idea).label.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 12, color: P.tm }}>{r.note.text.slice(0, 60)}...</span>
                  </div>
                ) : r.isTerm ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Hash size={11} style={{ color: r.data.color }} />
                    <span style={{ color: r.data.color, fontWeight: 600 }}>{r.term}</span>
                    <span style={{ fontSize: 11, color: P.tf, marginLeft: 4 }}>{r.data.definition.slice(0, 50)}...</span>
                  </div>
                ) : r.isSpine || r.isTitle ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <GitBranch size={11} style={{ color: P.ac }} />
                    <span style={{ fontSize: 10, color: P.ac, fontFamily: "'IBM Plex Mono', monospace" }}>{r.isSpine ? "SPINE" : "SECTION"}</span>
                    <span style={{ fontSize: 13 }}>{r.section.title}</span>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.project.color }} />
                      <span style={{ fontSize: 10, color: r.project.color, fontFamily: "'IBM Plex Mono', monospace" }}>{r.project.name}</span>
                      <span style={{ fontSize: 10, color: P.tf }}>›</span>
                      <span style={{ fontSize: 11, color: P.tm }}>{r.section.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: P.tm, marginLeft: 12 }}>{r.para.text.slice(0, 80)}...</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 2, background: "#3D3428", borderRadius: 4, padding: 2 }}>
          {[
            ["editor", AlignLeft, "Editor"],
            ["brainstorm", Lightbulb, "Notes"],
            ["argmap", Network, "Arg Map"],
            ["calculus", BookOpen, "Calculus"],
            ["dictionary", Waypoints, "Dictionary"],
          ].map(([v, Icon, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
                background: view === v ? "#50473A" : "transparent",
                border: "none", borderRadius: 3, color: view === v ? "#F5F0E8" : "#8A7E6E",
                cursor: "pointer", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <Icon size={11} />{label}
            </button>
          ))}
        </div>
        {onImport && (
          <button
            onClick={onImport}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
              background: "#3D3428", border: "1px solid #50473A", borderRadius: 4,
              color: "#8A7E6E", cursor: "pointer", fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
            title="Import .docx file"
          >
            <Upload size={11} />Import
          </button>
        )}
        {onZenMode && (
          <button
            onClick={onZenMode}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
              background: "#3D3428", border: "1px solid #50473A", borderRadius: 4,
              color: "#8A7E6E", cursor: "pointer", fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
            title="Zen mode (Ctrl+Shift+F)"
          >
            <Maximize2 size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
