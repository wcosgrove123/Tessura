/**
 * link-citations.cjs — Cross-reference parenthetical citations in paragraph text
 * with sources in migrated-sources.json, and generate linked Citation objects.
 *
 * Usage:
 *   node scripts/link-citations.cjs              # Dry-run: report only
 *   node scripts/link-citations.cjs --apply       # Write citations to src/data/citations.js
 */

const fs = require("fs");
const path = require("path");

// ── Load data ────────────────────────────────────────────────

const projectsSrc = fs.readFileSync(
  path.join(__dirname, "../src/data/projects.js"),
  "utf8"
);
const arrStart = projectsSrc.indexOf("[", projectsSrc.indexOf("const PROJECTS = ["));
const arrEnd = projectsSrc.lastIndexOf("];");
const projects = JSON.parse(projectsSrc.slice(arrStart, arrEnd + 1));

const sources = require("../src/data/migrated-sources.json");

// ── Collect all paragraphs ───────────────────────────────────

function collectParas(node, projectId) {
  const results = [];
  for (const p of node.paragraphs || []) {
    results.push({
      id: p.id,
      text: p.text,
      sectionId: node.id,
      projectId,
    });
  }
  for (const child of node.children || []) {
    results.push(...collectParas(child, projectId));
  }
  return results;
}

const allParas = [];
for (const proj of projects) {
  for (const part of proj.parts || []) {
    for (const section of part.children || []) {
      allParas.push(...collectParas(section, proj.id));
    }
  }
}

// ── Build source lookup ──────────────────────────────────────

// Manual overrides for edge cases the regex can't handle
const SOURCE_OVERRIDES = {
  // Typo in original doc — "Standford" should match "Stanford"
  "Standford|2020": "Stanford|2020",
  // Sullivan 2023 in text should match Sullivan 2011 (same author, likely wrong year in text)
  "Sullivan|2023": "Sullivan|2011",
};

// Build a lookup map: "AuthorLastName|Year" → source
const sourceLookup = new Map();
for (const s of sources) {
  if (!s.authors?.length && !s.citationKey) continue;

  // Index by each author's family name + year
  for (const a of s.authors || []) {
    const key = `${a.family}|${s.year}`;
    if (!sourceLookup.has(key)) sourceLookup.set(key, s);
  }

  // Also index by citationKey patterns
  if (s.citationKey) {
    // e.g. "stanford2020" → "Stanford|2020"
    const keyMatch = s.citationKey.match(/^([a-z]+)(\d{4})$/);
    if (keyMatch) {
      const capName =
        keyMatch[1].charAt(0).toUpperCase() + keyMatch[1].slice(1);
      const altKey = `${capName}|${keyMatch[2]}`;
      if (!sourceLookup.has(altKey)) sourceLookup.set(altKey, s);
    }
  }

  // Special: multi-author sources — index by first author
  if (s.authors?.length > 1) {
    const key = `${s.authors[0].family}|${s.year}`;
    if (!sourceLookup.has(key)) sourceLookup.set(key, s);
  }
}

// Special: CRSE (2020) — it's an org name, index by citationKey
for (const s of sources) {
  if (s.citationKey === "crse2020" || s.title?.includes("CRSE")) {
    sourceLookup.set("CRSE|2020", s);
  }
}

// Special: EdReports — org name
for (const s of sources) {
  if (
    s.citationKey?.includes("edreports") ||
    s.title?.includes("EdReports")
  ) {
    sourceLookup.set("EdReports|2024", s);
  }
}

function findSource(author, year) {
  const key = `${author}|${year}`;

  // Check overrides first
  const overrideKey = SOURCE_OVERRIDES[key];
  if (overrideKey) {
    const [oAuthor, oYear] = overrideKey.split("|");
    return { source: sourceLookup.get(overrideKey) || null, override: `${author} (${year}) → ${oAuthor} (${oYear})` };
  }

  // Direct lookup
  const direct = sourceLookup.get(key);
  if (direct) return { source: direct, override: null };

  // Handle "et al." — strip it and try first author
  const stripped = author.replace(/\s*et al\.?\s*$/, "").trim();
  if (stripped !== author) {
    const strippedKey = `${stripped}|${year}`;
    const found = sourceLookup.get(strippedKey);
    if (found) return { source: found, override: null };
  }

  // Handle multi-author: "Howard & Rodriguez-Minkoff" → try "Howard"
  if (author.includes("&")) {
    const firstAuthor = author.split("&")[0].trim();
    const firstKey = `${firstAuthor}|${year}`;
    const found = sourceLookup.get(firstKey);
    if (found) return { source: found, override: null };
  }

  return { source: null, override: null };
}

// ── Parse citations from paragraph text ──────────────────────

// Pattern for parenthetical citations, including compound ones with semicolons
// We match the full parenthetical group, then split on semicolons inside
const parenGroupPattern = /\(([^)]+)\)/g;
const singleCitePattern = /([A-Z][a-zA-Zé\-\s&.]+?),\s*(\d{4})([^;]*)/g;

const allCitations = [];
const missing = [];
let noteIndex = 1; // global footnote counter

for (const para of allParas) {
  if (!para.text) continue;

  // Collect all cite instances
  const citeInstances = [];

  // Find all parenthetical groups
  const groups = [...para.text.matchAll(parenGroupPattern)];
  for (const group of groups) {
    const inner = group[1];
    const groupStart = group.index;

    // Try to parse citation(s) from inside the parens
    const cites = [...inner.matchAll(singleCitePattern)];
    if (cites.length === 0) continue;

    // Verify at least one looks like a real citation (has a 4-digit year)
    const hasYear = cites.some((c) => /^\d{4}$/.test(c[2]));
    if (!hasYear) continue;

    for (const c of cites) {
      const author = c[1].trim();
      const year = c[2];
      const extra = c[3].trim();

      // Use full parenthetical group as anchorText for single-citation parens,
      // or the individual sub-cite for compound citations
      const anchorText = cites.length === 1 ? group[0] : `(${c[0].trim()})`;

      citeInstances.push({
        author,
        year,
        extra,
        fullMatch: anchorText,
        index: groupStart,
      });
    }
  }

  for (const ci of citeInstances) {
    const { author, year, extra, fullMatch } = ci;

    // Parse locator
    let locatorType = "page";
    let locatorValue = "";
    if (extra) {
      const pageMatch = extra.match(/,\s*pp?\.\s*(.+)/);
      if (pageMatch) locatorValue = pageMatch[1].trim();
    }

    const { source, override } = findSource(author, year);

    if (!source) {
      missing.push({
        author,
        year,
        fullMatch,
        paraId: para.id,
      });
      continue;
    }

    const citation = {
      id: `cite-${para.id}-${ci.index}`,
      sourceId: source.id,
      projectId: para.projectId,
      sectionId: para.sectionId,
      paragraphId: para.id,
      anchorText: fullMatch,
      locator: { type: locatorType, value: locatorValue },
      footnoteText: "",
      inlineRange: null, // Will be set when text is loaded into TipTap
      noteIndex: noteIndex,
      createdAt: Date.now(),
      override: override || undefined,
    };

    allCitations.push(citation);
    noteIndex++;
  }
}

// ── Report ───────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("  CITATION LINKING REPORT");
console.log("═══════════════════════════════════════════════════════════");
console.log("");
console.log(`  Total paragraphs scanned:  ${allParas.length}`);
console.log(`  Total citations found:     ${allCitations.length + missing.length}`);
console.log(`  Successfully linked:       ${allCitations.length}`);
console.log(`  Missing sources:           ${missing.length}`);
console.log("");

if (allCitations.length > 0) {
  console.log("── LINKED CITATIONS ────────────────────────────────────────");
  console.log("");
  for (const c of allCitations) {
    const src = sources.find((s) => s.id === c.sourceId);
    const authorStr =
      src?.authors?.map((a) => a.family).join(" & ") || "???";
    const override = c.override ? ` [REMAPPED: ${c.override}]` : "";
    console.log(
      `  [${c.noteIndex}] ${c.anchorText}`
    );
    console.log(
      `       → ${authorStr}, "${src?.title?.slice(0, 50)}" (${src?.year})`
    );
    console.log(
      `       → para: ${c.paragraphId}${override}`
    );
    if (c.locator.value) {
      console.log(`       → locator: ${c.locator.type} ${c.locator.value}`);
    }
    console.log("");
  }
}

if (missing.length > 0) {
  console.log("── MISSING SOURCES (not linked) ────────────────────────────");
  console.log("");
  for (const m of missing) {
    console.log(`  ✗ ${m.fullMatch}`);
    console.log(`       para: ${m.paraId}`);
    console.log(`       → No source found for: ${m.author} (${m.year})`);
    console.log("");
  }
}

// ── Apply mode ───────────────────────────────────────────────

const applyMode = process.argv.includes("--apply");

if (applyMode) {
  // Strip override field before writing
  const cleanCitations = allCitations.map(({ override, ...rest }) => rest);

  const output = `/**
 * Citation data — auto-generated by scripts/link-citations.cjs
 * Generated: ${new Date().toISOString()}
 *
 * ${cleanCitations.length} citations linked from ${new Set(cleanCitations.map((c) => c.paragraphId)).size} paragraphs
 * to ${new Set(cleanCitations.map((c) => c.sourceId)).size} unique sources.
 */

/**
 * Create a new Citation with defaults.
 */
export function createCitation(data = {}) {
  const now = Date.now();
  return {
    id: \`cite-\${now}\`,
    sourceId: null,
    projectId: null,
    sectionId: null,
    paragraphId: null,
    anchorText: "",
    locator: { type: "page", value: "" },
    footnoteText: "",
    inlineRange: null,
    noteIndex: null,
    createdAt: now,
    ...data,
  };
}

export const DEFAULT_CITATIONS = ${JSON.stringify(cleanCitations, null, 2)};
`;

  const outPath = path.join(__dirname, "../src/data/citations.js");
  fs.writeFileSync(outPath, output);
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  ✓ Wrote ${cleanCitations.length} citations to src/data/citations.js`);
  console.log("═══════════════════════════════════════════════════════════");
} else {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  DRY RUN — no files modified.");
  console.log("  Run with --apply to write citations.js");
  console.log("═══════════════════════════════════════════════════════════");
}
