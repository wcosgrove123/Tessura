import React, { useState, useMemo, useCallback, useEffect } from "react";
import { GitBranch, Link2, Plus, Trash2, Check, Edit3, FolderPlus, ChevronRight, MessageSquare, X, ChevronDown, ChevronUp, StickyNote, Unlink, RotateCcw, MousePointer, List, FileText, BookOpen, Newspaper, AlignLeft } from "lucide-react";
import { PALETTE as P, STATUS, SPINE_ROLES, STATUS_VALUES, SPINE_ROLE_VALUES } from "../data/constants.js";
import { NOTE_CATEGORIES } from "../data/notes.js";
import { renderTermLinks } from "./TermHighlight.jsx";
import ParagraphEditor from "./ParagraphEditor.jsx";
import CitationPopover from "./CitationPopover.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import DiagramInline from "./DiagramInline.jsx";
import { loadZoteroSettings, searchLibrary as zoteroSearchLibrary } from "../lib/zoteroClient.js";
import { collectParagraphs, findSection } from "../hooks/useWorkspaceState.js";

// Render paragraph text with term links AND citation superscripts (non-selected view)
function renderTextWithCitations(text, linkedTerms, allTerms, onTermClick, paraCitations, noteIndexMap) {
  const base = renderTermLinks(text, linkedTerms, allTerms, onTermClick);
  if (!paraCitations?.length) return base;
  const markers = paraCitations
    .sort((a, b) => (noteIndexMap[a.id] || 999) - (noteIndexMap[b.id] || 999))
    .map((c) => (
      <sup key={c.id} className="cite-marker" title={`Footnote ${noteIndexMap[c.id] || "?"}`}>
        {noteIndexMap[c.id] || "?"}
      </sup>
    ));
  return <>{base}{markers}</>;
}

function findSiblings(children, parentId) {
  for (const child of children) {
    if (child.id === parentId) return child.children || [];
    if (child.children?.length) {
      const found = findSiblings(child.children, parentId);
      if (found) return found;
    }
  }
  return null;
}
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ── Shared small components ────────────────────────────────

function StatusSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      style={{
        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 8px",
        borderRadius: 3, background: STATUS[value]?.bg, color: STATUS[value]?.text,
        border: `1px solid ${STATUS[value]?.bd}`, letterSpacing: 1, textTransform: "uppercase",
        cursor: "pointer", outline: "none",
      }}
    >
      {STATUS_VALUES.map((s) => <option key={s} value={s}>{STATUS[s].l}</option>)}
    </select>
  );
}

function RoleSelect({ value, onChange }) {
  const role = SPINE_ROLES[value];
  return (
    <select
      value={value || "claim"}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      style={{
        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 8px",
        borderRadius: 3, background: `${role?.c || "#999"}0C`, color: role?.c || "#999",
        border: `1px solid ${role?.c || "#999"}25`, letterSpacing: 1, textTransform: "uppercase",
        cursor: "pointer", outline: "none",
      }}
    >
      {SPINE_ROLE_VALUES.map((r) => <option key={r} value={r}>{SPINE_ROLES[r].i} {SPINE_ROLES[r].l}</option>)}
    </select>
  );
}

// ── Mini note card for the notes panel ─────────────────────

function MiniNoteCard({ note, onEdit, onDelete, onSave, onCancel, isEditing }) {
  const cat = NOTE_CATEGORIES[note.category] || NOTE_CATEGORIES.idea;
  const [editText, setEditText] = useState(note.text);
  const [editCategory, setEditCategory] = useState(note.category);
  const [editTags, setEditTags] = useState(note.tags?.join(", ") || "");

  if (isEditing) {
    return (
      <div style={{
        padding: "8px 10px", borderRadius: 6, background: P.bg,
        border: `1.5px solid ${P.ac}40`, fontSize: 12,
      }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
          {Object.entries(NOTE_CATEGORIES).filter(([k]) => k !== "comment").map(([key, c]) => (
            <button key={key} onClick={() => setEditCategory(key)}
              style={{
                fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "2px 6px",
                borderRadius: 3, cursor: "pointer", border: `1px solid ${c.color}30`,
                background: editCategory === key ? `${c.color}20` : "transparent",
                color: c.color, fontWeight: editCategory === key ? 600 : 400,
              }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <textarea value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus
          style={{
            width: "100%", minHeight: 50, fontSize: 12, lineHeight: 1.5,
            fontFamily: "'Spectral', serif", color: P.tx, background: P.sf,
            border: `1px solid ${P.bd}`, borderRadius: 4, padding: 8, outline: "none",
            resize: "vertical",
          }} />
        <input value={editTags} onChange={(e) => setEditTags(e.target.value)}
          placeholder="Tags (comma-separated)"
          style={{
            width: "100%", marginTop: 4, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
            color: P.tm, background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 3,
            padding: "4px 8px", outline: "none",
          }} />
        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
          <button onClick={() => onSave(note.id, { text: editText, category: editCategory, tags: editTags.split(",").map(t => t.trim()).filter(Boolean) })}
            style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 10px", background: P.ac, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
            Save
          </button>
          <button onClick={onCancel}
            style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 10px", background: P.sf, color: P.tm, border: `1px solid ${P.bd}`, borderRadius: 3, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: "8px 10px", borderRadius: 6, background: P.bg,
      border: `1px solid ${P.bl}`, borderLeft: `2px solid ${cat.color}`,
      transition: "transform 0.18s ease, box-shadow 0.18s ease",
    }}
      onMouseOver={(e) => { e.currentTarget.style.boxShadow = "0 3px 10px rgba(44,36,24,0.07)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{
          fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 5px",
          borderRadius: 2, background: `${cat.color}12`, color: cat.color,
          letterSpacing: 1, textTransform: "uppercase", fontWeight: 600,
        }}>
          {cat.icon} {cat.label}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <button onClick={() => onEdit(note.id)} style={{ background: "none", border: "none", cursor: "pointer", color: P.tf, padding: 6, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseOver={(e) => (e.currentTarget.style.background = `${P.ac}10`)}
            onMouseOut={(e) => (e.currentTarget.style.background = "none")}>
            <Edit3 size={11} />
          </button>
          <button onClick={() => onDelete(note.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#943D3D", padding: 6, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#943D3D10")}
            onMouseOut={(e) => (e.currentTarget.style.background = "none")}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.5, color: P.tx, fontFamily: "'Spectral', serif" }}>
        {note.text.length > 150 ? note.text.slice(0, 150) + "..." : note.text}
      </div>
      {note.linkedParagraphId && (
        <div style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>
          linked to paragraph
        </div>
      )}
      {note.tags?.length > 0 && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
          {note.tags.slice(0, 3).map((tag) => (
            <span key={tag} style={{
              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "0px 4px",
              borderRadius: 8, background: `${cat.color}08`, color: cat.color,
              border: `1px solid ${cat.color}15`,
            }}>
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span style={{ fontSize: 10, color: P.tf }}>+{note.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Editor Notes Panel (collapsible right panel) ───────────

function EditorNotesPanel({
  sectionNotes, looseNotes, project, section,
  onAddNote, onUpdateNote, onDeleteNote, collapsed, onToggle,
}) {
  const [editingId, setEditingId] = useState(null);
  const [showLoose, setShowLoose] = useState(false);

  // Group section notes by paragraph
  const sectionLevel = useMemo(() =>
    sectionNotes.filter((n) => !n.linkedParagraphId && n.category !== "comment"), [sectionNotes]);
  const paraGroups = useMemo(() => {
    const groups = {};
    for (const n of sectionNotes) {
      if (n.linkedParagraphId && n.category !== "comment") {
        if (!groups[n.linkedParagraphId]) groups[n.linkedParagraphId] = [];
        groups[n.linkedParagraphId].push(n);
      }
    }
    return groups;
  }, [sectionNotes]);
  const paraGroupEntries = Object.entries(paraGroups);

  const handleQuickAdd = useCallback((paraId = null) => {
    const newNote = onAddNote({
      category: "idea",
      text: "",
      tags: [],
      linkedProjectId: project?.id,
      linkedSectionId: section?.id,
      linkedParagraphId: paraId,
    });
    if (newNote) setEditingId(newNote.id);
  }, [onAddNote, project, section]);

  const handleSave = useCallback((noteId, updates) => {
    onUpdateNote(noteId, updates);
    setEditingId(null);
  }, [onUpdateNote]);

  if (collapsed) {
    return (
      <div
        onClick={onToggle}
        style={{
          width: 36, flexShrink: 0, background: P.sf, borderLeft: `1px solid ${P.bd}`,
          cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 16, gap: 8,
        }}
        title="Show notes panel"
      >
        <StickyNote size={14} style={{ color: P.tm }} />
        {sectionNotes.length > 0 && (
          <span style={{
            fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.ac,
            fontWeight: 600,
          }}>
            {sectionNotes.filter(n => n.category !== "comment").length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      width: 260, flexShrink: 0, background: P.sf, borderLeft: `1px solid ${P.bd}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 12px 8px", borderBottom: `1px solid ${P.bd}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 2,
          textTransform: "uppercase", color: P.tm, display: "flex", alignItems: "center", gap: 5,
        }}>
          <StickyNote size={10} /> Notes
          {sectionNotes.filter(n => n.category !== "comment").length > 0 && (
            <span style={{
              background: `${P.ac}15`, color: P.ac, padding: "1px 5px",
              borderRadius: 8, fontSize: 10, fontWeight: 600,
            }}>
              {sectionNotes.filter(n => n.category !== "comment").length}
            </span>
          )}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <button onClick={() => handleQuickAdd(null)} title="Add section note"
            style={{ background: "none", border: "none", cursor: "pointer", color: P.ac, padding: 6, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={13} />
          </button>
          <button onClick={onToggle} title="Collapse notes"
            style={{ background: "none", border: "none", cursor: "pointer", color: P.tf, padding: 6, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        {/* Section-level notes */}
        {sectionLevel.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1.5,
              textTransform: "uppercase", color: P.tf, marginBottom: 6,
            }}>
              Section Notes ({sectionLevel.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sectionLevel.map((note) => (
                <MiniNoteCard
                  key={note.id}
                  note={note}
                  isEditing={editingId === note.id}
                  onEdit={setEditingId}
                  onDelete={onDeleteNote}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Paragraph-level notes */}
        {paraGroupEntries.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1.5,
              textTransform: "uppercase", color: P.tf, marginBottom: 6,
            }}>
              Paragraph Notes
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {paraGroupEntries.map(([paraId, notes]) => (
                <div key={paraId}>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: P.tf,
                    marginBottom: 4, letterSpacing: 1,
                  }}>
                    paragraph {paraId.slice(-4)}
                  </div>
                  {notes.map((note) => (
                    <MiniNoteCard
                      key={note.id}
                      note={note}
                      isEditing={editingId === note.id}
                      onEdit={setEditingId}
                      onDelete={onDeleteNote}
                      onSave={handleSave}
                      onCancel={() => setEditingId(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sectionLevel.length === 0 && paraGroupEntries.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 12px", color: P.tf }}>
            <StickyNote size={20} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div style={{ fontSize: 11, fontFamily: "'Spectral', serif" }}>
              No notes for this section yet
            </div>
            <button onClick={() => handleQuickAdd(null)}
              style={{
                marginTop: 8, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                padding: "4px 12px", background: P.ac, color: "#fff",
                border: "none", borderRadius: 3, cursor: "pointer",
              }}>
              <Plus size={10} style={{ verticalAlign: -1, marginRight: 3 }} /> Add Note
            </button>
          </div>
        )}

        {/* Loose ideas pool */}
        <div style={{ marginTop: 16, borderTop: `1px solid ${P.bd}`, paddingTop: 10 }}>
          <div
            onClick={() => setShowLoose(!showLoose)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1.5,
              textTransform: "uppercase", color: P.tf, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4, marginBottom: showLoose ? 6 : 0,
            }}
          >
            {showLoose ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <Unlink size={8} /> Loose Ideas ({looseNotes.filter(n => n.category !== "comment").length})
          </div>
          {showLoose && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {looseNotes.filter(n => n.category !== "comment").slice(0, 10).map((note) => (
                <MiniNoteCard
                  key={note.id}
                  note={note}
                  isEditing={editingId === note.id}
                  onEdit={setEditingId}
                  onDelete={onDeleteNote}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                />
              ))}
              {looseNotes.filter(n => n.category !== "comment").length > 10 && (
                <div style={{ fontSize: 10, color: P.tf, textAlign: "center", fontFamily: "'IBM Plex Mono', monospace" }}>
                  +{looseNotes.filter(n => n.category !== "comment").length - 10} more in Brainstorm tab
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Brainstorm Mind Map (React Flow) ───────────────────────

function SpineNode({ data }) {
  return (
    <div style={{
      background: P.bg, border: `2px solid ${P.ac}`, borderRadius: 12,
      padding: "16px 20px", minWidth: 200, maxWidth: 320,
      boxShadow: "0 6px 24px rgba(44,36,24,0.12)",
      textAlign: "center",
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 2,
        textTransform: "uppercase", color: P.ac, marginBottom: 6,
      }}>
        <GitBranch size={10} style={{ verticalAlign: -2, marginRight: 3 }} /> Spine
      </div>
      <div style={{
        fontSize: 14, fontStyle: "italic", color: P.tm, lineHeight: 1.5,
        fontFamily: "'Spectral', serif",
      }}>
        {data.spine || "Click to add spine..."}
      </div>
    </div>
  );
}

function SubsectionMindNode({ data }) {
  const st = STATUS[data.status];
  return (
    <div onClick={data.onClick} style={{
      background: P.sf, border: `1.5px solid ${st?.bd || P.bd}`, borderRadius: 8,
      padding: "10px 14px", minWidth: 140, maxWidth: 200,
      cursor: "pointer", transition: "all 0.2s",
      boxShadow: "0 2px 8px rgba(44,36,24,0.06)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: P.tx, marginBottom: 3 }}>
        {data.label}
      </div>
      <span style={{
        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
        padding: "1px 5px", borderRadius: 2, background: st?.bg,
        color: st?.text, letterSpacing: 1, textTransform: "uppercase",
      }}>
        {st?.l}
      </span>
      {data.paraCount > 0 && (
        <span style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace", marginLeft: 6 }}>
          {data.paraCount}¶
        </span>
      )}
    </div>
  );
}

function NoteMindNode({ data }) {
  const cat = NOTE_CATEGORIES[data.category] || NOTE_CATEGORIES.idea;
  return (
    <div style={{
      background: P.bg, border: `1px solid ${cat.color}30`, borderLeft: `3px solid ${cat.color}`,
      borderRadius: 8, padding: "8px 12px", minWidth: 120, maxWidth: 200,
      boxShadow: "0 2px 8px rgba(44,36,24,0.04)",
    }}>
      <div style={{
        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
        padding: "1px 4px", borderRadius: 2, background: `${cat.color}12`,
        color: cat.color, letterSpacing: 1, textTransform: "uppercase",
        fontWeight: 600, display: "inline-block", marginBottom: 4,
      }}>
        {cat.icon} {cat.label}
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.4, color: P.tx, fontFamily: "'Spectral', serif" }}>
        {data.text.length > 80 ? data.text.slice(0, 80) + "..." : data.text}
      </div>
    </div>
  );
}

function IdeaInputNode({ data }) {
  const [text, setText] = useState("");
  return (
    <div style={{
      background: P.bg, border: `2px dashed ${P.ac}40`, borderRadius: 8,
      padding: "8px 12px", minWidth: 160,
      boxShadow: "0 2px 8px rgba(44,36,24,0.06)",
    }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your idea..."
        autoFocus
        style={{
          width: "100%", minHeight: 40, fontSize: 11, lineHeight: 1.4,
          fontFamily: "'Spectral', serif", color: P.tx, background: "transparent",
          border: "none", outline: "none", resize: "vertical",
        }}
      />
      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        <button onClick={() => { if (text.trim()) data.onSave(text.trim()); }}
          style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "2px 8px", background: P.ac, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
          Save
        </button>
        <button onClick={data.onCancel}
          style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "2px 8px", background: P.sf, color: P.tm, border: `1px solid ${P.bd}`, borderRadius: 3, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ParagraphMindNode({ data }) {
  const role = SPINE_ROLES[data.spineRole];
  return (
    <div style={{
      background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 6,
      padding: "6px 10px", minWidth: 100, maxWidth: 180,
      display: "flex", alignItems: "flex-start", gap: 6,
    }}>
      <span style={{ fontFamily: "serif", fontSize: 12, color: role?.c || P.tf, flexShrink: 0 }}>
        {role?.i}
      </span>
      <div style={{ fontSize: 10, lineHeight: 1.3, color: P.tm, fontFamily: "'Spectral', serif" }}>
        {data.text ? (data.text.length > 60 ? data.text.slice(0, 60) + "..." : data.text) : "Empty"}
      </div>
    </div>
  );
}

const mindMapNodeTypes = {
  spine: SpineNode,
  subsection: SubsectionMindNode,
  note: NoteMindNode,
  idea: IdeaInputNode,
  paragraph: ParagraphMindNode,
};

function buildMindMapGraph(section, sectionNotes, onSelectSection, projectId, onSaveIdea) {
  const nodes = [];
  const edges = [];

  // Center: spine node
  nodes.push({
    id: "spine",
    type: "spine",
    position: { x: 0, y: 0 },
    data: { spine: section.spine },
    draggable: true,
  });

  // Subsections in a semicircle above
  const children = section.children || [];
  const childRadius = 280;
  children.forEach((child, i) => {
    const angle = Math.PI + (Math.PI / (children.length + 1)) * (i + 1); // arc above
    const x = Math.cos(angle) * childRadius;
    const y = Math.sin(angle) * childRadius - 60;
    const nodeId = `sub-${child.id}`;
    nodes.push({
      id: nodeId,
      type: "subsection",
      position: { x, y },
      data: {
        label: child.title,
        status: child.status,
        paraCount: child.paragraphs?.length || 0,
        onClick: () => onSelectSection(projectId, child.id),
      },
      draggable: true,
    });
    edges.push({
      id: `e-spine-${nodeId}`,
      source: "spine",
      target: nodeId,
      type: "smoothstep",
      style: { stroke: `${P.ac}50`, strokeWidth: 1.5 },
    });
  });

  // Notes in a ring around center
  const noteItems = sectionNotes.filter((n) => n.category !== "comment");
  const noteRadius = 320;
  noteItems.forEach((note, i) => {
    const cat = NOTE_CATEGORIES[note.category] || NOTE_CATEGORIES.idea;
    const angle = (2 * Math.PI / Math.max(noteItems.length, 1)) * i - Math.PI / 2;
    const x = Math.cos(angle) * noteRadius;
    const y = Math.sin(angle) * noteRadius;
    const nodeId = `note-${note.id}`;
    nodes.push({
      id: nodeId,
      type: "note",
      position: { x, y },
      data: { text: note.text, category: note.category },
      draggable: true,
    });
    edges.push({
      id: `e-spine-${nodeId}`,
      source: "spine",
      target: nodeId,
      type: "smoothstep",
      style: { stroke: `${cat.color}30`, strokeWidth: 1 },
    });
  });

  // Paragraphs in a semicircle below
  const paras = section.paragraphs || [];
  const paraRadius = 260;
  paras.forEach((para, i) => {
    const angle = (Math.PI / (paras.length + 1)) * (i + 1); // arc below
    const x = Math.cos(angle) * paraRadius - paraRadius;
    const y = Math.sin(angle) * paraRadius + 80;
    const nodeId = `para-${para.id}`;
    nodes.push({
      id: nodeId,
      type: "paragraph",
      position: { x, y },
      data: { text: para.text, spineRole: para.spineRole },
      draggable: true,
    });
    edges.push({
      id: `e-spine-${nodeId}`,
      source: "spine",
      target: nodeId,
      type: "smoothstep",
      style: { stroke: `${P.bd}`, strokeWidth: 0.8 },
    });
  });

  return { nodes, edges };
}

function BrainstormMindMapInner({ section, project, sectionNotes, onSelectSection, onAddNote }) {
  const { fitView } = useReactFlow();

  const handleSaveIdea = useCallback((text) => {
    if (onAddNote) {
      onAddNote({
        category: "idea",
        text,
        tags: [],
        linkedProjectId: project?.id,
        linkedSectionId: section?.id,
      });
    }
  }, [onAddNote, project, section]);

  const initial = useMemo(
    () => buildMindMapGraph(section, sectionNotes, onSelectSection, project?.id, handleSaveIdea),
    [section?.id, sectionNotes.length, section?.children?.length, section?.paragraphs?.length]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  const handleReorient = useCallback(() => {
    const fresh = buildMindMapGraph(section, sectionNotes, onSelectSection, project?.id, handleSaveIdea);
    setNodes(fresh.nodes);
    setEdges(fresh.edges);
    setTimeout(() => fitView({ padding: 0.3 }), 50);
  }, [section, sectionNotes, onSelectSection, project, handleSaveIdea, setNodes, setEdges, fitView]);

  const handleAddIdeaNode = useCallback(() => {
    const id = `idea-${Date.now()}`;
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: "idea",
        position: { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100 },
        data: {
          onSave: (text) => {
            handleSaveIdea(text);
            setNodes((n) => n.filter((nd) => nd.id !== id));
          },
          onCancel: () => setNodes((n) => n.filter((nd) => nd.id !== id)),
        },
        draggable: true,
      },
    ]);
  }, [handleSaveIdea, setNodes]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={mindMapNodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        onDoubleClick={handleAddIdeaNode}
      >
        <Background gap={20} size={1} color={P.bd} />
        <Controls
          showInteractive={false}
          style={{ background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 6 }}
        />
      </ReactFlow>

      {/* Floating controls */}
      <div style={{
        position: "absolute", top: 12, right: 12, display: "flex", gap: 6, zIndex: 10,
      }}>
        <button onClick={handleAddIdeaNode}
          style={{
            display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
            background: P.ac, color: "#fff", border: "none", borderRadius: 5,
            cursor: "pointer", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
            boxShadow: "0 2px 8px rgba(44,36,24,0.15)",
          }}>
          <Plus size={11} /> Add Idea
        </button>
        <button onClick={handleReorient}
          title="Reorient to default layout"
          style={{
            display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
            background: P.sf, color: P.tm, border: `1px solid ${P.bd}`, borderRadius: 5,
            cursor: "pointer", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
            boxShadow: "0 2px 8px rgba(44,36,24,0.1)",
          }}>
          <RotateCcw size={11} /> Reorient
        </button>
      </div>

      {/* Hint */}
      <div style={{
        position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf,
        background: `${P.bg}E0`, padding: "4px 12px", borderRadius: 10,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <MousePointer size={9} /> Double-click canvas to add an idea node
      </div>
    </div>
  );
}

function BrainstormMindMap(props) {
  return (
    <ReactFlowProvider>
      <BrainstormMindMapInner {...props} />
    </ReactFlowProvider>
  );
}

// ── Revised Content (clean read-through) ───────────────────

function RevisedContent({ section, linkedTerms, onTermClick, sectionNotes, sectionDiagrams = [], onEditDiagram }) {
  // Group notes by paragraph for margin indicators
  const notesByPara = useMemo(() => {
    const map = {};
    for (const n of sectionNotes) {
      if (n.linkedParagraphId) {
        if (!map[n.linkedParagraphId]) map[n.linkedParagraphId] = [];
        map[n.linkedParagraphId].push(n);
      }
    }
    return map;
  }, [sectionNotes]);

  const [hoverPara, setHoverPara] = useState(null);

  return (
    <div>
      {section.paragraphs?.map((para, i) => {
        const paraNotes = notesByPara[para.id] || [];
        return (
          <React.Fragment key={para.id}>
          <div style={{ position: "relative", marginBottom: 4 }}>
            {/* Margin note indicator */}
            {paraNotes.length > 0 && (
              <div
                onMouseEnter={() => setHoverPara(para.id)}
                onMouseLeave={() => setHoverPara(null)}
                style={{
                  position: "absolute", left: -20, top: 4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: P.ac, opacity: 0.4, cursor: "pointer",
                }}
                title={`${paraNotes.length} note${paraNotes.length > 1 ? "s" : ""}`}
              />
            )}
            {/* Margin popover */}
            {hoverPara === para.id && paraNotes.length > 0 && (
              <div style={{
                position: "absolute", left: -240, top: 0, width: 220,
                background: P.bg, border: `1px solid ${P.bd}`, borderRadius: 6,
                boxShadow: "0 4px 16px rgba(44,36,24,0.1)", padding: "8px 10px",
                zIndex: 20, display: "flex", flexDirection: "column", gap: 6,
              }}>
                {paraNotes.map((n) => {
                  const cat = NOTE_CATEGORIES[n.category] || NOTE_CATEGORIES.idea;
                  return (
                    <div key={n.id} style={{ fontSize: 10, lineHeight: 1.4, color: P.tx }}>
                      <span style={{
                        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                        color: cat.color, textTransform: "uppercase", letterSpacing: 1,
                      }}>
                        {cat.icon} {cat.label}
                      </span>
                      <div style={{ fontFamily: "'Spectral', serif", marginTop: 2 }}>
                        {n.text.length > 100 ? n.text.slice(0, 100) + "..." : n.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{
              fontSize: 17, lineHeight: 1.85, color: P.tx, fontFamily: "'Spectral', serif",
              padding: "4px 0",
            }}>
              {para.text
                ? renderTermLinks(para.text, para.linkedTerms, linkedTerms, onTermClick)
                : <span style={{ color: P.tf, fontStyle: "italic" }}>Empty paragraph</span>}
            </div>
          </div>
          {sectionDiagrams.filter((d) => d.sectionId === section.id && d.afterParagraphId === para.id).map((diag, di) => (
            <DiagramInline key={diag.id} diagram={diag} figureIndex={di + 1} onEdit={onEditDiagram} readOnly />
          ))}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Done Content (polished presentation) ───────────────────

function DoneContent({ section, linkedTerms, onTermClick, sectionDiagrams = [], onEditDiagram }) {
  return (
    <div>
      {section.paragraphs?.map((para) => (
        <React.Fragment key={para.id}>
          <div style={{
            fontSize: 17, lineHeight: 1.9, color: P.tx, fontFamily: "'Spectral', serif",
            marginBottom: 18, textIndent: "1.5em",
          }}>
            {para.text
              ? renderTermLinks(para.text, para.linkedTerms, linkedTerms, onTermClick)
              : null}
          </div>
          {sectionDiagrams.filter((d) => d.sectionId === section.id && d.afterParagraphId === para.id).map((diag, di) => (
            <DiagramInline key={diag.id} diagram={diag} figureIndex={di + 1} onEdit={onEditDiagram} readOnly />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Zen Nav Rail ───────────────────────────────────────────

function ZenNavRail({ project, activeSectionId, onSelectSection, onAddChildSection }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const toggleCollapse = useCallback((id) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Render a section and its children recursively
  const renderSection = (sec, depth) => {
    const isActive = sec.id === activeSectionId;
    const st = STATUS[sec.status] || STATUS.drafting;
    const hasChildren = sec.children?.length > 0;
    const isCollapsed = collapsed[sec.id];

    return (
      <React.Fragment key={sec.id}>
        <div
          style={{
            display: "flex", alignItems: "center",
            padding: "4px 8px 4px " + (8 + depth * 14) + "px",
            background: isActive ? `${P.ac}08` : "transparent",
            borderLeft: isActive ? `3px solid ${P.ac}` : "3px solid transparent",
            transition: "all 0.15s",
          }}
          onMouseOver={(e) => { if (!isActive) e.currentTarget.style.background = P.sf; }}
          onMouseOut={(e) => { e.currentTarget.style.background = isActive ? `${P.ac}08` : "transparent"; }}
        >
          {/* Collapse toggle */}
          <div
            onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleCollapse(sec.id); }}
            style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: hasChildren ? "pointer" : "default" }}
          >
            {hasChildren ? (
              isCollapsed
                ? <ChevronRight size={10} style={{ color: P.tm }} />
                : <ChevronDown size={10} style={{ color: P.tm }} />
            ) : (
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: st.text, display: "inline-block" }} />
            )}
          </div>
          {/* Title — click to navigate */}
          <div
            onClick={() => { onSelectSection(project.id, sec.id); setOpen(false); }}
            style={{ flex: 1, minWidth: 0, cursor: "pointer", padding: "2px 0" }}
          >
            <div style={{
              fontSize: 11, fontFamily: "'Spectral', serif", color: isActive ? P.tx : P.tm,
              fontWeight: isActive ? 500 : 400,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {sec.title}
            </div>
          </div>
          {/* Status dot */}
          <span style={{
            fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: st.text,
            flexShrink: 0, marginLeft: 4,
          }}>
            {st.l.charAt(0)}
          </span>
        </div>
        {/* Children */}
        {hasChildren && !isCollapsed && sec.children.map((child) => renderSection(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <>
      {/* Hover trigger zone */}
      <div
        onMouseEnter={() => setOpen(true)}
        style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 20, zIndex: 50 }}
      />
      {/* Toggle button — always visible */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed", left: open ? 232 : 8, top: 12, zIndex: 53,
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: 6, cursor: "pointer",
          background: open ? P.sf : `${P.tb}`, border: `1px solid ${open ? P.bd : "#50473A"}`,
          color: open ? P.tm : "#8A7E6E",
          transition: "all 0.25s ease",
          boxShadow: "0 2px 8px rgba(44,36,24,0.1)",
        }}
        title="Toggle navigation (hover left edge)"
      >
        {open ? <X size={14} /> : <ChevronRight size={14} />}
      </div>
      {/* Slide-out panel */}
      <div
        onMouseLeave={() => setOpen(false)}
        style={{
          position: "fixed", left: 0, top: 0, bottom: 0,
          width: 240, zIndex: 52,
          background: P.bg, borderRight: `1px solid ${P.bd}`,
          boxShadow: open ? "4px 0 24px rgba(44,36,24,0.08)" : "none",
          transform: open ? "translateX(0)" : "translateX(-240px)",
          transition: "transform 0.25s ease",
          overflowY: "auto", padding: "12px 0",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Project header */}
        <div style={{ padding: "6px 14px 10px", borderBottom: `1px solid ${P.bd}`, marginBottom: 4, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 2, textTransform: "uppercase", color: project.color, fontWeight: 500 }}>
            {project.name}
          </div>
        </div>
        {/* Full project tree */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {project.parts.map((part) => (
            <div key={part.id}>
              <div
                onClick={() => setCollapsed((prev) => ({ ...prev, [part.id]: !prev[part.id] }))}
                style={{
                  padding: "8px 12px 4px", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: 2, textTransform: "uppercase", color: P.tf, fontWeight: 500,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                }}
              >
                {collapsed[part.id] ? <ChevronRight size={9} /> : <ChevronDown size={9} />}
                {part.title.replace(/Part \w+:\s*/i, "")}
              </div>
              {!collapsed[part.id] && part.children?.map((sec) => renderSection(sec, 0))}
            </div>
          ))}
        </div>
        {/* Add section button at bottom */}
        {activeSectionId && (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${P.bd}`, padding: "8px 12px" }}>
            <div
              onClick={() => { onAddChildSection(project.id, activeSectionId); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "6px", borderRadius: 4, cursor: "pointer",
                border: `1.5px dashed ${P.bd}`, color: P.tf, fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.2s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = P.ac; e.currentTarget.style.color = P.ac; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = P.bd; e.currentTarget.style.color = P.tf; }}
            >
              <Plus size={10} /> Add subsection
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Full Text View (Word-like document) ────────────────────

function FullTextSection({
  section, depth, projectId, linkedTerms, onTermClick,
  selectedPara, onSelectPara, onUpdateText, onUpdateMeta, onUpdateSection,
  onAddParagraph, onDeleteParagraph, onAddNote, sectionNotes,
  onAddChildSection, setConfirmAction, onSetRightPanel, onSetShowRightPanel,
  collapsedSections, toggleCollapse, notesByPara,
  sectionDiagrams = [], onEditDiagram, onRemoveDiagram,
}) {
  const headingSizes = [30, 24, 19, 16, 15];
  const headingSize = headingSizes[Math.min(depth, headingSizes.length - 1)];
  const isCollapsed = collapsedSections[section.id] || false;
  const hasContent = (section.paragraphs?.length > 0) || (section.children?.length > 0);
  const headingWeights = [700, 600, 600, 500, 500];

  return (
    <div style={{ marginBottom: depth === 0 ? 24 : 16 }}>
      {/* Section divider for depth-1 sections (like Word chapter breaks) */}
      {depth === 1 && (
        <div style={{ borderTop: `1px solid ${P.bd}`, marginTop: 40, marginBottom: 32 }} />
      )}

      {/* Section heading — clickable to collapse */}
      {(depth > 0 || section.title) && (
        <div
          className={`fulltext-heading ${isCollapsed ? "fulltext-collapsed" : ""}`}
          onClick={() => toggleCollapse(section.id)}
          style={{
            marginBottom: isCollapsed ? 4 : depth === 0 ? 20 : 10,
            marginTop: depth > 1 ? 20 : 0,
          }}
        >
          {hasContent && depth > 0 && (
            <ChevronDown size={Math.max(11, headingSize * 0.45)} className="fulltext-chevron" style={{ color: P.tf }} />
          )}
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: headingSize,
            fontWeight: headingWeights[Math.min(depth, headingWeights.length - 1)],
            color: P.tx, margin: 0, lineHeight: 1.3,
            letterSpacing: depth === 0 ? -0.5 : 0,
            textTransform: depth <= 1 ? "none" : "none",
          }}>
            {section.title}
          </h2>
        </div>
      )}

      {/* Collapsible body */}
      <div className={`fulltext-body ${isCollapsed ? "collapsed" : ""}`} style={{ maxHeight: isCollapsed ? 0 : "none" }}
        onClick={(e) => { if (!e.target.closest('.para-block') && !e.target.closest('.dashed-add-btn')) onSelectPara(null); }}
      >
        {/* Paragraphs */}
        {section.paragraphs?.map((para, i) => {
          const isSel = selectedPara === para.id;
          const paraNoteCt = notesByPara?.[para.id] || 0;
          return (
            <React.Fragment key={para.id}>
            <div
              data-para-id={para.id}
              className={`para-block${isSel ? " para-selected" : ""}`}
              onClick={() => onSelectPara(isSel ? null : para.id)}
              style={{
                position: "relative",
                padding: "6px 14px",
                marginBottom: 2,
                borderRadius: 3,
                cursor: "pointer",
              }}
            >
              {/* Note badge */}
              {paraNoteCt > 0 && !isSel && (
                <span
                  className="para-note-badge"
                  title={`${paraNoteCt} note${paraNoteCt > 1 ? "s" : ""}`}
                  style={{ right: -20, top: 6 }}
                  onClick={(e) => { e.stopPropagation(); onSelectPara(para.id); if (onSetRightPanel) onSetRightPanel("notes"); if (onSetShowRightPanel) onSetShowRightPanel(true); }}
                >
                  {paraNoteCt}
                </span>
              )}

              {isSel ? (
                <div className="toolbar-enter" onClick={(e) => e.stopPropagation()}>
                  <ParagraphEditor
                    content={para.text}
                    onChange={(text) => onUpdateText(projectId, section.id, para.id, text)}
                    placeholder="Write..."
                  />
                  <div className="toolbar-enter para-chrome" style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <StatusSelect value={para.status} onChange={(s) => onUpdateMeta(projectId, section.id, para.id, { status: s })} />
                    <RoleSelect value={para.spineRole} onChange={(r) => onUpdateMeta(projectId, section.id, para.id, { spineRole: r })} />
                    <div style={{ flex: 1 }} />
                    <button onClick={(e) => { e.stopPropagation(); onAddParagraph(projectId, section.id, para.id); }}
                      title="Add paragraph below"
                      className="action-btn"
                      style={{ background: "none", border: `1px solid ${P.bd}`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: P.tm, display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                      <Plus size={10} /> Add
                    </button>
                    {section.paragraphs.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ title: "Delete paragraph?", message: "This will remove the paragraph and its content.", danger: true, confirmLabel: "Delete", onConfirm: () => { onDeleteParagraph(projectId, section.id, para.id); setConfirmAction(null); } }); }}
                        title="Delete paragraph"
                        className="action-btn-danger"
                        style={{ background: "none", border: `1px solid #E8B4B4`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: "#943D3D", display: "flex", alignItems: "center" }}>
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  fontSize: 15.5, lineHeight: 1.8, color: P.tx,
                  fontFamily: "'Spectral', serif",
                  textIndent: i > 0 ? "2em" : 0,
                }}>
                  {para.text
                    ? renderTermLinks(para.text, para.linkedTerms, linkedTerms, onTermClick)
                    : <span style={{ color: P.tf, fontStyle: "italic" }}>Empty paragraph</span>}
                </div>
              )}
            </div>
            {/* Inline diagrams after this paragraph */}
            {sectionDiagrams.filter((d) => d.sectionId === section.id && d.afterParagraphId === para.id).map((diag, di) => (
              <DiagramInline key={diag.id} diagram={diag} figureIndex={di + 1} onEdit={onEditDiagram} onRemove={onRemoveDiagram} sectionTitle={section.title} />
            ))}
          </React.Fragment>
          );
        })}

        {/* Recurse into children */}
        {section.children?.map((child) => (
          <FullTextSection
            key={child.id}
            section={child}
            depth={depth + 1}
            projectId={projectId}
            linkedTerms={linkedTerms}
            onTermClick={onTermClick}
            selectedPara={selectedPara}
            onSelectPara={onSelectPara}
            onUpdateText={onUpdateText}
            onUpdateMeta={onUpdateMeta}
            onUpdateSection={onUpdateSection}
            onAddParagraph={onAddParagraph}
            onDeleteParagraph={onDeleteParagraph}
            onAddNote={onAddNote}
            sectionNotes={sectionNotes}
            onAddChildSection={onAddChildSection}
            setConfirmAction={setConfirmAction}
            onSetRightPanel={onSetRightPanel}
            onSetShowRightPanel={onSetShowRightPanel}
            collapsedSections={collapsedSections}
            toggleCollapse={toggleCollapse}
            notesByPara={notesByPara}
            sectionDiagrams={sectionDiagrams}
            onEditDiagram={onEditDiagram}
            onRemoveDiagram={onRemoveDiagram}
          />
        ))}

        {/* Add subsection button (subtle) */}
        {depth < 3 && section.children?.length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onAddChildSection(projectId, section.id); }}
              className="dashed-add-btn"
              style={{
                background: "none", border: `1px dashed ${P.bd}`, borderRadius: 4,
                padding: "5px 12px", cursor: "pointer", color: P.tf, fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 4,
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = P.ac; e.currentTarget.style.borderColor = P.ac; }}
              onMouseOut={(e) => { e.currentTarget.style.color = P.tf; e.currentTarget.style.borderColor = P.bd; }}
            >
              <Plus size={10} /> Add subsection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FullTextView({
  section, project, projectId, linkedTerms, onTermClick,
  selectedPara, onSelectPara, onUpdateText, onUpdateMeta, onUpdateSection,
  onAddParagraph, onDeleteParagraph, onAddNote, sectionNotes,
  onAddChildSection, setConfirmAction, onSetRightPanel, onSetShowRightPanel,
  notesByPara,
  sectionDiagrams = [], onEditDiagram, onRemoveDiagram,
}) {
  const [collapsedSections, setCollapsedSections] = useState({});
  const toggleCollapse = useCallback((id) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const sharedProps = {
    projectId, linkedTerms, onTermClick,
    selectedPara, onSelectPara, onUpdateText, onUpdateMeta, onUpdateSection,
    onAddParagraph, onDeleteParagraph, onAddNote, sectionNotes,
    onAddChildSection, setConfirmAction, onSetRightPanel, onSetShowRightPanel,
    collapsedSections, toggleCollapse, notesByPara,
    sectionDiagrams, onEditDiagram, onRemoveDiagram,
  };

  return (
    <div style={{ background: "#EDE9E3", minHeight: "100%", paddingBottom: 48 }}>
      <div className="fulltext-page">
        {/* Root title — rendered without chevron at depth 0 */}
        <FullTextSection section={section} depth={0} {...sharedProps} />
      </div>
    </div>
  );
}

// ── Expanded View Component ────────────────────────────────

function ExpandedSection({
  section, depth, projectId, linkedTerms, onTermClick,
  selectedPara, onSelectPara, onUpdateText, onUpdateMeta, onUpdateSection,
  onAddParagraph, onDeleteParagraph, onAddNote, sectionNotes, onAddChildSection,
  setConfirmAction, onSetRightPanel, onSetShowRightPanel,
  sectionDiagrams = [], onEditDiagram, onRemoveDiagram,
}) {
  const headingSizes = [36, 28, 22, 18, 16];
  const headingSize = headingSizes[Math.min(depth, headingSizes.length - 1)];
  const st = STATUS[section.status] || STATUS.drafting;
  const topLevel = depth === 0;

  return (
    <div style={{ marginBottom: topLevel ? 48 : 32 }}
      onClick={(e) => { if (!e.target.closest('.para-block') && !e.target.closest('.dashed-add-btn')) onSelectPara(null); }}
    >
      {/* Section divider for non-root sections */}
      {depth > 0 && (
        <div style={{
          borderTop: depth === 1 ? `1px solid ${P.bd}` : "none",
          paddingTop: depth === 1 ? 36 : 20,
          marginTop: depth === 1 ? 32 : 12,
        }} />
      )}

      {/* Section heading */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: headingSize, fontWeight: depth === 0 ? 300 : 400,
            color: P.tx, margin: 0, lineHeight: 1.2, letterSpacing: depth === 0 ? -0.5 : 0,
          }}>
            {section.title}
          </h2>
          <span style={{
            fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 6px",
            borderRadius: 3, background: st.bg, color: st.text,
            border: `1px solid ${st.bd}`, letterSpacing: 1, textTransform: "uppercase",
            fontWeight: 600, flexShrink: 0, alignSelf: "center",
          }}>
            {st.l}
          </span>
        </div>

        {/* Spine */}
        {section.spine && (
          <div style={{
            padding: "10px 16px", background: `${P.ac}0A`,
            borderLeft: `3px solid ${P.ac}`, borderTop: `1px solid ${P.ac}15`,
            borderRadius: "0 5px 5px 0", marginBottom: 20,
          }}>
            <div style={{
              fontSize: 13.5, color: P.tm, fontStyle: "italic", lineHeight: 1.6,
              fontFamily: "'Spectral', serif",
            }}>
              {section.spine}
            </div>
          </div>
        )}
      </div>

      {/* Paragraphs */}
      {section.paragraphs?.map((para, i) => {
        const role = SPINE_ROLES[para.spineRole];
        const isSel = selectedPara === para.id;
        return (
          <React.Fragment key={para.id}>
          <div
            data-para-id={para.id}
            className={`para-block${isSel ? " para-selected" : ""}`}
            onClick={() => onSelectPara(isSel ? null : para.id)}
            style={{
              position: "relative", padding: "8px 14px 8px 34px", marginBottom: 4,
              borderRadius: 3, cursor: "pointer",
            }}
          >
            {/* Role indicator — centered */}
            <div style={{
              position: "absolute", left: 8, top: 8,
              width: 20, textAlign: "center", fontFamily: "serif", fontSize: 12, color: role?.c || P.tf,
            }}>
              {role?.i}
            </div>

            {isSel ? (
              <div className="toolbar-enter" onClick={(e) => e.stopPropagation()}>
                <ParagraphEditor
                  content={para.text}
                  onChange={(text) => onUpdateText(projectId, section.id, para.id, text)}
                  placeholder="Write..."
                />
                <div className="toolbar-enter para-chrome" style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <StatusSelect value={para.status} onChange={(s) => onUpdateMeta(projectId, section.id, para.id, { status: s })} />
                  <RoleSelect value={para.spineRole} onChange={(r) => onUpdateMeta(projectId, section.id, para.id, { spineRole: r })} />
                  <div style={{ flex: 1 }} />
                  <button onClick={(e) => { e.stopPropagation(); onAddParagraph(projectId, section.id, para.id); }}
                    title="Add paragraph below"
                    className="action-btn"
                    style={{ background: "none", border: `1px solid ${P.bd}`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: P.tm, display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                    <Plus size={10} /> Add
                  </button>
                  {section.paragraphs.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ title: "Delete paragraph?", message: "This will remove the paragraph and its content.", danger: true, confirmLabel: "Delete", onConfirm: () => { onDeleteParagraph(projectId, section.id, para.id); setConfirmAction(null); } }); }}
                      title="Delete paragraph"
                      className="action-btn-danger"
                      style={{ background: "none", border: `1px solid #E8B4B4`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: "#943D3D", display: "flex", alignItems: "center" }}>
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                fontSize: 15, lineHeight: 1.75, color: P.tx,
                fontFamily: "'Spectral', serif",
              }}>
                {para.text
                  ? renderTermLinks(para.text, para.linkedTerms, linkedTerms, onTermClick)
                  : <span style={{ color: P.tf, fontStyle: "italic" }}>Empty paragraph</span>}
              </div>
            )}
          </div>
          {/* Inline diagrams after this paragraph */}
          {sectionDiagrams.filter((d) => d.sectionId === section.id && d.afterParagraphId === para.id).map((diag, di) => (
            <DiagramInline key={diag.id} diagram={diag} figureIndex={di + 1} onEdit={onEditDiagram} onRemove={onRemoveDiagram} />
          ))}
          </React.Fragment>
        );
      })}

      {/* Recurse into children */}
      {section.children?.map((child) => (
        <ExpandedSection
          key={child.id}
          section={child}
          depth={depth + 1}
          projectId={projectId}
          linkedTerms={linkedTerms}
          onTermClick={onTermClick}
          selectedPara={selectedPara}
          onSelectPara={onSelectPara}
          onUpdateText={onUpdateText}
          onUpdateMeta={onUpdateMeta}
          onUpdateSection={onUpdateSection}
          onAddParagraph={onAddParagraph}
          onDeleteParagraph={onDeleteParagraph}
          onAddNote={onAddNote}
          sectionNotes={sectionNotes}
          onAddChildSection={onAddChildSection}
          setConfirmAction={setConfirmAction}
          onSetRightPanel={onSetRightPanel}
          onSetShowRightPanel={onSetShowRightPanel}
          sectionDiagrams={sectionDiagrams}
          onEditDiagram={onEditDiagram}
          onRemoveDiagram={onRemoveDiagram}
        />
      ))}
    </div>
  );
}

// ── Outline View Component ─────────────────────────────────

function OutlineRow({ section, depth, projectId, onSelectSection, setEditorMode, expanded, onToggle }) {
  const hasChildren = section.children?.length > 0;
  const isExpanded = expanded[section.id] !== false; // default expanded
  const wordCount = (section.paragraphs || []).reduce((sum, p) => sum + (p.text ? p.text.trim().split(/\s+/).filter(Boolean).length : 0), 0);
  const totalWords = collectParagraphs(section).reduce((sum, p) => sum + (p.text ? p.text.trim().split(/\s+/).filter(Boolean).length : 0), 0);
  const paraCount = (section.paragraphs || []).length;
  const st = STATUS[section.status] || STATUS.drafting;

  return (
    <>
      <div
        className="outline-row"
        style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          padding: "10px 14px", paddingLeft: 14 + depth * 24,
          borderLeft: `3px solid ${st.text}40`,
          background: "transparent", cursor: "pointer",
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = P.sf; e.currentTarget.style.transform = "translateX(2px)"; }}
        onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateX(0)"; }}
      >
        {/* Expand/collapse toggle */}
        <div
          style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(section.id); }}
        >
          {hasChildren ? (
            isExpanded
              ? <ChevronDown size={12} style={{ color: P.tm }} />
              : <ChevronRight size={12} style={{ color: P.tm }} />
          ) : (
            <FileText size={10} style={{ color: P.tf }} />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => { onSelectSection(projectId, section.id); setEditorMode("draft"); }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Spectral', serif", fontSize: 14, fontWeight: 500, color: P.tx, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>
              {section.title}
            </span>
            <span style={{
              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 6px",
              borderRadius: 3, background: `${st.bg}`, color: st.text,
              border: `1px solid ${st.bd}`, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap",
            }}>
              {st.l}
            </span>
            <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf, whiteSpace: "nowrap" }}>
              {totalWords}w · {paraCount}¶
              {hasChildren ? ` · ${section.children.length} sub` : ""}
            </span>
          </div>
          {section.spine && (
            <div style={{
              fontSize: 12, color: P.tm, fontStyle: "italic", lineHeight: 1.5,
              fontFamily: "'Spectral', serif", marginTop: 3,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {section.spine}
            </div>
          )}
          {!section.spine && (
            <div style={{ fontSize: 11, color: P.tf, fontStyle: "italic", marginTop: 2 }}>
              No spine yet
            </div>
          )}
        </div>
      </div>

      {/* Recursive children */}
      {hasChildren && isExpanded && section.children.map((child) => (
        <OutlineRow
          key={child.id}
          section={child}
          depth={depth + 1}
          projectId={projectId}
          onSelectSection={onSelectSection}
          setEditorMode={setEditorMode}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

function OutlineView({ section, projectId, onSelectSection, setEditorMode, onAddChildSection }) {
  const [expanded, setExpanded] = useState(() => {
    // Default: all expanded
    const map = {};
    function walk(s) {
      map[s.id] = true;
      for (const child of s.children || []) walk(child);
    }
    walk(section);
    return map;
  });

  const toggleExpand = useCallback((id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const allSections = useMemo(() => {
    const list = [];
    function walk(s) { list.push(s); for (const c of s.children || []) walk(c); }
    walk(section);
    return list;
  }, [section]);

  const totalWords = useMemo(() =>
    collectParagraphs(section).reduce((sum, p) => sum + (p.text ? p.text.trim().split(/\s+/).filter(Boolean).length : 0), 0),
    [section]
  );

  return (
    <div>
      {/* Summary bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginBottom: 16,
        background: P.sf, borderRadius: 6, border: `1px solid ${P.bd}`,
      }}>
        <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tm, letterSpacing: 1.5, textTransform: "uppercase" }}>
          Outline
        </span>
        <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf }}>
          {allSections.length} sections · {totalWords} total words
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setExpanded((prev) => {
            const allExpanded = Object.values(prev).every(Boolean);
            const next = {};
            for (const s of allSections) next[s.id] = !allExpanded;
            return next;
          })}
          style={{
            fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 8px",
            background: "transparent", border: `1px solid ${P.bd}`, borderRadius: 3,
            cursor: "pointer", color: P.tm, letterSpacing: 1, textTransform: "uppercase",
          }}
        >
          {Object.values(expanded).every(Boolean) ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {/* Section tree */}
      <div style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${P.bd}` }}>
        {section.children?.length > 0 ? (
          section.children.map((child) => (
            <OutlineRow
              key={child.id}
              section={child}
              depth={0}
              projectId={projectId}
              onSelectSection={onSelectSection}
              setEditorMode={setEditorMode}
              expanded={expanded}
              onToggle={toggleExpand}
            />
          ))
        ) : (
          /* If no children, show the current section's paragraphs as a flat outline */
          <OutlineRow
            section={section}
            depth={0}
            projectId={projectId}
            onSelectSection={onSelectSection}
            setEditorMode={setEditorMode}
            expanded={expanded}
            onToggle={toggleExpand}
          />
        )}
      </div>

      {/* Add subsection */}
      <div
        onClick={() => onAddChildSection(projectId, section.id)}
        className="dashed-add-btn"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "10px", marginTop: 12, borderRadius: 6, cursor: "pointer",
          border: `1.5px dashed ${P.bd}`, color: P.tf,
        }}
        onMouseOver={(e) => { e.currentTarget.style.borderColor = P.ac; e.currentTarget.style.color = P.ac; }}
        onMouseOut={(e) => { e.currentTarget.style.borderColor = P.bd; e.currentTarget.style.color = P.tf; }}
      >
        <FolderPlus size={13} />
        <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>Add subsection</span>
      </div>
    </div>
  );
}

// ── Main Editor Component ──────────────────────────────────

export default function Editor({
  project, section, path, linkedTerms, selectedPara, onSelectPara, onTermClick,
  onUpdateText, onUpdateMeta, onUpdateSection, onAddParagraph, onDeleteParagraph,
  onAddChildSection, onSelectSection,
  // Notes props
  sectionNotes = [], looseNotes = [], allNotes = [],
  onAddNote, onUpdateNote, onDeleteNote, onResolveNote,
  // Citation props
  sources = [], citations = [], sectionCitations = [], noteIndexMap = {},
  onAddSource, onUpdateSource, onAddCitation, onDeleteCitation,
  zenMode = false,
  onSetRightPanel, onSetShowRightPanel,
  // Diagram props
  sectionDiagrams = [], onEditDiagram, onRemoveDiagram,
}) {
  const [editingSpine, setEditingSpine] = useState(false);
  const [spineText, setSpineText] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState("");
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [editorMode, setEditorMode] = useState(() => {
    try { const ui = JSON.parse(localStorage.getItem("tessera-ui-state") || "{}"); return ui.editorMode || "draft"; } catch { return "draft"; }
  }); // "draft" | "outline" | "expanded"
  useEffect(() => {
    try {
      const ui = JSON.parse(localStorage.getItem("tessera-ui-state") || "{}");
      localStorage.setItem("tessera-ui-state", JSON.stringify({ ...ui, editorMode }));
    } catch {}
  }, [editorMode]);
  const [confirmAction, setConfirmAction] = useState(null); // { title, message, danger, onConfirm }
  const [citationPopover, setCitationPopover] = useState(null); // { paraId, x, y, from, to }

  // Scroll to and flash-highlight paragraph when selected (e.g. from Notes panel click)
  useEffect(() => {
    if (!selectedPara) return;
    const el = document.querySelector(`[data-para-id="${selectedPara}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("para-flash");
      // Force reflow so re-adding the class restarts the animation
      void el.offsetWidth;
      el.classList.add("para-flash");
    }
  }, [selectedPara]);

  // Count notes per paragraph for gutter indicators
  const notesByPara = useMemo(() => {
    const map = {};
    for (const n of sectionNotes) {
      if (n.linkedParagraphId && n.category !== "comment") {
        map[n.linkedParagraphId] = (map[n.linkedParagraphId] || 0) + 1;
      }
    }
    return map;
  }, [sectionNotes]);

  if (!section) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: P.tf }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📖</div>
          <div style={{ fontFamily: "'Spectral', serif", fontSize: 16 }}>Select a section to begin writing</div>
        </div>
      </div>
    );
  }

  const depth = path.length - 2;
  const headingSize = Math.max(22, 38 - depth * 5);

  const handleAddParaNote = (paraId) => {
    if (onAddNote) {
      const note = onAddNote({
        category: "idea",
        text: "",
        tags: [],
        linkedProjectId: project?.id,
        linkedSectionId: section?.id,
        linkedParagraphId: paraId,
      });
    }
  };

  const handleCitationSave = useCallback(({ source, locator, footnoteText }) => {
    if (!citationPopover || !onAddCitation) return;
    const { paraId, from, to } = citationPopover;
    // If source is new (from quick-add), create it first
    let finalSource = source;
    if (source._isNew && onAddSource) {
      const { _isNew, ...sourceData } = source;
      finalSource = onAddSource(sourceData);
    }
    // Get the anchor text from the paragraph
    const para = section.paragraphs?.find((p) => p.id === paraId);
    const anchorText = para?.text ? para.text.slice(Math.max(0, from - 1), to - 1) : "";
    // Create the citation
    const citation = onAddCitation({
      sourceId: finalSource.id,
      projectId: project?.id,
      sectionId: section?.id,
      paragraphId: paraId,
      anchorText,
      locator,
      footnoteText,
      inlineRange: { from, to },
    });
    setCitationPopover(null);
    return citation;
  }, [citationPopover, onAddCitation, onAddSource, project, section]);

  const status = section.status;

  // Compute sibling sections for zen nav rail
  // path = [partId, ...sectionIds, activeSectionId]
  const zenNavSections = useMemo(() => {
    if (!project || !path || path.length < 1) return [];
    // If path has only 1 entry (the section is top-level in a part), show all top-level sections in all parts
    if (path.length <= 2) {
      // Gather all top-level sections across all parts
      const all = [];
      for (const part of project.parts) {
        for (const child of part.children || []) all.push(child);
      }
      return all;
    }
    // Otherwise, find the parent section and return its children
    const parentId = path[path.length - 2];
    for (const part of project.parts) {
      if (part.id === parentId) return part.children || [];
      const found = findSiblings(part.children, parentId);
      if (found) return found;
    }
    return [];
  }, [project, path]);

  // ── Brainstorm mode: full-bleed mind map ──
  if (status === "brainstorm") {
    return (
      <div style={{ display: "flex", height: "100%", flexDirection: "column" }}>
        {/* Compact breadcrumb bar */}
        {project && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
            padding: "8px 16px", borderBottom: `1px solid ${P.bd}`, background: P.sf, flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: project.color, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>
              {project.name}
            </span>
            {path.slice(1).map((id, i) => (
              <React.Fragment key={id}>
                <ChevronRight size={9} style={{ color: P.tf }} />
                <span onClick={() => onSelectSection(project.id, id)}
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: i === path.length - 2 ? P.tx : P.tf, cursor: "pointer", letterSpacing: 1 }}>
                  {id === section.id ? section.title : (findSection(project.parts, id)?.section?.title || id)}
                </span>
              </React.Fragment>
            ))}
            <span style={{ marginLeft: 8 }}>
              <StatusSelect value={section.status} onChange={(s) => onUpdateSection(project.id, section.id, { status: s })} />
            </span>
            <span style={{ marginLeft: "auto", fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 400, color: P.tx }}>
              {section.title}
            </span>
          </div>
        )}
        {/* Mind map canvas */}
        <div style={{ flex: 1 }}>
          <BrainstormMindMap
            section={section}
            project={project}
            sectionNotes={sectionNotes}
            onSelectSection={onSelectSection}
            onAddNote={onAddNote}
          />
        </div>
      </div>
    );
  }

  // ── Text-based modes (drafting / revised / done) ──
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Zen mode nav rail — fixed overlay on left edge */}
      {zenMode && project && (
        <ZenNavRail
          project={project}
          activeSectionId={section.id}
          onSelectSection={onSelectSection}
          onAddChildSection={onAddChildSection}
        />
      )}
      {/* Sticky breadcrumb bar (hidden in zen mode) */}
      {project && !zenMode && (
        <div style={{
          display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
          padding: "8px 48px", borderBottom: `1px solid ${P.bd}`, background: P.sf, flexShrink: 0,
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: project.color, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>
            {project.name}
          </span>
          {path.slice(1).map((id, i) => (
            <React.Fragment key={id}>
              <ChevronRight size={9} style={{ color: P.tf }} />
              <span
                onClick={() => onSelectSection(project.id, id)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: i === path.length - 2 ? P.tx : P.tf,
                  cursor: "pointer", letterSpacing: 1, transition: "color 0.15s",
                  textDecoration: "none", borderBottom: "1px solid transparent",
                }}
                onMouseOver={(e) => { e.target.style.color = P.ac; e.target.style.borderBottomColor = P.ac; }}
                onMouseOut={(e) => { e.target.style.color = i === path.length - 2 ? P.tx : P.tf; e.target.style.borderBottomColor = "transparent"; }}
              >
                {id === section.id ? section.title : (findSection(project.parts, id)?.section?.title || id)}
              </span>
            </React.Fragment>
          ))}
          <span style={{ marginLeft: 8 }}>
            <StatusSelect value={section.status} onChange={(s) => onUpdateSection(project.id, section.id, { status: s })} />
          </span>
              {/* View switcher */}
              <div className="view-switcher" style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                {[
                  { key: "fulltext", icon: Newspaper, label: "Full Text" },
                  { key: "draft", icon: FileText, label: "Draft" },
                  { key: "expanded", icon: AlignLeft, label: "Expanded" },
                  { key: "outline", icon: List, label: "Outline" },
                ].map(({ key, icon: Icon, label }) => {
                  const active = editorMode === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setEditorMode(key)}
                      title={label}
                      className={`view-tab${active ? " is-active" : ""}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
                        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1.5, textTransform: "uppercase",
                        background: "transparent",
                        color: active ? P.ac : P.t3,
                        border: "none", borderRadius: 3, cursor: "pointer",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <Icon size={11} /> {label}
                    </button>
                  );
                })}
              </div>
        </div>
      )}

      {/* Main editor content */}
      <div className="smooth-scroll" style={{ flex: 1, overflowY: "auto" }}
        onClick={(e) => {
          // Click-outside deselection: deselect paragraph when clicking empty space
          if (selectedPara && !e.target.closest('.para-block') && !e.target.closest('.dashed-add-btn') && !e.target.closest('.action-btn') && !e.target.closest('.action-btn-danger') && !e.target.closest('select') && !e.target.closest('input') && !e.target.closest('textarea') && !e.target.closest('.ProseMirror') && !e.target.closest('.citation-tooltip') && !e.target.closest('.popover-enter')) {
            onSelectPara(null);
          }
        }}
      >
        <div style={{ maxWidth: zenMode ? 820 : status === "done" ? 640 : 720, margin: "0 auto", padding: zenMode ? "24px 48px 100px" : status === "done" ? "48px 64px 120px" : "32px 48px 100px" }}>

          {/* Title */}
          <div style={{ marginBottom: 24 }}>
            {editingTitle ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <input
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { onUpdateSection(project.id, section.id, { title: titleText }); setEditingTitle(false); }
                    if (e.key === "Escape") {
                      if (titleText !== section.title) {
                        setConfirmAction({ title: "Discard title changes?", message: "Your unsaved title changes will be lost.", danger: false, confirmLabel: "Discard", onConfirm: () => { setEditingTitle(false); setConfirmAction(null); } });
                      } else {
                        setEditingTitle(false);
                      }
                    }
                  }}
                  autoFocus
                  style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: headingSize, fontWeight: 300,
                    color: P.tx, border: "none", borderBottom: `2px solid ${P.ac}`,
                    background: "transparent", outline: "none", width: "100%", lineHeight: 1.15,
                  }}
                />
                <button onClick={() => { onUpdateSection(project.id, section.id, { title: titleText }); setEditingTitle(false); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: P.ac }}>
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <h1
                onClick={() => { setTitleText(section.title); setEditingTitle(true); }}
                style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: headingSize, fontWeight: 300,
                  color: P.tx, margin: "0 0 12px", lineHeight: 1.15, letterSpacing: -0.5,
                  cursor: "pointer", transition: "color 0.2s",
                }}
                onMouseOver={(e) => (e.target.style.color = P.ac)}
                onMouseOut={(e) => (e.target.style.color = P.tx)}
                title="Click to edit title"
              >
                {section.title}
              </h1>
            )}

            {/* Spine */}
            <div style={{ padding: "12px 16px", background: `${P.ac}0A`, borderLeft: `3px solid ${P.ac}`, borderTop: `1px solid ${P.ac}15`, borderRadius: "0 5px 5px 0" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: P.ac, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
                <GitBranch size={11} /> Section Spine
                {!editingSpine && (
                  <Edit3 size={12} style={{ cursor: "pointer", marginLeft: "auto", opacity: 0.7, padding: 2 }}
                    onClick={() => { setSpineText(section.spine || ""); setEditingSpine(true); }} />
                )}
              </div>
              {editingSpine ? (
                <div>
                  <textarea
                    value={spineText}
                    onChange={(e) => setSpineText(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onUpdateSection(project.id, section.id, { spine: spineText }); setEditingSpine(false); }
                      if (e.key === "Escape") {
                        if (spineText !== (section.spine || "")) {
                          setConfirmAction({ title: "Discard spine changes?", message: "Your unsaved spine edits will be lost.", danger: false, confirmLabel: "Discard", onConfirm: () => { setEditingSpine(false); setConfirmAction(null); } });
                        } else {
                          setEditingSpine(false);
                        }
                      }
                    }}
                    style={{
                      width: "100%", fontSize: 14.5, color: P.tm, fontStyle: "italic",
                      lineHeight: 1.55, fontFamily: "'Spectral', serif", background: "transparent",
                      border: `1px solid ${P.ac}40`, borderRadius: 4, padding: 8, outline: "none",
                      resize: "vertical", minHeight: 50,
                    }}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={() => { onUpdateSection(project.id, section.id, { spine: spineText }); setEditingSpine(false); }}
                      style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 12px", background: P.ac, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
                      Save
                    </button>
                    <button onClick={() => setEditingSpine(false)}
                      style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 12px", background: P.sf, color: P.tm, border: `1px solid ${P.bd}`, borderRadius: 3, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{ fontSize: 14.5, color: P.tm, fontStyle: "italic", lineHeight: 1.55, fontFamily: "'Spectral', serif", cursor: "pointer" }}
                  onClick={() => { setSpineText(section.spine || ""); setEditingSpine(true); }}
                >
                  {section.spine || "Click to add a spine sentence..."}
                </div>
              )}
            </div>
            {/* Section word count */}
            {section.paragraphs?.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf, letterSpacing: 1 }}>
                {section.paragraphs.reduce((sum, p) => sum + (p.text ? p.text.trim().split(/\s+/).filter(Boolean).length : 0), 0)} words
                {" \u00b7 "}
                {section.paragraphs.length} {section.paragraphs.length === 1 ? "paragraph" : "paragraphs"}
              </div>
            )}
          </div>

          {/* Outline mode */}
          {editorMode === "fulltext" ? (
            <FullTextView
              section={section}
              project={project}
              projectId={project.id}
              linkedTerms={linkedTerms}
              onTermClick={onTermClick}
              selectedPara={selectedPara}
              onSelectPara={onSelectPara}
              onUpdateText={onUpdateText}
              onUpdateMeta={onUpdateMeta}
              onUpdateSection={onUpdateSection}
              onAddParagraph={onAddParagraph}
              onDeleteParagraph={onDeleteParagraph}
              onAddNote={onAddNote}
              sectionNotes={sectionNotes}
              onAddChildSection={onAddChildSection}
              setConfirmAction={setConfirmAction}
              onSetRightPanel={onSetRightPanel}
              onSetShowRightPanel={onSetShowRightPanel}
              notesByPara={notesByPara}
              sectionDiagrams={sectionDiagrams}
              onEditDiagram={onEditDiagram}
              onRemoveDiagram={onRemoveDiagram}
            />
          ) : editorMode === "outline" ? (
            <OutlineView
              section={section}
              projectId={project.id}
              onSelectSection={onSelectSection}
              setEditorMode={setEditorMode}
              onAddChildSection={onAddChildSection}
            />
          ) : editorMode === "expanded" ? (
            <ExpandedSection
              section={section}
              depth={0}
              projectId={project.id}
              linkedTerms={linkedTerms}
              onTermClick={onTermClick}
              selectedPara={selectedPara}
              onSelectPara={onSelectPara}
              onUpdateText={onUpdateText}
              onUpdateMeta={onUpdateMeta}
              onUpdateSection={onUpdateSection}
              onAddParagraph={onAddParagraph}
              onDeleteParagraph={onDeleteParagraph}
              onAddNote={onAddNote}
              sectionNotes={sectionNotes}
              onAddChildSection={onAddChildSection}
              setConfirmAction={setConfirmAction}
              onSetRightPanel={onSetRightPanel}
              onSetShowRightPanel={onSetShowRightPanel}
              sectionDiagrams={sectionDiagrams}
              onEditDiagram={onEditDiagram}
              onRemoveDiagram={onRemoveDiagram}
            />
          ) : (
          <>
          {/* Status-specific content */}
          {status === "done" ? (
            /* ── Done: polished presentation ── */
            <>
              {section.children?.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  {section.children.map((child) => (
                    <div key={child.id} onClick={() => onSelectSection(project.id, child.id)}
                      style={{ padding: "8px 14px", borderRadius: 6, cursor: "pointer", transition: "all 0.2s", marginBottom: 4 }}
                      onMouseOver={(e) => (e.currentTarget.style.background = P.sh)}
                      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ fontSize: 14, fontWeight: 500, color: P.tx }}>{child.title}</span>
                      <ChevronRight size={12} style={{ color: P.tf, verticalAlign: -2, marginLeft: 6 }} />
                    </div>
                  ))}
                </div>
              )}
              <DoneContent section={section} linkedTerms={linkedTerms} onTermClick={onTermClick} sectionDiagrams={sectionDiagrams} onEditDiagram={onEditDiagram} />
            </>
          ) : status === "revised" ? (
            /* ── Revised: clean read-through with margin indicators ── */
            <>
              {section.children?.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: P.tf, marginBottom: 10 }}>
                    Subsections ({section.children.length})
                  </div>
                  {section.children.map((child) => (
                    <div key={child.id} onClick={() => onSelectSection(project.id, child.id)}
                      style={{
                        padding: "10px 14px", borderRadius: 6, background: P.sf,
                        border: `1px solid ${P.bd}`, cursor: "pointer", transition: "all 0.2s",
                        display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = P.sh)}
                      onMouseOut={(e) => (e.currentTarget.style.background = P.sf)}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: P.tx }}>{child.title}</span>
                        {child.spine && (
                          <div style={{ fontSize: 12, color: P.tm, fontStyle: "italic", marginTop: 3 }}>
                            {child.spine.slice(0, 100)}{child.spine.length > 100 ? "..." : ""}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={14} style={{ color: P.tf }} />
                    </div>
                  ))}
                </div>
              )}
              <RevisedContent section={section} linkedTerms={linkedTerms} onTermClick={onTermClick} sectionNotes={sectionNotes} sectionDiagrams={sectionDiagrams} onEditDiagram={onEditDiagram} />
            </>
          ) : (
            /* ── Drafting: full editor with paragraphs ── */
            <>
              {/* Child sections (as clickable cards) */}
              {section.children?.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: P.tf, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    Subsections ({section.children.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {section.children.map((child) => (
                      <div
                        key={child.id}
                        onClick={() => onSelectSection(project.id, child.id)}
                        style={{
                          padding: "10px 14px", borderRadius: 6, background: P.sf,
                          border: `1px solid ${P.bd}`, cursor: "pointer", transition: "all 0.2s",
                          display: "flex", alignItems: "center", gap: 10,
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = P.sh)}
                        onMouseOut={(e) => (e.currentTarget.style.background = P.sf)}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: P.tx }}>{child.title}</span>
                            <span style={{
                              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                              color: STATUS[child.status]?.text, letterSpacing: 1, textTransform: "uppercase",
                              padding: "1px 5px", borderRadius: 2, background: STATUS[child.status]?.bg,
                              border: `1px solid ${STATUS[child.status]?.bd}`,
                            }}>
                              {STATUS[child.status]?.l}
                            </span>
                          </div>
                          {child.spine && (
                            <div style={{ fontSize: 12, color: P.tm, fontStyle: "italic", lineHeight: 1.4, fontFamily: "'Spectral', serif", marginTop: 3 }}>
                              {child.spine.slice(0, 100)}{child.spine.length > 100 ? "..." : ""}
                            </div>
                          )}
                          {(child.children?.length > 0 || child.paragraphs?.length > 0) && (
                            <div style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>
                              {child.children?.length > 0 && `${child.children.length} subsections`}
                              {child.children?.length > 0 && child.paragraphs?.length > 0 && " · "}
                              {child.paragraphs?.length > 0 && `${child.paragraphs.length}¶`}
                            </div>
                          )}
                        </div>
                        <ChevronRight size={14} style={{ color: P.tf }} />
                      </div>
                    ))}
                  </div>
                  <div
                    onClick={() => onAddChildSection(project.id, section.id)}
                    className="dashed-add-btn"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "8px", marginTop: 6, borderRadius: 6, cursor: "pointer",
                      border: `1.5px dashed ${P.bd}`, color: P.tf,
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = P.ac; e.currentTarget.style.color = P.ac; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = P.bd; e.currentTarget.style.color = P.tf; }}
                  >
                    <FolderPlus size={12} />
                    <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>Add subsection</span>
                  </div>
                </div>
              )}

              {/* Paragraphs */}
              {section.paragraphs?.length > 0 && (
                <>
                  {section.children?.length > 0 && (
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: P.tf, marginBottom: 10 }}>
                      Content
                    </div>
                  )}
                  {section.paragraphs.map((para, i) => {
                    const role = SPINE_ROLES[para.spineRole];
                    const isSel = selectedPara === para.id;
                    const paraNoteCt = notesByPara[para.id] || 0;
                    const paraCitations = sectionCitations.filter((c) => c.paragraphId === para.id);
                    return (
                      <React.Fragment key={para.id}>
                      <div
                        data-para-id={para.id}
                        className={`para-block${isSel ? " para-selected" : ""}`}
                        onClick={() => onSelectPara(isSel ? null : para.id)}
                        style={{
                          position: "relative", padding: "8px 14px 8px 34px", marginBottom: 2,
                          borderRadius: 3, cursor: "pointer",
                          opacity: zenMode && selectedPara && !isSel ? 0.35 : 1,
                          transition: "opacity 0.3s ease",
                        }}
                      >
                        {/* Gutter: role icon + number */}
                        <div style={{
                          position: "absolute", left: 6, top: 8,
                          display: "flex", flexDirection: "column", alignItems: "center",
                          width: 22, gap: 0,
                        }}>
                          <span style={{ fontFamily: "serif", fontSize: 12, color: role?.c || P.tf, lineHeight: 1.2 }}>
                            {role?.i}
                          </span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: P.t3, lineHeight: 1.2 }}>
                            {i + 1}
                          </span>
                        </div>
                        {/* Note badge */}
                        {!isSel && paraNoteCt > 0 && (
                          <span className="para-note-badge"
                            title={`${paraNoteCt} note${paraNoteCt > 1 ? "s" : ""}`}
                            style={{ left: 7, bottom: 4 }}
                            onClick={(e) => { e.stopPropagation(); onSelectPara(para.id); if (onSetRightPanel) onSetRightPanel("notes"); if (onSetShowRightPanel) onSetShowRightPanel(true); }}
                          >
                            {paraNoteCt}
                          </span>
                        )}

                        {isSel ? (
                          <div className="toolbar-enter" onClick={(e) => e.stopPropagation()}>
                          <ParagraphEditor
                            content={para.text}
                            onChange={(text) => onUpdateText(project.id, section.id, para.id, text)}
                            placeholder="Write your paragraph..."
                            inlineNotes={sectionNotes.filter((n) => n.linkedParagraphId === para.id && n.inlineRange)}
                            onAddInlineNote={onAddNote ? (range, text) => {
                              // Store the selected text snippet for re-anchoring
                              const selectedText = para.text ? para.text.slice(Math.max(0, range.from - 1), range.to - 1) : "";
                              const note = onAddNote({
                                category: "comment",
                                text,
                                tags: [],
                                linkedProjectId: project?.id,
                                linkedSectionId: section?.id,
                                linkedParagraphId: para.id,
                                inlineRange: range,
                                anchorText: selectedText,
                              });
                              return note?.id;
                            } : undefined}
                            onClickInlineNote={onResolveNote ? (noteId) => {
                              // For now, clicking an inline comment shows it in the notes panel
                            } : undefined}
                            citations={sectionCitations.filter((c) => c.paragraphId === para.id)}
                            noteIndexMap={noteIndexMap}
                            sources={sources}
                            onAddCitation={onAddCitation ? (selPos) => {
                              setCitationPopover({ paraId: para.id, x: selPos.x, y: selPos.y, from: selPos.from, to: selPos.to });
                            } : undefined}
                            onClickCitation={(citationId) => {
                              // Navigate to bibliography panel and highlight the source
                              if (onSetRightPanel) onSetRightPanel("bibliography");
                              if (onSetShowRightPanel) onSetShowRightPanel(true);
                            }}
                          />
                          </div>
                        ) : (
                          <div style={{ fontSize: 15, lineHeight: 1.75, color: para.text ? P.tx : P.tf, fontFamily: "'Spectral', serif" }}>
                            {para.text
                              ? renderTextWithCitations(para.text, para.linkedTerms, linkedTerms, onTermClick, paraCitations, noteIndexMap)
                              : "Click to start writing..."}
                          </div>
                        )}

                        {isSel && (
                          <div className="toolbar-enter para-chrome" style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <StatusSelect value={para.status} onChange={(s) => onUpdateMeta(project.id, section.id, para.id, { status: s })} />
                            <RoleSelect value={para.spineRole} onChange={(r) => onUpdateMeta(project.id, section.id, para.id, { spineRole: r })} />
                            {para.linkedTerms?.map((t) => (
                              <span key={t} onClick={(e) => { e.stopPropagation(); onTermClick(t); }}
                                style={{
                                  fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 8px",
                                  borderRadius: 3, background: `${linkedTerms[t]?.color}0C`, color: linkedTerms[t]?.color,
                                  border: `1px solid ${linkedTerms[t]?.color}25`, letterSpacing: 1,
                                  cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
                                }}>
                                <Link2 size={8} />{t}
                              </span>
                            ))}
                            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                              {onAddNote && (
                                <button onClick={(e) => { e.stopPropagation(); handleAddParaNote(para.id); }}
                                  title="Add note for this paragraph"
                                  className="action-btn"
                                  style={{ background: "none", border: `1px solid ${P.ac}40`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: P.ac, display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                                  <MessageSquare size={10} /> Note
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); onAddParagraph(project.id, section.id, para.id); }}
                                title="Add paragraph below"
                                className="action-btn"
                                style={{ background: "none", border: `1px solid ${P.bd}`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: P.tm, display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                                <Plus size={10} /> Add ¶
                              </button>
                              {section.paragraphs.length > 1 && (
                                <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ title: "Delete paragraph?", message: "This will remove the paragraph and its content.", danger: true, confirmLabel: "Delete", onConfirm: () => { onDeleteParagraph(project.id, section.id, para.id); setConfirmAction(null); } }); }}
                                  title="Delete paragraph"
                                  className="action-btn-danger"
                                  style={{ background: "none", border: `1px solid #E8B4B4`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: "#943D3D", display: "flex", alignItems: "center" }}>
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Inline diagrams after this paragraph */}
                      {sectionDiagrams.filter((d) => d.sectionId === section.id && d.afterParagraphId === para.id).map((diag, di) => (
                        <DiagramInline key={diag.id} diagram={diag} figureIndex={di + 1} onEdit={onEditDiagram} onRemove={onRemoveDiagram} sectionTitle={section.title} />
                      ))}
                      </React.Fragment>
                    );
                  })}
                </>
              )}

              {/* Add paragraph button */}
              {(section.paragraphs?.length > 0 || !section.children?.length) && (
                <div onClick={() => onAddParagraph(project.id, section.id, null)}
                  className="dashed-add-btn"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px", marginTop: 8, borderRadius: 6, cursor: "pointer",
                    border: `1.5px dashed ${P.bd}`, color: P.tf,
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = P.ac; e.currentTarget.style.color = P.ac; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = P.bd; e.currentTarget.style.color = P.tf; }}>
                  <Plus size={13} />
                  <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>Add paragraph</span>
                </div>
              )}

              {/* Add subsection button — always visible */}
              {(
                <div onClick={() => onAddChildSection(project.id, section.id)}
                  className="dashed-add-btn"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px", marginTop: 6, borderRadius: 6, cursor: "pointer",
                    border: `1.5px dashed ${P.bd}`, color: P.tf,
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = P.ac; e.currentTarget.style.color = P.ac; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = P.bd; e.currentTarget.style.color = P.tf; }}>
                  <FolderPlus size={13} />
                  <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>Add subsection</span>
                </div>
              )}
            </>
          )}
          </>
          )}
        </div>
      </div>

      {/* Citation popover */}
      {citationPopover && (
        <CitationPopover
          position={citationPopover}
          sources={sources}
          onSave={handleCitationSave}
          onCancel={() => setCitationPopover(null)}
          zoteroSearch={(() => {
            const z = loadZoteroSettings();
            if (!z.connected) return undefined;
            return (query) => zoteroSearchLibrary(z.userId, z.apiKey, query);
          })()}
        />
      )}

      {/* Confirm modal */}
      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title || ""}
        message={confirmAction?.message || ""}
        danger={confirmAction?.danger ?? false}
        confirmLabel={confirmAction?.confirmLabel || "Confirm"}
        onConfirm={confirmAction?.onConfirm || (() => setConfirmAction(null))}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
