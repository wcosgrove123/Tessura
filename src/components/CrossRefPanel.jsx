import React, { useMemo } from "react";
import { Link2, X, GitBranch, StickyNote } from "lucide-react";
import { PALETTE as P, STATUS, SPINE_ROLES } from "../data/constants.js";
import { NOTE_CATEGORIES } from "../data/notes.js";
import { flattenSections } from "../hooks/useWorkspaceState.js";

export default function CrossRefPanel({
  projects, linkedTerms, selectedTerm, rightPanel, showRightPanel,
  activeProject, activeSectionId, sectionNotes = [], onSetRightPanel, onSetShowRightPanel,
  onSelectSection, onSelectTerm,
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
    <div style={{ width: 296, borderLeft: `1px solid ${P.bd}`, background: P.sb, overflowY: "auto", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${P.bd}` }}>
        <div style={{ display: "flex", gap: 2, background: P.sf, borderRadius: 4, padding: 2, border: `1px solid ${P.bl}` }}>
          {[["crossref", Link2, "Links"], ["spine", GitBranch, "Spines"], ["notes", StickyNote, "Notes"]].map(([v, Icon, label]) => (
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
          {selectedTerm ? (
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
                <div style={{ marginTop: 10, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: P.tf, letterSpacing: 1 }}>
                  HOME → {projects.find((p) => p.id === linkedTerms[selectedTerm].project)?.name}
                </div>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: P.tf, marginBottom: 10 }}>
                {crossRefs.length} references
              </div>
              {crossRefs.map((ref, i) => (
                <div
                  key={i}
                  onClick={() => onSelectSection(ref.project, ref.doc)}
                  style={{
                    padding: "10px 14px", marginBottom: 6, borderRadius: 5, background: P.bg,
                    cursor: "pointer", transition: "all 0.2s", borderLeft: `2.5px solid ${ref.pc}`,
                    border: `1px solid ${P.bl}`,
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
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: P.ac, marginBottom: 14 }}>
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
                borderLeft: activeSectionId === s.id ? `2.5px solid ${P.ac}` : "2.5px solid transparent",
                border: `1px solid ${P.bl}`,
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
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: 2, color: P.tf, marginBottom: 8, textTransform: "uppercase" }}>
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
        <div style={{ padding: 14 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: P.ac, marginBottom: 14 }}>
            Section Notes ({sectionNotes.filter(n => n.category !== "comment").length})
          </div>
          {sectionNotes.filter(n => n.category !== "comment").length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: P.tf }}>
              <StickyNote size={24} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div style={{ fontSize: 12, fontFamily: "'Spectral', serif" }}>No notes for this section</div>
            </div>
          ) : (
            sectionNotes.filter(n => n.category !== "comment").map((note) => {
              const cat = NOTE_CATEGORIES[note.category] || NOTE_CATEGORIES.idea;
              return (
                <div key={note.id} style={{
                  padding: "10px 14px", marginBottom: 6, borderRadius: 5, background: P.bg,
                  borderLeft: `2.5px solid ${cat.color}`, border: `1px solid ${P.bl}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 7, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 5px",
                      borderRadius: 2, background: `${cat.color}12`, color: cat.color,
                      letterSpacing: 1, textTransform: "uppercase", fontWeight: 600,
                    }}>
                      {cat.icon} {cat.label}
                    </span>
                    {note.linkedParagraphId && (
                      <span style={{ fontSize: 8, color: P.tf, fontFamily: "'IBM Plex Mono', monospace" }}>
                        paragraph
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: P.tm, lineHeight: 1.5, fontFamily: "'Spectral', serif" }}>
                    {note.text.length > 120 ? note.text.slice(0, 120) + "..." : note.text}
                  </div>
                  {note.tags?.length > 0 && (
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 6 }}>
                      {note.tags.slice(0, 3).map((tag) => (
                        <span key={tag} style={{
                          fontSize: 8, fontFamily: "'IBM Plex Mono', monospace", padding: "0px 4px",
                          borderRadius: 8, background: `${cat.color}08`, color: cat.color,
                          border: `1px solid ${cat.color}15`,
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Inline comments */}
          {sectionNotes.filter(n => n.category === "comment").length > 0 && (
            <>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: 2.5,
                textTransform: "uppercase", color: "#943D3D", marginTop: 18, marginBottom: 10,
              }}>
                Comments ({sectionNotes.filter(n => n.category === "comment").length})
              </div>
              {sectionNotes.filter(n => n.category === "comment").map((note) => (
                <div key={note.id} style={{
                  padding: "8px 12px", marginBottom: 4, borderRadius: 5, background: P.bg,
                  borderLeft: `2px solid #943D3D40`, border: `1px solid ${P.bl}`,
                  opacity: note.resolved ? 0.5 : 1,
                }}>
                  <div style={{ fontSize: 11, color: P.tm, lineHeight: 1.4, fontFamily: "'Spectral', serif" }}>
                    {note.text}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
