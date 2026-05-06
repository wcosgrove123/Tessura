import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Search, Plus, BookOpen, ChevronRight, ChevronLeft, X, Check } from "lucide-react";
import { PALETTE as P } from "../data/constants.js";
import { SOURCE_TYPES, SOURCE_TYPE_VALUES, LOCATOR_TYPES, createSource, generateCitationKey } from "../data/sources.js";
import { formatSourceShort } from "../lib/chicagoFormatter.js";

/**
 * Multi-step citation popover:
 * Step 1: Source selection (search existing + "New Source")
 * Step 2: Locator + footnote (page/chapter + optional note)
 */
export default function CitationPopover({
  position, sources, onSave, onCancel,
  zoteroSearch, // optional async (query) => zoteroResults[]
}) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // New source quick-add fields
  const [newAuthorFamily, setNewAuthorFamily] = useState("");
  const [newAuthorGiven, setNewAuthorGiven] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newType, setNewType] = useState("book");

  // Step 2: Locator fields
  const [locatorType, setLocatorType] = useState("page");
  const [locatorValue, setLocatorValue] = useState("");
  const [footnoteText, setFootnoteText] = useState("");
  const [showFootnote, setShowFootnote] = useState(false);

  // Zotero results
  const [zoteroResults, setZoteroResults] = useState([]);
  const [zoteroLoading, setZoteroLoading] = useState(false);

  const searchRef = useRef(null);
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Filter local sources by search query
  const filteredSources = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return sources.slice(0, 8);
    const q = searchQuery.toLowerCase();
    return sources.filter((s) =>
      s.title?.toLowerCase().includes(q) ||
      s.citationKey?.toLowerCase().includes(q) ||
      s.authors?.some((a) => a.family?.toLowerCase().includes(q) || a.given?.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [sources, searchQuery]);

  // Zotero search (debounced)
  useEffect(() => {
    if (!zoteroSearch || searchQuery.length < 2) { setZoteroResults([]); return; }
    const timer = setTimeout(async () => {
      setZoteroLoading(true);
      try {
        const results = await zoteroSearch(searchQuery);
        setZoteroResults(results || []);
      } catch { setZoteroResults([]); }
      setZoteroLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, zoteroSearch]);

  const handleSelectSource = useCallback((source) => {
    setSelectedSource(source);
    setStep(2);
  }, []);

  const handleCreateAndSelect = useCallback(() => {
    const newSource = createSource({
      type: newType,
      authors: newAuthorFamily ? [{ family: newAuthorFamily, given: newAuthorGiven }] : [],
      title: newTitle,
      year: newYear,
      citationKey: generateCitationKey([{ family: newAuthorFamily }], newYear),
    });
    // Mark as new so parent knows to call addSource
    newSource._isNew = true;
    setSelectedSource(newSource);
    setStep(2);
  }, [newType, newAuthorFamily, newAuthorGiven, newTitle, newYear]);

  const handleInsert = useCallback(() => {
    if (!selectedSource) return;
    onSave({
      source: selectedSource,
      locator: { type: locatorType, value: locatorValue },
      footnoteText: footnoteText.trim(),
    });
  }, [selectedSource, locatorType, locatorValue, footnoteText, onSave]);

  // Handle keyboard
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && step === 2 && !showFootnote) {
      e.preventDefault();
      handleInsert();
    }
  }, [onCancel, step, showFootnote, handleInsert]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
      style={{
        position: "absolute", left: Math.min(position.x, 200), top: position.y + 28,
        background: P.bg, border: `1px solid ${P.bd}`, borderRadius: 10,
        boxShadow: "0 8px 32px rgba(44,36,24,0.15)", padding: 0,
        zIndex: 55, width: 340, maxHeight: 440, overflow: "hidden",
        animation: "fadeSlideIn 180ms ease-out",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "10px 14px", borderBottom: `1px solid ${P.bd}`,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {step === 2 && (
          <button onClick={() => setStep(1)} style={{
            background: "none", border: "none", cursor: "pointer", color: P.tf,
            padding: 4, display: "flex", alignItems: "center",
          }}>
            <ChevronLeft size={14} />
          </button>
        )}
        <BookOpen size={12} style={{ color: P.ac }} />
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1.5,
          textTransform: "uppercase", color: P.ac, fontWeight: 500,
        }}>
          {step === 1 ? "Select Source" : "Citation Details"}
        </span>
        <button onClick={onCancel} style={{
          marginLeft: "auto", background: "none", border: "none",
          cursor: "pointer", color: P.tf, padding: 4,
          display: "flex", alignItems: "center",
        }}>
          <X size={14} />
        </button>
      </div>

      {step === 1 && (
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {/* Search bar */}
          <div style={{ padding: "10px 14px 6px", position: "relative" }}>
            <Search size={12} style={{ position: "absolute", left: 24, top: 19, color: P.tf }} />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by author, title..."
              style={{
                width: "100%", height: 32, background: P.sf, border: `1px solid ${P.bd}`,
                borderRadius: 5, padding: "0 12px 0 30px", color: P.tx, fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace", outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = P.ac)}
              onBlur={(e) => (e.target.style.borderColor = P.bd)}
            />
          </div>

          {/* Local sources */}
          {filteredSources.length > 0 && (
            <div style={{ padding: "4px 0" }}>
              {filteredSources.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSource(s)}
                  style={{
                    padding: "8px 14px", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = P.sf)}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                      color: P.ac, fontWeight: 600, width: 18, textAlign: "center",
                    }}>
                      {SOURCE_TYPES[s.type]?.icon || "?"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: P.tx, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.title || "Untitled"}
                      </div>
                      <div style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {s.authors?.map((a) => a.family).join(", ") || "Unknown"} ({s.year || "n.d."})
                      </div>
                    </div>
                    <ChevronRight size={12} style={{ color: P.tf }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Zotero results */}
          {zoteroResults.length > 0 && (
            <div style={{ borderTop: `1px solid ${P.bd}` }}>
              <div style={{ padding: "6px 14px", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf, letterSpacing: 1, textTransform: "uppercase" }}>
                Zotero Library
              </div>
              {zoteroResults.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSource(s)}
                  style={{ padding: "8px 14px", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = P.sf)}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: "#2D6B5A" }}>&#9729;</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: P.tx, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.title || "Untitled"}
                      </div>
                      <div style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {s.authors?.map((a) => a.family).join(", ")} ({s.year || "n.d."})
                      </div>
                    </div>
                    <ChevronRight size={12} style={{ color: P.tf }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {zoteroLoading && (
            <div style={{ padding: "8px 14px", fontSize: 10, color: P.tf, fontStyle: "italic" }}>
              Searching Zotero...
            </div>
          )}

          {/* Empty state */}
          {filteredSources.length === 0 && !zoteroLoading && searchQuery.length > 0 && (
            <div style={{ padding: "16px 14px", textAlign: "center", color: P.tf, fontSize: 11 }}>
              No sources found for "{searchQuery}"
            </div>
          )}

          {/* New source quick-add */}
          <div style={{ borderTop: `1px solid ${P.bd}`, padding: "8px 14px" }}>
            {!showNewForm ? (
              <button
                onClick={() => setShowNewForm(true)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  padding: "8px", borderRadius: 5, cursor: "pointer",
                  border: `1.5px dashed ${P.bd}`, background: "transparent",
                  color: P.tf, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                  transition: "all 0.15s",
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = P.ac; e.currentTarget.style.color = P.ac; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = P.bd; e.currentTarget.style.color = P.tf; }}
              >
                <Plus size={12} /> New Source
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.ac, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
                  Quick Add Source
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    value={newAuthorFamily}
                    onChange={(e) => setNewAuthorFamily(e.target.value)}
                    placeholder="Last name"
                    autoFocus
                    style={{
                      flex: 1, height: 28, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                      background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 4,
                      padding: "0 8px", color: P.tx, outline: "none",
                    }}
                  />
                  <input
                    value={newAuthorGiven}
                    onChange={(e) => setNewAuthorGiven(e.target.value)}
                    placeholder="First"
                    style={{
                      width: 80, height: 28, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                      background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 4,
                      padding: "0 8px", color: P.tx, outline: "none",
                    }}
                  />
                </div>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Title"
                  style={{
                    width: "100%", height: 28, fontSize: 11, fontFamily: "'Spectral', serif",
                    background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 4,
                    padding: "0 8px", color: P.tx, outline: "none",
                  }}
                />
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    placeholder="Year"
                    style={{
                      width: 70, height: 28, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                      background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 4,
                      padding: "0 8px", color: P.tx, outline: "none",
                    }}
                  />
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    style={{
                      flex: 1, height: 28, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                      background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 4,
                      padding: "0 6px", color: P.tm, outline: "none", cursor: "pointer",
                    }}
                  >
                    {SOURCE_TYPE_VALUES.map((t) => (
                      <option key={t} value={t}>{SOURCE_TYPES[t].label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                  <button
                    onClick={handleCreateAndSelect}
                    disabled={!newTitle && !newAuthorFamily}
                    style={{
                      flex: 1, padding: "6px", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                      background: P.ac, color: "#fff", border: "none", borderRadius: 4,
                      cursor: newTitle || newAuthorFamily ? "pointer" : "default",
                      opacity: newTitle || newAuthorFamily ? 1 : 0.5,
                    }}
                  >
                    <Check size={10} style={{ verticalAlign: -1, marginRight: 3 }} />
                    Create & Cite
                  </button>
                  <button
                    onClick={() => setShowNewForm(false)}
                    style={{
                      padding: "6px 12px", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                      background: P.sf, color: P.tm, border: `1px solid ${P.bd}`, borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && selectedSource && (
        <div style={{ padding: "12px 14px" }}>
          {/* Selected source card */}
          <div style={{
            padding: "10px 12px", background: P.sf, borderRadius: 6,
            border: `1px solid ${P.bd}`, marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: P.tx, marginBottom: 2 }}>
              {selectedSource.title || "Untitled"}
            </div>
            <div style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace" }}>
              {selectedSource.authors?.map((a) => `${a.given || ""} ${a.family || ""}`.trim()).join(", ")} ({selectedSource.year || "n.d."})
            </div>
          </div>

          {/* Locator */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
              Location
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <select
                value={locatorType}
                onChange={(e) => setLocatorType(e.target.value)}
                style={{
                  width: 100, height: 30, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                  background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 4,
                  padding: "0 6px", color: P.tm, outline: "none", cursor: "pointer",
                }}
              >
                {Object.entries(LOCATOR_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <input
                value={locatorValue}
                onChange={(e) => setLocatorValue(e.target.value)}
                placeholder={locatorType === "page" ? "e.g., 25" : locatorType === "timestamp" ? "e.g., 1:23:45" : "e.g., 3"}
                autoFocus
                style={{
                  flex: 1, height: 30, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
                  background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 4,
                  padding: "0 8px", color: P.tx, outline: "none",
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && !showFootnote) { e.preventDefault(); handleInsert(); } }}
              />
            </div>
          </div>

          {/* Optional footnote */}
          <div style={{ marginBottom: 12 }}>
            {!showFootnote ? (
              <button
                onClick={() => setShowFootnote(true)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: P.tf, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                  padding: "2px 0", display: "flex", alignItems: "center", gap: 4,
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = P.ac)}
                onMouseOut={(e) => (e.currentTarget.style.color = P.tf)}
              >
                <Plus size={10} /> Add footnote explanation
              </button>
            ) : (
              <div>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                  Footnote
                </div>
                <textarea
                  value={footnoteText}
                  onChange={(e) => setFootnoteText(e.target.value)}
                  placeholder="How/why you used this source here..."
                  autoFocus
                  style={{
                    width: "100%", minHeight: 60, fontSize: 12, lineHeight: 1.5,
                    fontFamily: "'Spectral', serif", color: P.tx, background: P.sf,
                    border: `1px solid ${P.bd}`, borderRadius: 4, padding: 8, outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>
            )}
          </div>

          {/* Insert button */}
          <button
            onClick={handleInsert}
            style={{
              width: "100%", padding: "8px", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: 0.5, fontWeight: 500,
              background: P.ac, color: "#fff", border: "none", borderRadius: 5,
              cursor: "pointer", transition: "opacity 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = 0.85)}
            onMouseOut={(e) => (e.currentTarget.style.opacity = 1)}
          >
            Insert Citation
          </button>
        </div>
      )}
    </div>
  );
}
