import React, { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { X, Printer, ChevronDown, ChevronRight, List } from "lucide-react";
import { formatFootnote, formatBibEntry } from "../lib/chicagoFormatter.js";
import { collectParagraphs } from "../hooks/useWorkspaceState.js";

const P = {
  bg: "#FAF7F2", tx: "#2C2418", ac: "#8B4513",
  tm: "#6B6052", tf: "#958978", bd: "#D4C9B8",
  dark: "#2C2418",
};

// ── Helpers ─────────────────────────────────────────────────

function countWords(project) {
  let total = 0;
  for (const part of project.parts || []) {
    for (const section of part.children || []) {
      const paras = collectParagraphs(section);
      for (const p of paras) {
        if (p.text) total += p.text.split(/\s+/).filter(Boolean).length;
      }
    }
  }
  return total;
}

function renderPrintTerms(text, linkedTerms, allTerms) {
  if (!linkedTerms?.length || !text) return text;
  let result = [];
  let remaining = text;
  let key = 0;
  const sorted = [...linkedTerms].sort((a, b) => b.length - a.length);
  for (const term of sorted) {
    const regex = new RegExp(`\\b(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i");
    const match = remaining.match(regex);
    if (match) {
      const idx = match.index;
      if (idx > 0) result.push(remaining.slice(0, idx));
      result.push(<em key={key++}>{match[1]}</em>);
      remaining = remaining.slice(idx + match[1].length);
    }
  }
  if (remaining) result.push(remaining);
  return result.length > 1 ? result : text;
}

// Render [N] footnote markers as clickable superscripts that jump to endnotes
function makeSup(num, keyPrefix) {
  return (
    <sup
      key={keyPrefix}
      onClick={(e) => { e.stopPropagation(); document.getElementById(`endnote-${num}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
      style={{
        fontSize: "0.7em", color: P.ac, fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 600, cursor: "pointer", transition: "color 0.15s",
      }}
      onMouseOver={(e) => { e.currentTarget.style.color = "#B5651D"; }}
      onMouseOut={(e) => { e.currentTarget.style.color = P.ac; }}
      title={`Go to note ${num}`}
    >
      {num}
    </sup>
  );
}

function renderFootnoteMarkers(content) {
  if (typeof content === "string") {
    const parts = content.split(/(\[\d+\])/g);
    if (parts.length <= 1) return content;
    return parts.map((part, i) => {
      const m = part.match(/^\[(\d+)\]$/);
      if (m) return makeSup(m[1], `fn-${i}`);
      return part;
    });
  }
  if (Array.isArray(content)) {
    return content.map((item, idx) => {
      if (typeof item === "string") {
        const parts = item.split(/(\[\d+\])/g);
        if (parts.length <= 1) return item;
        return parts.map((part, i) => {
          const m = part.match(/^\[(\d+)\]$/);
          if (m) return makeSup(m[1], `fn-${idx}-${i}`);
          return part;
        });
      }
      return item;
    }).flat();
  }
  return content;
}

function renderParagraphContent(text, linkedTerms, allTerms) {
  let content = renderPrintTerms(text, linkedTerms, allTerms);
  return renderFootnoteMarkers(content);
}

// ── Cover Page ──────────────────────────────────────────────

function CoverPage({ project, wordCount }) {
  return (
    <div className="print-cover" style={{
      minHeight: "11in", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "2in 1in", pageBreakAfter: "always",
    }}>
      <div style={{ flex: 1 }} />

      <h1 style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 38, fontWeight: 300, letterSpacing: 5,
        textTransform: "uppercase", color: P.tx, lineHeight: 1.2,
        margin: 0, maxWidth: 500,
      }}>
        {project.name}
      </h1>

      <div style={{ width: 80, height: 1, background: P.bd, margin: "28px auto" }} />

      <p style={{
        fontFamily: "'Spectral', Georgia, serif",
        fontSize: 15, fontStyle: "italic", color: P.tm,
        lineHeight: 1.6, maxWidth: 420, margin: 0,
      }}>
        Why the Foundation of Curriculum Must Shift from Content to Metacognition
      </p>

      <div style={{ height: 56 }} />

      <p style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 20, fontWeight: 400, color: P.tx, margin: 0,
      }}>
        Wil Cosgrove
      </p>

      <p style={{
        fontFamily: "'Spectral', Georgia, serif",
        fontSize: 12, color: P.tm, marginTop: 10, lineHeight: 1.6,
      }}>
        Graduate School of Education and Human Development<br />
        The George Washington University
      </p>

      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, color: P.tf, marginTop: 20, letterSpacing: 1,
      }}>
        April 2026
      </p>

      <div style={{ flex: 1.5 }} />

      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9, color: P.tf, letterSpacing: 0.5,
      }}>
        {wordCount.toLocaleString()} words
      </p>
    </div>
  );
}

// ── Table of Contents ───────────────────────────────────────

function TableOfContents({ project, onScrollTo }) {
  const tocEntries = [];

  function walkSections(sections, depth) {
    for (const section of sections) {
      tocEntries.push({ id: section.id, title: section.title, depth });
      if (section.children?.length && depth < 3) {
        walkSections(section.children, depth + 1);
      }
    }
  }

  for (const part of project.parts || []) {
    tocEntries.push({ id: part.id, title: part.title, depth: -1, isPart: true });
    walkSections(part.children || [], 0);
  }

  const fontSizes = [15, 13, 12, 11];
  const indents = [0, 28, 52, 72];

  return (
    <div className="print-toc" style={{ pageBreakAfter: "always", padding: "80px 0" }}>
      <h2 style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 28, fontWeight: 300, color: P.tx, textAlign: "center",
        letterSpacing: 4, textTransform: "uppercase", marginBottom: 48,
      }}>
        Table of Contents
      </h2>

      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {tocEntries.map((entry, i) => {
          if (entry.isPart) {
            return (
              <div key={entry.id} style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 13, fontWeight: 600, color: P.tx,
                letterSpacing: 2.5, textTransform: "uppercase",
                marginTop: i > 0 ? 28 : 0, marginBottom: 10,
                paddingBottom: 6, borderBottom: `1px solid ${P.bd}`,
              }}>
                {entry.title}
              </div>
            );
          }

          const fs = fontSizes[Math.min(entry.depth, fontSizes.length - 1)];
          const indent = indents[Math.min(entry.depth, indents.length - 1)];

          return (
            <a
              key={entry.id}
              href={`#print-sec-${entry.id}`}
              onClick={(e) => { e.preventDefault(); onScrollTo(entry.id); }}
              style={{
                display: "flex", alignItems: "baseline", gap: 6,
                textDecoration: "none",
                fontFamily: entry.depth === 0 ? "'Cormorant Garamond', Georgia, serif" : "'Spectral', Georgia, serif",
                fontSize: fs, color: P.tx, lineHeight: 1.4,
                marginLeft: indent, padding: "3px 0",
                fontWeight: entry.depth === 0 ? 500 : 400,
                transition: "color 0.15s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = P.ac; }}
              onMouseOut={(e) => { e.currentTarget.style.color = P.tx; }}
            >
              <span style={{ flex: 1 }}>{entry.title}</span>
              <span style={{
                flex: "0 0 auto", borderBottom: `1px dotted ${P.bd}`,
                minWidth: 40, flexGrow: 1, marginBottom: 3,
              }} />
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── Recursive Section Renderer ──────────────────────────────

const headingSizes = [30, 22, 18, 15, 13];
const headingWeights = [400, 500, 500, 600, 600];

function PrintSection({ section, depth, linkedTerms, collapsedSections, toggleCollapse }) {
  const hs = headingSizes[Math.min(depth, headingSizes.length - 1)];
  const hw = headingWeights[Math.min(depth, headingWeights.length - 1)];
  const isCollapsed = collapsedSections?.[section.id] || false;
  const hasContent = (section.paragraphs?.length > 0) || (section.children?.length > 0);

  // Depth-0 sections (WHY, WHAT, WHO) get special treatment — centered, more space
  const isTopLevel = depth === 0;

  return (
    <div
      id={`print-sec-${section.id}`}
      className={depth <= 1 ? "print-section-break" : ""}
      style={{ marginBottom: depth === 0 ? 40 : 20 }}
    >
      {/* Section heading */}
      <div
        onClick={() => toggleCollapse?.(section.id)}
        style={{
          marginBottom: isCollapsed ? 8 : isTopLevel ? 24 : 14,
          marginTop: isTopLevel ? 56 : depth === 1 ? 40 : 24,
          pageBreakAfter: "avoid", breakAfter: "avoid",
          textAlign: isTopLevel ? "center" : "left",
          cursor: hasContent && toggleCollapse ? "pointer" : "default",
          display: "flex", alignItems: "baseline",
          justifyContent: isTopLevel ? "center" : "flex-start",
          gap: 6,
        }}
      >
        {hasContent && toggleCollapse && !isTopLevel && (
          <span style={{ opacity: isCollapsed ? 0.4 : 0.2, flexShrink: 0, transition: "opacity 0.15s" }}>
            {isCollapsed ? <ChevronRight size={hs * 0.45} color={P.tf} /> : <ChevronDown size={hs * 0.45} color={P.tf} />}
          </span>
        )}
        <div>
          {isTopLevel && (
            <div style={{ width: 40, height: 1, background: P.bd, margin: "0 auto 16px" }} />
          )}
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: hs, fontWeight: hw, color: P.tx,
            lineHeight: 1.3,
            letterSpacing: isTopLevel ? 1 : 0,
            textTransform: isTopLevel ? "uppercase" : "none",
          }}>
            {section.title}
          </div>
          {isTopLevel && (
            <div style={{ width: 40, height: 1, background: P.bd, margin: "16px auto 0" }} />
          )}
        </div>
      </div>

      {/* Collapsible content */}
      {!isCollapsed && (
        <>
          {/* Paragraphs */}
          {section.paragraphs?.map((para, i) => {
            if (!para.text) return null;
            return (
              <p key={para.id} style={{
                fontFamily: "'Spectral', Georgia, serif",
                fontSize: 16, lineHeight: 1.85, color: P.tx,
                margin: 0, marginBottom: 2,
                textIndent: i > 0 ? "2em" : 0,
                orphans: 3, widows: 3,
              }}>
                {renderParagraphContent(para.text, para.linkedTerms, linkedTerms)}
              </p>
            );
          })}

          {/* Recurse into children */}
          {section.children?.map((child) => (
            <PrintSection
              key={child.id}
              section={child}
              depth={depth + 1}
              linkedTerms={linkedTerms}
              collapsedSections={collapsedSections}
              toggleCollapse={toggleCollapse}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ── Endnotes ────────────────────────────────────────────────

function Endnotes({ project, sources }) {
  // Build footnote number → source mapping from migrated sources
  const fnToSource = useMemo(() => {
    const map = {};
    for (const s of sources || []) {
      if (s._footnotes) {
        for (const fn of s._footnotes) {
          map[fn] = s;
        }
      }
    }
    return map;
  }, [sources]);

  // Collect all [N] markers from document
  const allNotes = useMemo(() => {
    const notes = [];
    const seen = new Set();
    function walk(sections) {
      for (const s of sections) {
        for (const p of s.paragraphs || []) {
          const matches = [...(p.text || "").matchAll(/\[(\d+)\]/g)];
          for (const m of matches) {
            const num = parseInt(m[1]);
            if (!seen.has(num)) {
              seen.add(num);
              notes.push({ num, source: fnToSource[num] || null });
            }
          }
        }
        if (s.children) walk(s.children);
      }
    }
    for (const part of project.parts || []) walk(part.children || []);
    return notes.sort((a, b) => a.num - b.num);
  }, [project, fnToSource]);

  if (allNotes.length === 0) return null;

  return (
    <div id="print-sec-endnotes" style={{ pageBreakBefore: "always", padding: "56px 0 40px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ width: 40, height: 1, background: P.bd, margin: "0 auto 16px" }} />
        <h2 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 28, fontWeight: 300, color: P.tx,
          letterSpacing: 3, textTransform: "uppercase",
        }}>
          Notes
        </h2>
        <div style={{ width: 40, height: 1, background: P.bd, margin: "16px auto 0" }} />
      </div>

      {allNotes.map((note) => (
        <p key={note.num} id={`endnote-${note.num}`} style={{
          fontFamily: "'Spectral', Georgia, serif",
          fontSize: 13, lineHeight: 1.7, color: P.tx,
          margin: 0, marginBottom: 8,
          paddingLeft: "2em", textIndent: "-2em",
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: P.ac, fontWeight: 600 }}>
            {note.num}.
          </span>
          {" "}
          {note.source ? (
            formatFootnote(note.source, note.source._locators?.[0] || null)
          ) : (
            <span style={{ color: P.tm, fontStyle: "italic" }}>[Source not yet linked]</span>
          )}
        </p>
      ))}
    </div>
  );
}

// ── Bibliography ────────────────────────────────────────────

function Bibliography({ sources }) {
  if (!sources?.length) return null;

  const sorted = [...sources]
    .filter(s => s.category === "cited" || s.category === "referenced")
    .sort((a, b) => {
      const aName = a.authors?.[0]?.family || a.title || "";
      const bName = b.authors?.[0]?.family || b.title || "";
      return aName.localeCompare(bName);
    });

  if (sorted.length === 0) return null;

  return (
    <div id="print-sec-bibliography" style={{ pageBreakBefore: "always", padding: "56px 0 80px" }}>
      <div style={{
        textAlign: "center", marginBottom: 40,
      }}>
        <div style={{ width: 40, height: 1, background: P.bd, margin: "0 auto 16px" }} />
        <h2 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 28, fontWeight: 300, color: P.tx,
          letterSpacing: 3, textTransform: "uppercase",
        }}>
          Bibliography
        </h2>
        <div style={{ width: 40, height: 1, background: P.bd, margin: "16px auto 0" }} />
      </div>

      {sorted.map((source) => (
        <p key={source.id} style={{
          fontFamily: "'Spectral', Georgia, serif",
          fontSize: 14, lineHeight: 1.7, color: P.tx,
          margin: 0, marginBottom: 10,
          paddingLeft: "2em", textIndent: "-2em", // hanging indent
        }}>
          {formatBibEntry(source)}
        </p>
      ))}
    </div>
  );
}

// ── Navigation Panel ────────────────────────────────────────

function NavPanel({ project, onScrollTo, visible }) {
  if (!visible) return null;

  const entries = [];
  function walk(sections, depth) {
    for (const s of sections) {
      entries.push({ id: s.id, title: s.title, depth });
      if (s.children?.length && depth < 2) walk(s.children, depth + 1);
    }
  }
  for (const part of project.parts || []) {
    entries.push({ id: part.id, title: part.title, depth: -1, isPart: true });
    walk(part.children || [], 0);
  }

  return (
    <div className="print-nav-panel" style={{
      position: "fixed", left: 0, top: 40, bottom: 0, width: 260,
      background: "#FEFDFB", borderRight: `1px solid ${P.bd}`,
      overflowY: "auto", padding: "16px 0", zIndex: 10001,
      boxShadow: "2px 0 12px rgba(44,36,24,0.06)",
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
        letterSpacing: 2, textTransform: "uppercase", color: P.tf,
        padding: "0 16px 10px", borderBottom: `1px solid ${P.bd}`,
        marginBottom: 8,
      }}>
        Navigation
      </div>
      {entries.map((e) => {
        if (e.isPart) {
          return (
            <div key={e.id} style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
              letterSpacing: 2, textTransform: "uppercase", color: P.tm,
              padding: "10px 16px 4px", fontWeight: 600,
            }}>
              {e.title}
            </div>
          );
        }
        const indent = 16 + e.depth * 14;
        return (
          <div
            key={e.id}
            onClick={() => onScrollTo(e.id)}
            style={{
              fontFamily: e.depth === 0 ? "'Cormorant Garamond', Georgia, serif" : "'Spectral', Georgia, serif",
              fontSize: e.depth === 0 ? 13 : 11.5,
              fontWeight: e.depth === 0 ? 500 : 400,
              color: P.tx, padding: "3px 16px 3px",
              paddingLeft: indent, cursor: "pointer",
              transition: "background 0.12s, color 0.12s",
              lineHeight: 1.4,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = `${P.ac}08`; e.currentTarget.style.color = P.ac; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = P.tx; }}
          >
            {e.title}
          </div>
        );
      })}
      {/* Back matter links */}
      <div style={{
        borderTop: `1px solid ${P.bd}`, marginTop: 12, paddingTop: 10,
      }}>
        <div
          onClick={() => onScrollTo("endnotes")}
          style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            letterSpacing: 1.5, textTransform: "uppercase", color: P.tm,
            padding: "4px 16px", cursor: "pointer", fontWeight: 500,
            transition: "background 0.12s, color 0.12s",
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = `${P.ac}08`; e.currentTarget.style.color = P.ac; }}
          onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = P.tm; }}
        >
          Notes
        </div>
        <div
          onClick={() => onScrollTo("bibliography")}
          style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            letterSpacing: 1.5, textTransform: "uppercase", color: P.tm,
            padding: "6px 16px", cursor: "pointer", fontWeight: 500,
            transition: "background 0.12s, color 0.12s",
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = `${P.ac}08`; e.currentTarget.style.color = P.ac; }}
          onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = P.tm; }}
        >
          Bibliography
        </div>
      </div>
    </div>
  );
}

// ── Main PrintPreview Overlay ───────────────────────────────

export default function PrintPreview({ project, linkedTerms, sources, citations, noteIndexMap, onClose }) {
  const scrollRef = useRef(null);
  const [showNav, setShowNav] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  const wordCount = useMemo(() => countWords(project), [project]);

  const toggleCollapse = useCallback((id) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const scrollTo = useCallback((id) => {
    const el = document.getElementById(`print-sec-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Escape key closes
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  if (!project) return null;

  return (
    <div
      id="print-preview-root"
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "#E8E4DE", display: "flex", flexDirection: "column",
      }}
    >
      {/* Toolbar */}
      <div className="print-toolbar" style={{
        background: P.dark, color: "#fff", padding: "8px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, zIndex: 10002,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setShowNav(!showNav)}
            style={{
              background: showNav ? "rgba(255,255,255,0.15)" : "none",
              border: "none", color: "#fff", cursor: "pointer", padding: 6,
              borderRadius: 4, display: "flex", alignItems: "center",
              transition: "background 0.15s",
            }}
            title="Toggle navigation"
          >
            <List size={14} />
          </button>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            letterSpacing: 2, textTransform: "uppercase", opacity: 0.7,
          }}>
            Preview — {project.name}
          </div>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
            opacity: 0.4, letterSpacing: 1,
          }}>
            {wordCount.toLocaleString()} words
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => {
              document.body.classList.add("printing-preview");
              setTimeout(() => {
                window.print();
                document.body.classList.remove("printing-preview");
              }, 100);
            }}
            style={{
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff", padding: "5px 14px", borderRadius: 4, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              letterSpacing: 1.5, textTransform: "uppercase",
              display: "flex", alignItems: "center", gap: 6,
              transition: "background 0.15s",
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          >
            <Printer size={12} /> Print
          </button>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "#fff",
              cursor: "pointer", padding: 6, borderRadius: 4,
              display: "flex", alignItems: "center",
              transition: "background 0.15s",
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "none"; }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Navigation panel */}
      <NavPanel project={project} onScrollTo={scrollTo} visible={showNav} />

      {/* Scrollable content */}
      <div ref={scrollRef} className="print-scroll-container" style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        marginLeft: showNav ? 260 : 0, transition: "margin-left 0.25s ease",
      }}>
        <div className="print-content-inner" style={{
          maxWidth: 680, margin: "0 auto", padding: "0 24px",
          background: "#FEFDFB",
          boxShadow: "0 0 40px rgba(44,36,24,0.08)",
          minHeight: "100%",
        }}>
          {/* Cover */}
          <CoverPage project={project} wordCount={wordCount} />

          {/* Table of Contents */}
          <TableOfContents project={project} onScrollTo={scrollTo} />

          {/* Main content */}
          {project.parts?.map((part) => (
            <div key={part.id} style={{ pageBreakBefore: "always" }}>
              {/* Part title page */}
              <div
                id={`print-sec-${part.id}`}
                className="print-part-break"
                style={{ textAlign: "center", padding: "72px 0 48px", pageBreakBefore: "always" }}
              >
                <div style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 32, fontWeight: 300, color: P.tx,
                  letterSpacing: 4, textTransform: "uppercase", lineHeight: 1.2,
                }}>
                  {part.title}
                </div>
                {part.subtitle && (
                  <div style={{
                    fontFamily: "'Spectral', Georgia, serif",
                    fontSize: 13, fontStyle: "italic", color: P.tm, marginTop: 12,
                  }}>
                    {part.subtitle}
                  </div>
                )}
                <div style={{ width: 60, height: 1, background: P.bd, margin: "24px auto 0" }} />
              </div>

              {/* Sections */}
              {part.children?.map((section) => (
                <PrintSection
                  key={section.id}
                  section={section}
                  depth={0}
                  linkedTerms={linkedTerms}
                  collapsedSections={collapsedSections}
                  toggleCollapse={toggleCollapse}
                />
              ))}
            </div>
          ))}

          {/* Bibliography */}
          {/* Endnotes */}
          <Endnotes project={project} sources={sources} />

          {/* Bibliography */}
          <Bibliography sources={sources} />

          {/* Footer */}
          <div style={{
            textAlign: "center", padding: "60px 0 100px", color: P.tf,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
            letterSpacing: 2, textTransform: "uppercase",
            borderTop: `1px solid ${P.bd}`, marginTop: 40,
          }}>
            {project.name} — {wordCount.toLocaleString()} words — Preview generated {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
        </div>
      </div>
    </div>
  );
}
