/**
 * ingest-who-section.cjs
 *
 * Re-imports the "WHO DOES NOT HAVE THE POWER?" section from the updated docx
 * with full citation wiring. Creates:
 *   - Section tree with paragraphs
 *   - Citation objects linked to sources from clean-sources.json
 *
 * Output: src/data/who-section-import.json
 */

const mammoth = require("mammoth");
const path = require("path");
const fs = require("fs");

const DOCX_PATH = path.resolve(__dirname, "../docs/writings/Purpose of School/Purpose of Schools - expanded.docx");
const CLEAN_SOURCES = path.resolve(__dirname, "../docs/clean-sources.json");
const OUTPUT = path.resolve(__dirname, "../src/data/who-section-import.json");

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

// ── Load sources for citation matching ──────────────────────

const sourceData = JSON.parse(fs.readFileSync(CLEAN_SOURCES, "utf-8"));
const sources = sourceData.sources;

// Build lookup: footnote number → source
const footnoteToSource = {};
for (const src of sources) {
  for (const fn of src.footnotes || []) {
    footnoteToSource[fn] = src;
  }
}

// Build lookup for inline citation matching
function matchInlineCitation(text) {
  for (const src of sources) {
    const lastName = src.authors?.[0]?.family;
    if (!lastName) continue;
    if (text.toLowerCase().includes(lastName.toLowerCase()) && text.includes(String(src.year))) {
      // Find the locator from the source's inlineCitations
      const matchingInline = (src.inlineCitations || []).find(ic => {
        const icText = ic.text.toLowerCase();
        return text.toLowerCase().includes(lastName.toLowerCase()) && text.includes(String(src.year));
      });
      return { source: src, locator: matchingInline?.locator || null };
    }
  }
  return null;
}

// Build lookup: footnote number → locator from source data
function getFootnoteLocator(footnoteNum, sourceId) {
  const src = sources.find(s => s.id === sourceId);
  if (!src) return null;
  const loc = (src.locators || []).find(l => l.footnote === footnoteNum);
  return loc ? { type: loc.type, value: loc.value } : null;
}

async function main() {
  console.log("Parsing docx...");

  const result = await mammoth.convertToHtml({ path: DOCX_PATH });
  const html = result.value;

  // ── Parse HTML into elements ──────────────────────────────

  // Use a robust tag-by-tag split that preserves innerHTML including nested tags
  const elements = [];
  const tagSplit = /<(h[1-6]|p|li|blockquote)\b[^>]*>/gi;
  let m;
  const tagPositions = [];
  while ((m = tagSplit.exec(html)) !== null) {
    tagPositions.push({ tag: m[1].toLowerCase(), start: m.index, contentStart: m.index + m[0].length });
  }
  for (let i = 0; i < tagPositions.length; i++) {
    const tp = tagPositions[i];
    const closeTag = `</${tp.tag}>`;
    const closeIdx = html.indexOf(closeTag, tp.contentStart);
    if (closeIdx < 0) continue;
    const innerHTML = html.slice(tp.contentStart, closeIdx);
    const text = stripHtml(innerHTML);
    if (text.length < 2 && !tp.tag.startsWith("h")) continue;
    elements.push({ tag: tp.tag, text, html: innerHTML });
  }

  console.log(`  Total HTML elements: ${elements.length}`);

  // ── Find the WHO DOES NOT HAVE THE POWER section ──────────

  let whoStart = -1;
  let whoEnd = -1;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.tag === "h1" && /who does not have the power\??\s*$/i.test(el.text) && !/original draft/i.test(el.text)) {
      whoStart = i;
    }
    // End at next h1
    if (whoStart >= 0 && i > whoStart && el.tag === "h1") {
      whoEnd = i;
      break;
    }
  }

  if (whoStart < 0) {
    console.error("Could not find 'WHO DOES NOT HAVE THE POWER?' section");
    process.exit(1);
  }
  if (whoEnd < 0) whoEnd = elements.length;

  const whoElements = elements.slice(whoStart, whoEnd);
  console.log(`  WHO section: elements ${whoStart}-${whoEnd} (${whoElements.length} elements)`);

  // ── Build section tree ────────────────────────────────────

  const now = Date.now();
  let idCounter = 0;
  const makeId = (prefix) => `who-new-${prefix}-${++idCounter}`;

  // The section structure:
  // h1: WHO DOES NOT HAVE THE POWER?
  //   paragraphs (intro)
  //   h2: subsections
  //     h3: sub-subsections

  const rootSection = {
    id: "who-no-power",
    title: "Who Does Not Have the Power?",
    spine: "Oppression is what happens when your reality is defined for you.",
    status: "drafting",
    children: [],
    paragraphs: [],
  };

  let currentH2 = null;
  let currentH3 = null;
  const citations = [];

  for (let i = 1; i < whoElements.length; i++) { // skip h1 itself
    const el = whoElements[i];

    if (el.tag === "h2") {
      // Start new h2 section
      currentH3 = null;
      currentH2 = {
        id: makeId(slugify(el.text)),
        title: el.text,
        spine: "",
        status: "drafting",
        children: [],
        paragraphs: [],
      };
      rootSection.children.push(currentH2);
      continue;
    }

    if (el.tag === "h3") {
      // Start new h3 section under current h2
      currentH3 = {
        id: makeId(slugify(el.text)),
        title: el.text,
        spine: "",
        status: "drafting",
        children: [],
        paragraphs: [],
      };
      if (currentH2) {
        currentH2.children.push(currentH3);
      } else {
        // h3 without h2 parent — attach to root
        rootSection.children.push(currentH3);
      }
      continue;
    }

    // Paragraph
    if (el.tag === "p" || el.tag === "li" || el.tag === "blockquote") {
      const target = currentH3 || currentH2 || rootSection;
      const paraId = makeId("p");

      // Detect spine role based on position and content
      let spineRole = "claim";
      if (target.paragraphs.length === 0) spineRole = "setup";
      if (el.text.length < 80) spineRole = "bridge";

      const para = {
        id: paraId,
        text: el.text,
        status: "drafting",
        spineRole,
        linkedTerms: [],
      };

      target.paragraphs.push(para);

      // ── Extract citations from this paragraph ─────────

      // 1. Footnote references: <sup><a href="#footnote-N">[N]</a></sup>
      const footnoteRefs = [];
      let fm;
      const fnHrefRegex = /href="#footnote-(\d+)"/gi;
      let sm;
      while ((sm = fnHrefRegex.exec(el.html)) !== null) {
        const num = parseInt(sm[1]);
        if (!footnoteRefs.includes(num)) footnoteRefs.push(num);
      }

      for (const fnNum of footnoteRefs) {
        const matchedSource = footnoteToSource[fnNum];
        if (matchedSource) {
          const locator = getFootnoteLocator(fnNum, matchedSource.id);
          citations.push({
            id: `cite-who-fn${fnNum}-${++idCounter}`,
            sourceId: matchedSource.id,
            projectId: "purpose-of-schools",
            sectionId: target.id,
            paragraphId: paraId,
            anchorText: "",
            locator: locator || { type: "page", value: "" },
            footnoteText: "",
            inlineRange: null,
            noteIndex: null,
            createdAt: now + idCounter,
            _footnoteNum: fnNum,
          });
        }
      }

      // 2. Inline parenthetical citations: (Author, Year, p. XX)
      const inlineRegex = /\(([A-Z][a-zA-Z'&\s]+,?\s*(?:19|20)\d{2}[^)]*)\)/g;
      while ((fm = inlineRegex.exec(el.text)) !== null) {
        const citeText = fm[1].trim();
        const match = matchInlineCitation(citeText);
        if (match) {
          // Extract page locator from the citation text
          let locator = match.locator;
          if (!locator) {
            const pageMatch = citeText.match(/pp?\.\s*(\d+[\u2013–-]?\d*)/);
            if (pageMatch) locator = { type: "page", value: pageMatch[1] };
          }
          citations.push({
            id: `cite-who-inline-${++idCounter}`,
            sourceId: match.source.id,
            projectId: "purpose-of-schools",
            sectionId: target.id,
            paragraphId: paraId,
            anchorText: fm[0], // the full "(Author, Year, p. X)" text
            locator: locator || { type: "page", value: "" },
            footnoteText: "",
            inlineRange: null,
            noteIndex: null,
            createdAt: now + idCounter,
            _inlineText: citeText,
          });
        }
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────

  function countParas(section) {
    let count = (section.paragraphs || []).length;
    for (const child of section.children || []) count += countParas(child);
    return count;
  }

  function printTree(section, depth = 0) {
    const indent = "  ".repeat(depth);
    const paraCount = (section.paragraphs || []).length;
    const childCount = (section.children || []).length;
    console.log(`${indent}${section.title} — ${paraCount} paragraphs${childCount > 0 ? `, ${childCount} subsections` : ""}`);
    for (const child of section.children || []) printTree(child, depth + 1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("SECTION TREE:");
  console.log("=".repeat(60));
  printTree(rootSection);
  console.log(`\nTotal paragraphs: ${countParas(rootSection)}`);
  console.log(`Total citations created: ${citations.length}`);
  console.log(`  From footnotes: ${citations.filter(c => c._footnoteNum).length}`);
  console.log(`  From inline: ${citations.filter(c => c._inlineText).length}`);

  // ── Write output ──────────────────────────────────────────

  // Clean internal tracking fields from citations
  const cleanCitations = citations.map(c => {
    const { _footnoteNum, _inlineText, ...clean } = c;
    return clean;
  });

  const output = {
    section: rootSection,
    citations: cleanCitations,
    meta: {
      generated: new Date().toISOString(),
      totalParagraphs: countParas(rootSection),
      totalCitations: cleanCitations.length,
      footnotesCited: citations.filter(c => c._footnoteNum).length,
      inlineCited: citations.filter(c => c._inlineText).length,
    },
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`\nWritten to: ${OUTPUT}`);

  // Print citation details
  console.log("\n" + "=".repeat(60));
  console.log("CITATIONS:");
  console.log("=".repeat(60));
  for (const c of citations) {
    const src = sources.find(s => s.id === c.sourceId);
    const label = src ? `${src.authors?.[0]?.family || "?"} (${src.year})` : "?";
    const loc = c.locator?.value ? ` p.${c.locator.value}` : "";
    const type = c._footnoteNum ? `fn${c._footnoteNum}` : `inline`;
    console.log(`  [${type}] ${label}${loc} → ${c.paragraphId}`);
  }
}

main().catch(console.error);
