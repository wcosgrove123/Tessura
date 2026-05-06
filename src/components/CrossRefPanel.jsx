import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Link2, X, GitBranch, StickyNote, BookOpen, Plus, Edit3, Trash2, ChevronRight, ChevronDown, Unlink } from "lucide-react";
import { PALETTE as P, STATUS, SPINE_ROLES } from "../data/constants.js";
import { NOTE_CATEGORIES } from "../data/notes.js";
import { flattenSections } from "../hooks/useWorkspaceState.js";
import BibliographyPanel from "./BibliographyPanel.jsx";

// ── Mini note card (reused from Editor pattern) ──────────

function PanelNoteCard({ note, isEditing, onEdit, onDelete, onSave, onCancel, onClick }) {
  const cat = NOTE_CATEGORIES[note.category] || NOTE_CATEGORIES.idea;
  const [editText, setEditText] = useState(note.text);
  const [editCategory, setEditCategory] = useState(note.category);
  const [editTags, setEditTags] = useState(note.tags?.join(", ") || "");

  if (isEditing) {
    return (
      <div style={{ padding: "8px 10px", borderRadius: 6, background: P.bg, border: `1.5px solid ${P.ac}40`, fontSize: 12 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
          {Object.entries(NOTE_CATEGORIES).filter(([k]) => k !== "comment").map(([key, c]) => (
            <button key={key} onClick={() => setEditCategory(key)} style={{
              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "2px 6px",
              borderRadius: 3, cursor: "pointer", border: `1px solid ${c.color}30`,
              background: editCategory === key ? `${c.color}20` : "transparent",
              color: c.color, fontWeight: editCategory === key ? 600 : 400,
            }}>{c.icon} {c.label}</button>
          ))}
        </div>
        <textarea value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus style={{
          width: "100%", minHeight: 50, fontSize: 12, lineHeight: 1.5,
          fontFamily: "'Spectral', serif", color: P.tx, background: P.sf,
          border: `1px solid ${P.bd}`, borderRadius: 4, padding: 8, outline: "none", resize: "vertical",
        }} />
        <input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="Tags (comma-separated)" style={{
          width: "100%", marginTop: 4, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
          color: P.tm, background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 3, padding: "4px 8px", outline: "none",
        }} />
        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
          <button onClick={() => onSave(note.id, { text: editText, category: editCategory, tags: editTags.split(",").map(t => t.trim()).filter(Boolean) })}
            style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 10px", background: P.ac, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>Save</button>
          <button onClick={onCancel} style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 10px", background: P.sf, color: P.tm, border: `1px solid ${P.bd}`, borderRadius: 3, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        padding: "8px 10px", borderRadius: 6, background: P.bg,
        borderTop: `1px solid ${P.bl}`, borderRight: `1px solid ${P.bl}`, borderBottom: `1px solid ${P.bl}`, borderLeft: `2px solid ${cat.color}`,
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        cursor: onClick ? "pointer" : "default",
      }}
      onMouseOver={(e) => { e.currentTarget.style.boxShadow = "0 3px 10px rgba(44,36,24,0.07)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 5px", borderRadius: 2, background: `${cat.color}12`, color: cat.color, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>
          {cat.icon} {cat.label}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <button onClick={() => onEdit(note.id)} style={{ background: "none", border: "none", cursor: "pointer", color: P.tf, padding: 6, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Edit3 size={11} />
          </button>
          <button onClick={() => onDelete(note.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#943D3D", padding: 6, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.5, color: P.tx, fontFamily: "'Spectral', serif" }}>
        {note.text.length > 150 ? note.text.slice(0, 150) + "..." : note.text}
      </div>
      {note.tags?.length > 0 && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
          {note.tags.slice(0, 3).map((tag) => (
            <span key={tag} style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "0px 4px", borderRadius: 8, background: `${cat.color}08`, color: cat.color, border: `1px solid ${cat.color}15` }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notes Tab Content (replaces the old Editor-side notes panel) ──

function NotesTabContent({ sectionNotes, looseNotes, project, section, onAddNote, onUpdateNote, onDeleteNote, onSelectPara, highlightParaId }) {
  const [editingId, setEditingId] = useState(null);
  const [flashParaId, setFlashParaId] = useState(null);
  const notesListRef = useRef(null);

  // When highlightParaId changes, scroll to and flash the matching note group
  useEffect(() => {
    if (!highlightParaId) return;
    setFlashParaId(highlightParaId);
    const timer = setTimeout(() => setFlashParaId(null), 1500);
    // Scroll the note group into view
    requestAnimationFrame(() => {
      const el = notesListRef.current?.querySelector(`[data-note-para="${highlightParaId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => clearTimeout(timer);
  }, [highlightParaId]);
  const [showLoose, setShowLoose] = useState(false);

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
    if (!onAddNote) return;
    const newNote = onAddNote({
      category: "idea", text: "", tags: [],
      linkedProjectId: project?.id, linkedSectionId: section?.id, linkedParagraphId: paraId,
    });
    if (newNote) setEditingId(newNote.id);
  }, [onAddNote, project, section]);

  const handleSave = useCallback((noteId, updates) => {
    onUpdateNote(noteId, updates);
    setEditingId(null);
  }, [onUpdateNote]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${P.bd}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: P.tm, display: "flex", alignItems: "center", gap: 5 }}>
          <StickyNote size={11} /> Section Notes
          {sectionLevel.length + paraGroupEntries.length > 0 && (
            <span style={{ background: `${P.ac}15`, color: P.ac, padding: "1px 5px", borderRadius: 8, fontSize: 10, fontWeight: 600 }}>
              {sectionNotes.filter(n => n.category !== "comment").length}
            </span>
          )}
        </span>
        {onAddNote && (
          <button onClick={() => handleQuickAdd(null)} title="Add section note" style={{ background: "none", border: "none", cursor: "pointer", color: P.ac, padding: 6, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Notes list */}
      <div ref={notesListRef} style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        {/* Section-level notes */}
        {sectionLevel.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sectionLevel.map((note) => (
                <PanelNoteCard key={note.id} note={note} isEditing={editingId === note.id}
                  onEdit={setEditingId} onDelete={onDeleteNote} onSave={handleSave} onCancel={() => setEditingId(null)}
                  onClick={note.linkedParagraphId && onSelectPara ? () => onSelectPara(note.linkedParagraphId) : undefined} />
              ))}
            </div>
          </div>
        )}

        {/* Paragraph-level notes */}
        {paraGroupEntries.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: P.tf, marginBottom: 6 }}>
              Paragraph Notes
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {paraGroupEntries.map(([paraId, notes]) => (
                <div key={paraId} data-note-para={paraId} style={{
                  padding: 4, marginBottom: 2, borderRadius: 6,
                  transition: "background 0.4s ease, box-shadow 0.4s ease",
                  background: flashParaId === paraId ? `${P.ac}18` : "transparent",
                  boxShadow: flashParaId === paraId ? `0 0 0 2px ${P.ac}30` : "none",
                }}>
                  <div
                    onClick={() => onSelectPara?.(paraId)}
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: onSelectPara ? P.ac : P.tf, marginBottom: 4, letterSpacing: 1, cursor: onSelectPara ? "pointer" : "default", transition: "color 0.15s" }}
                    onMouseOver={(e) => { if (onSelectPara) e.currentTarget.style.textDecoration = "underline"; }}
                    onMouseOut={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                    title="Click to jump to paragraph"
                  >
                    &#182; paragraph {paraId.slice(-4)}
                  </div>
                  {notes.map((note) => (
                    <PanelNoteCard key={note.id} note={note} isEditing={editingId === note.id}
                      onEdit={setEditingId} onDelete={onDeleteNote} onSave={handleSave} onCancel={() => setEditingId(null)}
                      onClick={onSelectPara ? () => onSelectPara(paraId) : undefined} />
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
            <div style={{ fontSize: 11, fontFamily: "'Spectral', serif" }}>No notes for this section yet</div>
            {onAddNote && (
              <button onClick={() => handleQuickAdd(null)} style={{ marginTop: 8, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 12px", background: P.ac, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
                <Plus size={10} style={{ verticalAlign: -1, marginRight: 3 }} /> Add Note
              </button>
            )}
          </div>
        )}

        {/* Loose ideas pool */}
        <div style={{ marginTop: 16, borderTop: `1px solid ${P.bd}`, paddingTop: 10 }}>
          <div onClick={() => setShowLoose(!showLoose)} style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1.5,
            textTransform: "uppercase", color: P.tf, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4, marginBottom: showLoose ? 6 : 0,
          }}>
            {showLoose ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <Unlink size={10} /> Loose Ideas ({looseNotes.filter(n => n.category !== "comment").length})
          </div>
          {showLoose && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {looseNotes.filter(n => n.category !== "comment").slice(0, 10).map((note) => (
                <PanelNoteCard key={note.id} note={note} isEditing={editingId === note.id}
                  onEdit={setEditingId} onDelete={onDeleteNote} onSave={handleSave} onCancel={() => setEditingId(null)} />
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

export default function CrossRefPanel({
  projects, linkedTerms, selectedTerm, rightPanel, showRightPanel,
  activeProject, activeSectionId, sectionNotes = [], looseNotes = [],
  onSetRightPanel, onSetShowRightPanel,
  onSelectSection, onSelectTerm,
  // Note props
  project, section, onAddNote, onUpdateNote, onDeleteNote,
  onSelectPara, selectedPara,
  // Citation props
  sources = [], citations = [], noteIndexMap = {},
  onUpdateSource, onDeleteSource, onDeleteCitation,
}) {
  const crossRefs = useMemo(() => {
    if (!selectedTerm) return [];
    const t = linkedTerms[selectedTerm];
    if (!t) return [];
    return t.refs.map((r) => ({
      ...r,
      pn: projects.find((p) => p.id === r.project)?.name,
      pc: projects.find((p) => p.id === r.project)?.color,
    }));
  }, [selectedTerm, linkedTerms, projects]);

  // Flatten sections for spine view
  const activeSections = useMemo(() => {
    if (!activeProject) return [];
    return flattenSections(activeProject.parts);
  }, [activeProject]);

  if (!showRightPanel) {
    return (
      <button
        onClick={() => onSetShowRightPanel(true)}
        style={{
          position: "absolute", right: 8, top: 58, background: P.sf,
          border: `1px solid ${P.bd}`, borderRadius: 5, padding: "6px 8px",
          cursor: "pointer", color: P.tm, zIndex: 10,
        }}
      >
        <Link2 size={14} />
      </button>
    );
  }

  return (
    <div style={{ height: "100%", background: P.sb, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${P.bd}` }}>
        <div style={{ display: "flex", gap: 2, background: P.sf, borderRadius: 4, padding: 2, border: `1px solid ${P.bl}` }}>
          {[["crossref", Link2, "Links"], ["spine", GitBranch, "Spines"], ["notes", StickyNote, "Notes"], ["bibliography", BookOpen, "Bib"]].map(([v, Icon, label]) => (
            <button
              key={v}
              onClick={() => onSetRightPanel(v)}
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
                background: rightPanel === v ? P.bg : "transparent",
                border: "none", borderRadius: 3, color: rightPanel === v ? P.ac : P.tf,
                cursor: "pointer", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                boxShadow: rightPanel === v ? `0 1px 3px ${P.bd}` : "none",
              }}
            >
              <Icon size={10} />{label}
            </button>
          ))}
        </div>
        <button onClick={() => onSetShowRightPanel(false)}
          style={{ background: "none", border: "none", color: P.tf, cursor: "pointer", padding: 4 }}>
          <X size={14} />
        </button>
      </div>

      {rightPanel === "crossref" && (
        <div style={{ padding: 14 }}>
          {selectedTerm && linkedTerms[selectedTerm] ? (
            <>
              <div style={{
                padding: "14px 16px", background: `${linkedTerms[selectedTerm].color}08`,
                borderRadius: 6, marginBottom: 18, border: `1px solid ${linkedTerms[selectedTerm].color}20`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: "serif", fontSize: 26, color: linkedTerms[selectedTerm].color, fontStyle: "italic" }}>
                    {linkedTerms[selectedTerm].symbol}
                  </span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: linkedTerms[selectedTerm].color, fontWeight: 500 }}>
                    {selectedTerm}
                  </span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: P.tm, fontFamily: "'Spectral', serif" }}>
                  {linkedTerms[selectedTerm].definition}
                </div>
                <div style={{ marginTop: 10, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf, letterSpacing: 1 }}>
                  HOME → {projects.find((p) => p.id === linkedTerms[selectedTerm].project)?.name}
                </div>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: P.tf, marginBottom: 10 }}>
                {crossRefs.length} references
              </div>
              {crossRefs.map((ref, i) => (
                <div
                  key={i}
                  onClick={() => onSelectSection(ref.project, ref.doc)}
                  style={{
                    padding: "10px 14px", marginBottom: 6, borderRadius: 5, background: P.bg,
                    cursor: "pointer", transition: "all 0.2s",
                    borderTop: `1px solid ${P.bl}`, borderRight: `1px solid ${P.bl}`, borderBottom: `1px solid ${P.bl}`, borderLeft: `2.5px solid ${ref.pc}`,
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = P.sh)}
                  onMouseOut={(e) => (e.currentTarget.style.background = P.bg)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: ref.pc }} />
                    <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: ref.pc, fontWeight: 500 }}>{ref.pn}</span>
                  </div>
                  <div style={{ fontSize: 12, color: P.tm, lineHeight: 1.5, fontFamily: "'Spectral', serif", fontStyle: "italic" }}>
                    {ref.snippet}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <Link2 size={28} style={{ color: P.bd, marginBottom: 14 }} />
              <div style={{ fontSize: 13, color: P.tf, lineHeight: 1.6, fontFamily: "'Spectral', serif" }}>
                Click any <span style={{ color: P.ac, fontWeight: 600 }}>linked term</span> to see cross-project references.
              </div>
            </div>
          )}
        </div>
      )}

      {rightPanel === "spine" && (
        <div style={{ padding: 14 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: P.ac, marginBottom: 14 }}>
            Spines — {activeProject?.name}
          </div>
          {activeSections.filter((s) => s.spine).map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectSection(activeProject.id, s.id)}
              style={{
                padding: "10px 14px", marginBottom: 6, borderRadius: 5,
                background: activeSectionId === s.id ? P.sh : P.bg,
                cursor: "pointer", transition: "all 0.2s",
                borderTop: `1px solid ${P.bl}`, borderRight: `1px solid ${P.bl}`, borderBottom: `1px solid ${P.bl}`,
                borderLeft: activeSectionId === s.id ? `2.5px solid ${P.ac}` : "2.5px solid transparent",
                paddingLeft: 14 + s.depth * 10,
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = P.sh)}
              onMouseOut={(e) => { if (activeSectionId !== s.id) e.currentTarget.style.background = P.bg; }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: P.tx, marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: P.tm, fontStyle: "italic", lineHeight: 1.4, fontFamily: "'Spectral', serif" }}>
                {s.spine}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 18, padding: "12px 14px", background: P.bg, borderRadius: 5, border: `1px solid ${P.bl}` }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 2, color: P.tf, marginBottom: 8, textTransform: "uppercase" }}>
              Paragraph Roles
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px" }}>
              {Object.entries(SPINE_ROLES).map(([k, r]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "serif", fontSize: 13, color: r.c, width: 16, textAlign: "center" }}>{r.i}</span>
                  <span style={{ fontSize: 10, color: P.tm }}>{r.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {rightPanel === "notes" && (
        <NotesTabContent
          sectionNotes={sectionNotes}
          looseNotes={looseNotes}
          project={project}
          section={section}
          onAddNote={onAddNote}
          onUpdateNote={onUpdateNote}
          onDeleteNote={onDeleteNote}
          onSelectPara={onSelectPara}
          highlightParaId={selectedPara}
        />
      )}
      {rightPanel === "bibliography" && (
        <BibliographyPanel
          sources={sources}
          citations={citations}
          noteIndexMap={noteIndexMap}
          onUpdateSource={onUpdateSource}
          onDeleteSource={onDeleteSource}
          onDeleteCitation={onDeleteCitation}
          onSelectSection={onSelectSection}
          activeProjectId={activeProject?.id}
        />
      )}
    </div>
  );
}
