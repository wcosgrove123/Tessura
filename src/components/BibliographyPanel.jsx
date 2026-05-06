import React, { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight, Plus, Edit3, Trash2, ExternalLink, MapPin, X, Check, BookOpen, Settings, Cloud, CloudOff } from "lucide-react";
import { PALETTE as P } from "../data/constants.js";
import { SOURCE_TYPES, LOCATOR_TYPES } from "../data/sources.js";
import { formatBibEntry, formatFootnote, formatSourceShort } from "../lib/chicagoFormatter.js";
import { loadZoteroSettings, saveZoteroSettings, testConnection } from "../lib/zoteroClient.js";

// ── Source Card (Annotated view) ──────────────────────────

function SourceCard({
  source, citationsForSource, noteIndexMap,
  onUpdateSource, onDeleteSource, onNavigateToCitation,
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingAbstract, setEditingAbstract] = useState(false);
  const [abstractText, setAbstractText] = useState(source.abstract || "");
  const [newUsageText, setNewUsageText] = useState("");
  const [showAddUsage, setShowAddUsage] = useState(false);

  const typeInfo = SOURCE_TYPES[source.type] || SOURCE_TYPES.other;
  const citationCount = citationsForSource?.length || 0;
  const authorStr = source.authors?.map((a) => a.family).join(", ") || "Unknown";

  const handleSaveAbstract = () => {
    onUpdateSource(source.id, { abstract: abstractText });
    setEditingAbstract(false);
  };

  const handleAddUsage = () => {
    if (!newUsageText.trim()) return;
    const usage = {
      id: `u-${Date.now()}`,
      text: newUsageText.trim(),
      date: new Date().toISOString().split("T")[0],
    };
    onUpdateSource(source.id, {
      usageNotes: [...(source.usageNotes || []), usage],
    });
    setNewUsageText("");
    setShowAddUsage(false);
  };

  const handleDeleteUsage = (usageId) => {
    onUpdateSource(source.id, {
      usageNotes: (source.usageNotes || []).filter((u) => u.id !== usageId),
    });
  };

  return (
    <div style={{
      background: P.bg, border: `1px solid ${P.bl}`, borderRadius: 8,
      borderLeft: `3px solid ${P.ac}40`, marginBottom: 8,
      transition: "box-shadow 0.15s",
    }}>
      {/* Header — always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 8 }}
      >
        <div style={{ marginTop: 2 }}>
          {expanded ? <ChevronDown size={12} style={{ color: P.tf }} /> : <ChevronRight size={12} style={{ color: P.tf }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{
              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
              color: P.ac, padding: "1px 5px", background: `${P.ac}0A`, borderRadius: 3,
              border: `1px solid ${P.ac}20`,
            }}>
              {typeInfo.icon}
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: P.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {source.title || "Untitled"}
            </span>
          </div>
          <div style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace" }}>
            {authorStr} ({source.year || "n.d."})
            {citationCount > 0 && <span style={{ marginLeft: 8, color: P.ac }}>{citationCount} citation{citationCount > 1 ? "s" : ""}</span>}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0 12px 12px 32px", borderTop: `1px solid ${P.bd}` }}>
          {/* Formatted reference */}
          <div style={{
            fontSize: 11, lineHeight: 1.6, color: P.tm, fontFamily: "'Spectral', serif",
            padding: "10px 0 8px", fontStyle: "italic",
          }}>
            {source.formattedBib
              ? <span dangerouslySetInnerHTML={{ __html: source.formattedBib }} />
              : formatBibEntry(source)
            }
          </div>

          {/* Abstract */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf,
              letterSpacing: 1, textTransform: "uppercase", marginBottom: 4,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              Abstract
              {!editingAbstract && (
                <Edit3 size={10} style={{ cursor: "pointer", opacity: 0.6 }}
                  onClick={(e) => { e.stopPropagation(); setAbstractText(source.abstract || ""); setEditingAbstract(true); }} />
              )}
            </div>
            {editingAbstract ? (
              <div>
                <textarea
                  value={abstractText}
                  onChange={(e) => setAbstractText(e.target.value)}
                  autoFocus
                  placeholder="Summarize this source in your own words..."
                  style={{
                    width: "100%", minHeight: 60, fontSize: 11, lineHeight: 1.5,
                    fontFamily: "'Spectral', serif", color: P.tx, background: P.sf,
                    border: `1px solid ${P.bd}`, borderRadius: 4, padding: 8, outline: "none",
                    resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  <button onClick={handleSaveAbstract} style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 10px", background: P.ac, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>Save</button>
                  <button onClick={() => setEditingAbstract(false)} style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 10px", background: P.sf, color: P.tm, border: `1px solid ${P.bd}`, borderRadius: 3, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, lineHeight: 1.5, color: source.abstract ? P.tx : P.tf, fontFamily: "'Spectral', serif", fontStyle: source.abstract ? "normal" : "italic" }}>
                {source.abstract || "No abstract yet — click edit to add one."}
              </div>
            )}
          </div>

          {/* How I Used This */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf,
              letterSpacing: 1, textTransform: "uppercase", marginBottom: 4,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              How I Used This ({(source.usageNotes || []).length})
              <button onClick={(e) => { e.stopPropagation(); setShowAddUsage(true); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: P.ac, padding: 2, display: "flex", alignItems: "center" }}>
                <Plus size={10} />
              </button>
            </div>
            {(source.usageNotes || []).map((usage) => (
              <div key={usage.id} style={{
                fontSize: 11, lineHeight: 1.5, color: P.tx, fontFamily: "'Spectral', serif",
                padding: "6px 8px", background: P.sf, borderRadius: 4, marginBottom: 4,
                display: "flex", alignItems: "flex-start", gap: 6,
              }}>
                <div style={{ flex: 1 }}>
                  {usage.text}
                  <div style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{usage.date}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteUsage(usage.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#943D3D", padding: 4, opacity: 0.5, flexShrink: 0 }}>
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
            {showAddUsage && (
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <input
                  value={newUsageText}
                  onChange={(e) => setNewUsageText(e.target.value)}
                  placeholder="How did you use this source?"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddUsage(); if (e.key === "Escape") setShowAddUsage(false); }}
                  style={{
                    flex: 1, height: 28, fontSize: 11, fontFamily: "'Spectral', serif",
                    background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 4,
                    padding: "0 8px", color: P.tx, outline: "none",
                  }}
                />
                <button onClick={handleAddUsage} style={{ fontSize: 10, padding: "4px 8px", background: P.ac, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
                  <Check size={10} />
                </button>
              </div>
            )}
          </div>

          {/* Citation locations */}
          {citationsForSource?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                Cited In
              </div>
              {citationsForSource.map((cite) => (
                <div
                  key={cite.id}
                  onClick={(e) => { e.stopPropagation(); onNavigateToCitation(cite.projectId, cite.sectionId); }}
                  style={{
                    fontSize: 10, color: P.tm, fontFamily: "'IBM Plex Mono', monospace",
                    padding: "4px 8px", borderRadius: 4, cursor: "pointer", marginBottom: 2,
                    display: "flex", alignItems: "center", gap: 4,
                    transition: "background 0.15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = P.sf)}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <MapPin size={10} style={{ color: P.ac, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>
                    {cite.locator?.value ? `${LOCATOR_TYPES[cite.locator.type]?.abbrev || ""}${cite.locator.value}` : ""}
                    {cite.anchorText ? ` — "${cite.anchorText.slice(0, 40)}${cite.anchorText.length > 40 ? "..." : ""}"` : ""}
                  </span>
                  <span style={{ color: P.ac, fontSize: 10 }}>#{noteIndexMap[cite.id] || "?"}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {source.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 8 }}>
              {source.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 6px",
                  borderRadius: 10, background: `${P.ac}08`, color: P.ac,
                  border: `1px solid ${P.ac}15`,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 4, marginTop: 8, borderTop: `1px solid ${P.bd}`, paddingTop: 8 }}>
            <button onClick={(e) => { e.stopPropagation(); onDeleteSource(source.id); }}
              style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 8px", background: "none", color: "#943D3D", border: `1px solid #943D3D30`, borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              <Trash2 size={10} /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Bibliography Panel ────────────────────────────────

export default function BibliographyPanel({
  sources, citations, noteIndexMap,
  onUpdateSource, onDeleteSource, onDeleteCitation,
  onSelectSection, activeProjectId,
}) {
  const [subView, setSubView] = useState("annotated"); // "annotated" | "cited" | "referenced"
  const [sortBy, setSortBy] = useState("author"); // "author" | "year" | "recent" | "citations"
  const [filterType, setFilterType] = useState("all");
  const [showZoteroSettings, setShowZoteroSettings] = useState(false);
  const [zoteroUserId, setZoteroUserId] = useState(() => loadZoteroSettings().userId || "");
  const [zoteroApiKey, setZoteroApiKey] = useState(() => loadZoteroSettings().apiKey || "");
  const [zoteroStatus, setZoteroStatus] = useState(() => loadZoteroSettings().connected ? "connected" : "disconnected");
  const [zoteroTesting, setZoteroTesting] = useState(false);

  // Group citations by source
  const citationsBySource = useMemo(() => {
    const map = {};
    for (const c of citations) {
      if (!map[c.sourceId]) map[c.sourceId] = [];
      map[c.sourceId].push(c);
    }
    return map;
  }, [citations]);

  // Filter sources for each view
  const citedSources = useMemo(() =>
    sources.filter((s) => citationsBySource[s.id]?.length > 0),
    [sources, citationsBySource]
  );

  // Sort sources
  const sortSources = useCallback((list) => {
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "year": return (b.year || 0) - (a.year || 0);
        case "recent": return (b.updatedAt || 0) - (a.updatedAt || 0);
        case "citations": return (citationsBySource[b.id]?.length || 0) - (citationsBySource[a.id]?.length || 0);
        default: // author
          return (a.authors?.[0]?.family || "zzz").localeCompare(b.authors?.[0]?.family || "zzz");
      }
    });
  }, [sortBy, citationsBySource]);

  // Filter by type
  const filterSources = useCallback((list) => {
    if (filterType === "all") return list;
    return list.filter((s) => s.type === filterType);
  }, [filterType]);

  const displaySources = useMemo(() => {
    const base = subView === "cited" ? citedSources : sources;
    return sortSources(filterSources(base));
  }, [subView, sources, citedSources, sortSources, filterSources]);

  const handleTestZotero = async () => {
    setZoteroTesting(true);
    const result = await testConnection(zoteroUserId, zoteroApiKey);
    if (result.ok) {
      setZoteroStatus("connected");
      saveZoteroSettings({ userId: zoteroUserId, apiKey: zoteroApiKey, connected: true });
    } else {
      setZoteroStatus("error");
    }
    setZoteroTesting(false);
  };

  return (
    <div style={{ padding: 14 }}>
      {/* Zotero connection badge */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10, padding: "6px 8px", background: P.sf, borderRadius: 5,
        border: `1px solid ${P.bd}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {zoteroStatus === "connected" ? (
            <Cloud size={12} style={{ color: "#2D6B5A" }} />
          ) : (
            <CloudOff size={12} style={{ color: P.tf }} />
          )}
          <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: zoteroStatus === "connected" ? "#2D6B5A" : P.tf }}>
            {zoteroStatus === "connected" ? "Zotero Connected" : "Zotero Not Connected"}
          </span>
        </div>
        <button onClick={() => setShowZoteroSettings(!showZoteroSettings)}
          style={{ background: "none", border: "none", cursor: "pointer", color: P.tf, padding: 4, display: "flex", alignItems: "center" }}>
          <Settings size={12} />
        </button>
      </div>

      {/* Zotero settings form */}
      {showZoteroSettings && (
        <div style={{
          padding: "10px 12px", marginBottom: 10, background: P.bg,
          border: `1px solid ${P.bd}`, borderRadius: 6,
        }}>
          <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.ac, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            Zotero API Settings
          </div>
          <input
            value={zoteroUserId}
            onChange={(e) => setZoteroUserId(e.target.value)}
            placeholder="User ID (from zotero.org/settings/keys)"
            style={{
              width: "100%", height: 28, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
              background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 4,
              padding: "0 8px", color: P.tx, outline: "none", marginBottom: 4,
            }}
          />
          <input
            value={zoteroApiKey}
            onChange={(e) => setZoteroApiKey(e.target.value)}
            placeholder="API Key"
            type="password"
            style={{
              width: "100%", height: 28, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
              background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 4,
              padding: "0 8px", color: P.tx, outline: "none", marginBottom: 6,
            }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={handleTestZotero} disabled={!zoteroUserId || !zoteroApiKey || zoteroTesting}
              style={{
                fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 10px",
                background: P.ac, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer",
                opacity: !zoteroUserId || !zoteroApiKey || zoteroTesting ? 0.5 : 1,
              }}>
              {zoteroTesting ? "Testing..." : "Connect"}
            </button>
            {zoteroStatus === "connected" && (
              <button onClick={() => {
                saveZoteroSettings({ userId: "", apiKey: "", connected: false });
                setZoteroUserId(""); setZoteroApiKey(""); setZoteroStatus("disconnected");
              }}
                style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 10px", background: P.sf, color: P.tm, border: `1px solid ${P.bd}`, borderRadius: 3, cursor: "pointer" }}>
                Disconnect
              </button>
            )}
          </div>
          {zoteroStatus === "error" && (
            <div style={{ fontSize: 10, color: "#943D3D", marginTop: 4 }}>Connection failed. Check your User ID and API key.</div>
          )}
        </div>
      )}

      {/* Sub-view toggle */}
      <div style={{ display: "flex", gap: 0, border: `1px solid ${P.bd}`, borderRadius: 5, overflow: "hidden", marginBottom: 12 }}>
        {[
          { key: "annotated", label: "Annotated" },
          { key: "cited", label: "Works Cited" },
          { key: "referenced", label: "All Sources" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubView(key)}
            style={{
              flex: 1, padding: "5px 4px", fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5,
              background: subView === key ? `${P.ac}12` : "transparent",
              color: subView === key ? P.ac : P.tf,
              border: "none", cursor: "pointer", fontWeight: subView === key ? 600 : 400,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sort & filter bar (annotated view only) */}
      {subView === "annotated" && (
        <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{
              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 6px",
              borderRadius: 4, background: P.sf, color: P.tm, border: `1px solid ${P.bd}`,
              cursor: "pointer", outline: "none",
            }}>
            <option value="author">By Author</option>
            <option value="year">By Year</option>
            <option value="recent">Recently Added</option>
            <option value="citations">Most Cited</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            style={{
              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", padding: "3px 6px",
              borderRadius: 4, background: P.sf, color: P.tm, border: `1px solid ${P.bd}`,
              cursor: "pointer", outline: "none",
            }}>
            <option value="all">All Types</option>
            {Object.entries(SOURCE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf, alignSelf: "center" }}>
            {displaySources.length} source{displaySources.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Content */}
      {subView === "annotated" ? (
        // Annotated Bibliography — collapsible cards
        <div>
          {displaySources.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: P.tf }}>
              <BookOpen size={24} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div style={{ fontSize: 12, fontFamily: "'Spectral', serif" }}>No sources yet</div>
              <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>
                Highlight text in the editor and click "Cite" to add sources
              </div>
            </div>
          ) : (
            displaySources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                citationsForSource={citationsBySource[source.id] || []}
                noteIndexMap={noteIndexMap}
                onUpdateSource={onUpdateSource}
                onDeleteSource={onDeleteSource}
                onNavigateToCitation={onSelectSection}
              />
            ))
          )}
        </div>
      ) : (
        // Works Cited / All Sources — formatted bibliography entries
        <div>
          {subView === "cited" && (
            <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: P.tf, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
              {displaySources.length} source{displaySources.length !== 1 ? "s" : ""} cited
            </div>
          )}
          {displaySources.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 16px", color: P.tf, fontSize: 11, fontStyle: "italic" }}>
              {subView === "cited" ? "No citations yet — cite sources in the editor to build your Works Cited." : "No sources added."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sortSources(displaySources).map((source) => (
                <div key={source.id} style={{
                  fontSize: 12, lineHeight: 1.7, color: P.tx, fontFamily: "'Spectral', serif",
                  paddingLeft: 24, textIndent: -24,
                }}>
                  {source.formattedBib
                    ? <span dangerouslySetInnerHTML={{ __html: source.formattedBib }} />
                    : formatBibEntry(source)
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
