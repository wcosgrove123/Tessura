import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  Search, AlignLeft, Network, Hash, GitBranch, Upload, Lightbulb, BookOpen,
  Waypoints, StickyNote, Check, Loader, AlertCircle, Maximize2, Eye, Shapes,
  MoreVertical, ClipboardCheck, RefreshCw, ChevronDown,
} from "lucide-react";
import { PALETTE as P } from "../data/constants.js";
import { flattenSections } from "../hooks/useWorkspaceState.js";
import { NOTE_CATEGORIES } from "../data/notes.js";

// ── Tools Dropdown ────────────────────────────────────────────

function ToolsMenu({ onImport, onReimport, onPreview, onZenMode, onQcReport }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const items = [
    onImport && { icon: Upload, label: "Import .docx", onClick: onImport },
    onReimport && { icon: RefreshCw, label: "Reimport from script", onClick: onReimport, accent: true },
    onQcReport && { icon: ClipboardCheck, label: "QC Report", onClick: onQcReport },
    onPreview && { icon: Eye, label: "Print Preview", onClick: onPreview },
    onZenMode && { icon: Maximize2, label: "Zen Mode", onClick: onZenMode, shortcut: "Ctrl+Shift+F" },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Tools menu"
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", gap: 5, padding: "6px 10px",
          background: open ? "#50473A" : "#3D3428",
          border: "1px solid #50473A", borderRadius: 4,
          color: open ? "#F5F0E8" : "#A89E90", cursor: "pointer",
          fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: 0.5, transition: "all 0.15s",
          minHeight: 32,
        }}
        onMouseOver={(e) => { if (!open) { e.currentTarget.style.background = "#4A3F32"; e.currentTarget.style.color = "#E8DFD0"; }}}
        onMouseOut={(e) => { if (!open) { e.currentTarget.style.background = "#3D3428"; e.currentTarget.style.color = "#A89E90"; }}}
      >
        <MoreVertical size={13} />
        Tools
        <ChevronDown size={10} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 1000,
          background: "#2C2418", border: "1px solid #50473A", borderRadius: 6,
          minWidth: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          padding: "4px 0", animation: "fadeSlideIn 150ms ease-out",
        }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 14px", background: "transparent", border: "none",
                color: item.accent ? "#D4A574" : "#C4B9A8", cursor: "pointer",
                fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                textAlign: "left", transition: "background 0.12s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "#3D3428"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <item.icon size={13} style={{ opacity: 0.8 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.shortcut && (
                <span style={{ fontSize: 9, color: "#7D6E5D", letterSpacing: 0.5 }}>{item.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main TopBar ───────────────────────────────────────────────

export default function TopBar({
  searchQuery, setSearchQuery, view, setView,
  projects, linkedTerms, notes = [], sources = [],
  onTermClick, onSelectDoc,
  onImport, onReimport, onPreview, onZenMode, onQcReport,
  saveStatus = "saved",
}) {
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
    for (const s of sources) {
      if (s.title?.toLowerCase().includes(q) || s.citationKey?.toLowerCase().includes(q) ||
          s.authors?.some((a) => a.family?.toLowerCase().includes(q))) {
        res.push({ isSource: true, source: s });
      }
    }
    return res.slice(0, 14);
  }, [searchQuery, projects, linkedTerms, notes, sources]);

  const VIEW_TABS = [
    ["editor", AlignLeft, "Editor"],
    ["brainstorm", Lightbulb, "Notes"],
    ["argmap", Network, "Arg Map"],
    ["diagrams", Shapes, "Diagrams"],
    ["calculus", BookOpen, "Calculus"],
    ["dictionary", Waypoints, "Dictionary"],
  ];

  return (
    <div style={{
      height: 50, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px", borderBottom: `1px solid ${P.bd}`, background: P.tb, flexShrink: 0,
      gap: 12,
    }}>
      {/* ── Left: Logo + Save Status ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 22,
          color: "#F5F0E8", fontWeight: 300, letterSpacing: 3, fontStyle: "italic",
        }}>
          Tessera
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          opacity: saveStatus === "saved" ? 0.5 : 1, transition: "opacity 0.3s",
        }}>
          {saveStatus === "saved" && <Check size={10} style={{ color: "#7C9A6B" }} />}
          {saveStatus === "saving" && <Loader size={10} style={{ color: "#C9A84C", animation: "spin 1s linear infinite" }} />}
          {saveStatus === "error" && <AlertCircle size={10} style={{ color: "#C45B4A" }} />}
          <span style={{
            fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1.5, textTransform: "uppercase",
            color: saveStatus === "error" ? "#C45B4A" : saveStatus === "saving" ? "#C9A84C" : "#7C9A6B",
          }}>
            {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving..." : "Save failed"}
          </span>
        </div>
      </div>

      {/* ── Center-Left: View Navigation Tabs ── */}
      <nav style={{ display: "flex", gap: 1, background: "#3D3428", borderRadius: 5, padding: 2 }} aria-label="Main navigation">
        {VIEW_TABS.map(([v, Icon, label]) => {
          const active = view === v;
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-current={active ? "page" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 11px", minHeight: 28,
                background: active ? "#50473A" : "transparent",
                border: "none", borderRadius: 3,
                color: active ? "#F5F0E8" : "#A89E90",
                cursor: "pointer", fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                transition: "all 0.15s",
                fontWeight: active ? 500 : 400,
              }}
              onMouseOver={(e) => { if (!active) e.currentTarget.style.color = "#D4C8B8"; }}
              onMouseOut={(e) => { if (!active) e.currentTarget.style.color = "#A89E90"; }}
            >
              <Icon size={11} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* ── Center-Right: Search ── */}
      <div style={{ position: "relative", width: 280, flexShrink: 1, minWidth: 160 }}>
        <Search size={13} style={{ position: "absolute", left: 11, top: 9, color: "#A89E90", pointerEvents: "none" }} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects, terms, spines..."
          style={{
            width: "100%", height: 32,
            background: "#3D3428", border: "1px solid #50473A", borderRadius: 4,
            padding: "0 12px 0 30px", color: "#E8E0D4",
            fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#8B6540")}
          onBlur={(e) => (e.target.style.borderColor = "#50473A")}
        />
        {searchResults.length > 0 && searchQuery.length >= 2 && (
          <div style={{
            position: "absolute", top: 38, left: 0, right: 0,
            background: P.bg, border: `1px solid ${P.bd}`, borderRadius: 6,
            maxHeight: "min(360px, 60vh)", overflowY: "auto", zIndex: 1000,
            boxShadow: "0 12px 40px rgba(44,36,24,0.15)", animation: "fadeSlideIn 180ms ease-out",
          }}>
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
                style={{
                  padding: "8px 14px", borderBottom: `1px solid ${P.bl}`,
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = P.sh)}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {r.isSource ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <BookOpen size={11} style={{ color: P.ac }} />
                    <span style={{ fontSize: 10, color: P.ac, fontFamily: "'IBM Plex Mono', monospace" }}>SOURCE</span>
                    <span style={{ fontSize: 12, color: P.tx, fontWeight: 500 }}>{r.source.title?.slice(0, 50)}{r.source.title?.length > 50 ? "..." : ""}</span>
                    <span style={{ fontSize: 10, color: P.tf }}>{r.source.authors?.[0]?.family} ({r.source.year || "n.d."})</span>
                  </div>
                ) : r.isNote ? (
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
                      <span style={{ fontSize: 10, color: P.tf }}>&rsaquo;</span>
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

      {/* ── Right: Tools Dropdown ── */}
      <ToolsMenu
        onImport={onImport}
        onReimport={onReimport}
        onPreview={onPreview}
        onZenMode={onZenMode}
        onQcReport={onQcReport}
      />
    </div>
  );
}
