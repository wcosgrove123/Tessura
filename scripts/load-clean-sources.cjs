/**
 * load-clean-sources.cjs
 *
 * Converts docs/clean-sources.json into src/data/migrated-sources.json
 * in the format that useWorkspaceState.js expects (Tessera Source schema).
 * Also generates src/data/migrated-notes.json for the explanatory footnotes.
 */

const fs = require("fs");
const path = require("path");

const INPUT = path.resolve(__dirname, "../docs/clean-sources.json");
const SOURCES_OUT = path.resolve(__dirname, "../src/data/migrated-sources.json");
const NOTES_OUT = path.resolve(__dirname, "../src/data/migrated-notes.json");

const data = JSON.parse(fs.readFileSync(INPUT, "utf-8"));

// ── Convert sources ─────────────────────────────────────────

const now = Date.now();
const sources = data.sources.map((s, i) => ({
  id: s.id,
  citationKey: s.citationKey,
  type: s.type === "report" ? "book" : s.type === "thesis" ? "book" : s.type, // normalize to our type enum
  authors: s.authors || [],
  title: s.title || "",
  year: String(s.year || ""),
  publisher: s.publisher || null,
  journal: s.journal || null,
  volume: s.volume || null,
  issue: s.issue || null,
  pages: s.pages || null,
  url: s.url || null,
  doi: s.doi || null,
  abstract: "",
  usageNotes: s.notes ? [{ id: `u-${now}-${i}`, text: s.notes, date: "2026-04-02" }] : [],
  tags: [],
  category: s.category || "referenced",
  zoteroKey: null,
  formattedBib: null,
  cslJson: null,
  createdAt: now + i, // ensure unique timestamps
  updatedAt: now + i,
  // Preserve citation linkage data for later wiring
  _footnotes: s.footnotes || [],
  _inlineCitations: s.inlineCitations || [],
  _locators: s.locators || [],
  _needsResolution: s.needsResolution || false,
}));

console.log(`Converted ${sources.length} sources`);
console.log(`  Cited: ${sources.filter(s => s.category === "cited").length}`);
console.log(`  Referenced: ${sources.filter(s => s.category === "referenced").length}`);
console.log(`  Needs resolution: ${sources.filter(s => s._needsResolution).length}`);

// ── Convert explanatory notes ───────────────────────────────

const notes = data.explanatoryNotes.map((n, i) => ({
  id: `n-fn${n.footnote}`,
  category: n.type === "cross_reference" ? "task" : n.type === "draft_note" ? "task" : n.type === "neologism" ? "idea" : "idea",
  text: n.summary,
  tags: [n.type, "footnote", `fn${n.footnote}`],
  linkedProjectId: "purpose-of-schools",
  linkedSectionId: null,
  linkedParagraphId: null,
  inlineRange: null,
  resolved: n.type === "draft_note",
  createdAt: now + i,
  updatedAt: now + i,
  ...(n.linkedSource ? { linkedSourceId: n.linkedSource } : {}),
}));

console.log(`Converted ${notes.length} explanatory footnotes to notes`);

// ── Write output ────────────────────────────────────────────

fs.writeFileSync(SOURCES_OUT, JSON.stringify(sources, null, 2));
fs.writeFileSync(NOTES_OUT, JSON.stringify(notes, null, 2));

console.log(`\nWritten to:`);
console.log(`  ${SOURCES_OUT}`);
console.log(`  ${NOTES_OUT}`);

// ── Print resolution queue ──────────────────────────────────

if (data.resolutionQueue?.length > 0) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("RESOLUTION QUEUE (needs your input):");
  console.log("=".repeat(60));
  for (const item of data.resolutionQueue) {
    console.log(`  [${item.priority.toUpperCase()}] ${item.issue}: ${item.description.slice(0, 100)}...`);
  }
}
