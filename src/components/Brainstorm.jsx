import React, { useState, useMemo, useCallback } from "react";
import { Plus, X, Tag, Link2, Filter, Search, Edit3, Check, Trash2, ArrowRight, Unlink, CheckSquare, Square } from "lucide-react";
import { PALETTE as P } from "../data/constants.js";
import { NOTE_CATEGORIES } from "../data/notes.js";
import ConfirmModal from "./ConfirmModal.jsx";

function NoteCard({ note, onEdit, onDelete, onLink, allTags, isEditing, onSave, onCancel }) {
  const cat = NOTE_CATEGORIES[note.category] || NOTE_CATEGORIES.idea;
  const [editText, setEditText] = useState(note.text);
  const [editTags, setEditTags] = useState(note.tags?.join(", ") || "");
  const [editCategory, setEditCategory] = useState(note.category);

  if (isEditing) {
    return (
      <div style={{
        padding: "14px 16px", borderRadius: 8, background: P.bg,
        border: `2px solid ${P.ac}40`, boxShadow: "0 4px 16px rgba(44,36,24,0.08)",
      }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {Object.entries(NOTE_CATEGORIES).filter(([k]) => k !== "comment").map(([key, c]) => (
            <button key={key} onClick={() => setEditCategory(key)}
              style={{
                fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 8px",
                borderRadius: 3, cursor: "pointer", border: `1px solid ${c.color}30`,
                background: editCategory === key ? `${c.color}20` : "transparent",
                color: c.color, fontWeight: editCategory === key ? 600 : 400,
              }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
          autoFocus
          style={{
            width: "100%", minHeight: 80, fontSize: 13, lineHeight: 1.6,
            fontFamily: "'Spectral', serif", color: P.tx, background: P.sf,
            border: `1px solid ${P.bd}`, borderRadius: 4, padding: 10, outline: "none",
            resize: "vertical",
          }} />
        <input value={editTags} onChange={(e) => setEditTags(e.target.value)}
          placeholder="Tags (comma-separated)"
          style={{
            width: "100%", marginTop: 6, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
            color: P.tm, background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 4,
            padding: "6px 10px", outline: "none",
          }} />
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button onClick={() => onSave({ ...note, text: editText, category: editCategory, tags: editTags.split(",").map(t => t.trim()).filter(Boolean) })}
            style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 12px", background: P.ac, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
            Save
          </button>
          <button onClick={onCancel}
            style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 12px", background: P.sf, color: P.tm, border: `1px solid ${P.bd}`, borderRadius: 3, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const sectionId = note.linkedSectionId;

  return (
    <div style={{
      padding: "12px 14px", borderRadius: 8, background: P.bg,
      border: `1px solid ${P.bl}`, borderLeft: `3px solid ${cat.color}`,
      transition: "all 0.2s", cursor: "default",
    }}
      onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(44,36,24,0.06)")}
      onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{
          fontSize: 8, fontFamily: "'IBM Plex Mono', monospace", padding: "2px 7px",
          borderRadius: 3, background: `${cat.color}12`, color: cat.color,
          letterSpacing: 1, textTransform: "uppercase", fontWeight: 600,
        }}>
          {cat.icon} {cat.label}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => onEdit(note.id)} style={{ background: "none", border: "none", cursor: "pointer", color: P.tf, padding: 2 }}>
            <Edit3 size={11} />
          </button>
          <button onClick={() => onDelete(note.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#943D3D", padding: 2 }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: P.tx, fontFamily: "'Spectral', serif", marginBottom: 8 }}>
        {note.text}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        {note.tags?.map((tag) => (
          <span key={tag} style={{
            fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 6px",
            borderRadius: 10, background: `${cat.color}08`, color: cat.color,
            border: `1px solid ${cat.color}20`,
          }}>
            {tag}
          </span>
        ))}
        {sectionId && (
          <span onClick={() => onLink(note.linkedProjectId || "purpose-of-schools", sectionId)} style={{
            fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 6px",
            borderRadius: 10, background: `${P.ac}08`, color: P.ac,
            border: `1px solid ${P.ac}20`, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 3,
          }}>
            <ArrowRight size={8} /> {sectionId}
          </span>
        )}
        {!sectionId && (
          <span style={{
            fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 6px",
            borderRadius: 10, background: `${P.tf}08`, color: P.tf,
            border: `1px solid ${P.tf}20`,
            display: "flex", alignItems: "center", gap: 3,
          }}>
            <Unlink size={8} /> loose
          </span>
        )}
      </div>
    </div>
  );
}

export default function Brainstorm({ notes, addNote, updateNote, deleteNote, onNavigateToSection }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [linkFilter, setLinkFilter] = useState("all"); // "all" | "linked" | "loose"
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "oldest" | "category" | "tags"
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [confirmAction, setConfirmAction] = useState(null);

  // All unique tags
  const allTags = useMemo(() => {
    const tags = new Set();
    notes.forEach((n) => n.tags?.forEach((t) => tags.add(t)));
    return [...tags].sort();
  }, [notes]);

  // Filtered notes
  const filtered = useMemo(() => {
    let result = notes;
    // Exclude inline comments from the global brainstorm view
    result = result.filter((n) => n.category !== "comment");
    if (activeCategory !== "all") result = result.filter((n) => n.category === activeCategory);
    if (activeTag) result = result.filter((n) => n.tags?.includes(activeTag));
    if (linkFilter === "linked") result = result.filter((n) => n.linkedSectionId);
    if (linkFilter === "loose") result = result.filter((n) => !n.linkedSectionId);
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      result = result.filter((n) => n.text.toLowerCase().includes(q) || n.tags?.some((t) => t.includes(q)));
    }
    // Sort
    if (sortBy === "newest") result = [...result].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    else if (sortBy === "oldest") result = [...result].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    else if (sortBy === "category") result = [...result].sort((a, b) => (a.category || "").localeCompare(b.category || ""));
    else if (sortBy === "tags") result = [...result].sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0));
    return result;
  }, [notes, activeCategory, activeTag, linkFilter, searchQuery, sortBy]);

  const counts = useMemo(() => {
    const visible = notes.filter((n) => n.category !== "comment");
    const c = { all: visible.length };
    for (const key of Object.keys(NOTE_CATEGORIES)) {
      if (key === "comment") continue;
      c[key] = visible.filter((n) => n.category === key).length;
    }
    return c;
  }, [notes]);

  const toggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    setConfirmAction({
      title: `Delete ${selected.size} notes?`,
      message: "This will permanently remove the selected notes.",
      onConfirm: () => {
        for (const id of selected) deleteNote(id);
        setSelected(new Set());
        setSelectMode(false);
        setConfirmAction(null);
      },
    });
  }, [selected, deleteNote]);

  const handleSelectAll = useCallback(() => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((n) => n.id)));
    }
  }, [selected, filtered]);

  const handleAddNote = useCallback(() => {
    const note = addNote({
      category: activeCategory === "all" ? "idea" : activeCategory,
      text: "",
      tags: [],
    });
    setEditingId(note.id);
  }, [activeCategory, addNote]);

  const handleSaveNote = useCallback((updated) => {
    updateNote(updated.id, {
      text: updated.text,
      category: updated.category,
      tags: updated.tags,
    });
    setEditingId(null);
  }, [updateNote]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 32px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: P.tx, margin: 0 }}>
            Brainstorm
          </h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { setSelectMode((m) => !m); setSelected(new Set()); }}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                background: selectMode ? `${P.ac}15` : P.sf, color: selectMode ? P.ac : P.tm,
                border: `1px solid ${selectMode ? P.ac + "40" : P.bd}`, borderRadius: 5,
                cursor: "pointer", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
              }}>
              <CheckSquare size={11} /> {selectMode ? "Done" : "Select"}
            </button>
            <button onClick={handleAddNote}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "6px 14px",
                background: P.ac, color: "#fff", border: "none", borderRadius: 5,
                cursor: "pointer", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
              }}>
              <Plus size={12} /> New Note
            </button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selectMode && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 0", marginBottom: 8,
            borderBottom: `1px solid ${P.bd}`,
          }}>
            <button onClick={handleSelectAll}
              style={{
                fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 8px",
                background: "transparent", border: `1px solid ${P.bd}`, borderRadius: 3,
                cursor: "pointer", color: P.tm,
              }}>
              {selected.size === filtered.length ? "Deselect all" : "Select all"}
            </button>
            <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: P.tf }}>
              {selected.size} selected
            </span>
            {selected.size > 0 && (
              <button onClick={handleBulkDelete}
                style={{
                  fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 8px",
                  background: "#943D3D", color: "#fff", border: "none", borderRadius: 3,
                  cursor: "pointer", marginLeft: "auto",
                }}>
                <Trash2 size={9} style={{ marginRight: 3, verticalAlign: "middle" }} /> Delete selected
              </button>
            )}
          </div>
        )}

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
          <button onClick={() => { setActiveCategory("all"); setActiveTag(null); }}
            style={{
              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "5px 12px",
              borderRadius: 4, cursor: "pointer",
              background: activeCategory === "all" ? P.tb : P.sf,
              color: activeCategory === "all" ? "#F5F0E8" : P.tm,
              border: `1px solid ${activeCategory === "all" ? P.tb : P.bd}`,
            }}>
            All ({counts.all})
          </button>
          {Object.entries(NOTE_CATEGORIES).filter(([k]) => k !== "comment").map(([key, cat]) => (
            <button key={key} onClick={() => { setActiveCategory(key); setActiveTag(null); }}
              style={{
                fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "5px 12px",
                borderRadius: 4, cursor: "pointer",
                background: activeCategory === key ? `${cat.color}15` : P.sf,
                color: activeCategory === key ? cat.color : P.tm,
                border: `1px solid ${activeCategory === key ? cat.color + "40" : P.bd}`,
                fontWeight: activeCategory === key ? 600 : 400,
              }}>
              {cat.icon} {cat.label} ({counts[key] || 0})
            </button>
          ))}
        </div>

        {/* Search + link filter + active tag */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={12} style={{ position: "absolute", left: 10, top: 9, color: P.tf }} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              style={{
                width: "100%", height: 30, background: P.sf, border: `1px solid ${P.bd}`,
                borderRadius: 4, padding: "0 12px 0 28px", color: P.tx, fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace", outline: "none",
              }} />
          </div>
          {["all", "linked", "loose"].map((f) => (
            <button key={f} onClick={() => setLinkFilter(f)}
              style={{
                fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 10px",
                borderRadius: 4, cursor: "pointer",
                background: linkFilter === f ? `${P.ac}15` : "transparent",
                color: linkFilter === f ? P.ac : P.tf,
                border: `1px solid ${linkFilter === f ? P.ac + "40" : "transparent"}`,
                textTransform: "capitalize",
              }}>
              {f === "all" ? "All" : f === "linked" ? "Linked" : "Loose"}
            </button>
          ))}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{
              fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 6px",
              borderRadius: 4, background: P.sf, color: P.tm, border: `1px solid ${P.bd}`,
              cursor: "pointer", outline: "none",
            }}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="category">Category</option>
            <option value="tags">Most tags</option>
          </select>
          {activeTag && (
            <span onClick={() => setActiveTag(null)}
              style={{
                fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 10px",
                borderRadius: 10, background: `${P.ac}10`, color: P.ac,
                border: `1px solid ${P.ac}25`, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}>
              <Tag size={10} /> {activeTag} <X size={10} />
            </span>
          )}
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 32px 32px" }}>
        <div style={{ display: "flex", gap: 16 }}>
          {/* Notes column */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: P.tf }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>💡</div>
                <div style={{ fontFamily: "'Spectral', serif", fontSize: 14 }}>
                  {searchQuery ? "No notes match your search" : "No notes in this category yet"}
                </div>
              </div>
            ) : (
              filtered.map((note) => (
                <div key={note.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  {selectMode && (
                    <div
                      onClick={() => toggleSelect(note.id)}
                      style={{ paddingTop: 10, cursor: "pointer", flexShrink: 0 }}
                    >
                      {selected.has(note.id)
                        ? <CheckSquare size={15} style={{ color: P.ac }} />
                        : <Square size={15} style={{ color: P.tf }} />
                      }
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <NoteCard
                      note={note}
                      isEditing={editingId === note.id}
                      onEdit={setEditingId}
                      onDelete={deleteNote}
                      onLink={(projectId, sectionId) => onNavigateToSection(projectId, sectionId)}
                      onSave={handleSaveNote}
                      onCancel={() => setEditingId(null)}
                      allTags={allTags}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tags sidebar */}
          <div style={{ width: 180, flexShrink: 0 }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: 2,
              textTransform: "uppercase", color: P.tf, marginBottom: 10,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Tag size={10} /> Tags
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {allTags.map((tag) => {
                const count = notes.filter((n) => n.tags?.includes(tag)).length;
                return (
                  <div key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                      background: activeTag === tag ? `${P.ac}10` : "transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseOver={(e) => { if (activeTag !== tag) e.currentTarget.style.background = P.sh; }}
                    onMouseOut={(e) => { if (activeTag !== tag) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 10, color: activeTag === tag ? P.ac : P.tm, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {tag}
                    </span>
                    <span style={{ fontSize: 9, color: P.tf }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title || ""}
        message={confirmAction?.message || ""}
        danger={true}
        confirmLabel="Delete"
        onConfirm={confirmAction?.onConfirm || (() => setConfirmAction(null))}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
