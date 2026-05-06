/**
 * migrate-citations.cjs
 *
 * One-time migration: Parse all citation sources from the docx
 * (footnotes, inline parenthetical, bibliography) into a unified
 * Sources[] array in Chicago Notes-Bibliography format.
 *
 * Outputs:
 *   1. A review JSON file: docs/citation-migration-review.json
 *   2. A human-readable report: docs/citation-migration-review.md
 *   3. The final sources data: src/data/migrated-sources.json
 *
 * After review, the migrated-sources.json can be loaded into the app.
 */

const mammoth = require("mammoth");
const path = require("path");
const fs = require("fs");

const DOCX_PATH = path.resolve(__dirname, "../docs/writings/Purpose of School/Purpose of Schools - expanded.docx");
const REVIEW_JSON = path.resolve(__dirname, "../docs/citation-migration-review.json");
const REVIEW_MD = path.resolve(__dirname, "../docs/citation-migration-review.md");
const SOURCES_OUT = path.resolve(__dirname, "../src/data/migrated-sources.json");

// ── Helpers ──────────────────────────────────────────────────

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
}

function normalizeAuthor(name) {
  if (!name) return "";
  return name.replace(/[.,]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function generateKey(authors, year) {
  const last = authors?.[0]?.family || "unknown";
  const y = year || "nd";
  return (last.toLowerCase().replace(/[^a-z]/g, "") + y).slice(0, 30);
}

// ── Parse Chicago bibliography entry ────────────────────────

function parseBibEntry(text) {
  const result = {
    type: "book",
    authors: [],
    title: "",
    year: "",
    publisher: null,
    journal: null,
    volume: null,
    issue: null,
    pages: null,
    url: null,
    doi: null,
  };

  const t = text.trim();
  if (!t) return result;

  // Extract year
  const yearMatch = t.match(/\b(1[5-9]\d{2}|20[0-2]\d)\b/);
  if (yearMatch) result.year = yearMatch[1];

  // Extract URL
  const urlMatch = t.match(/(https?:\/\/[^\s,."]+)/);
  if (urlMatch) result.url = urlMatch[1];

  // Extract DOI
  const doiMatch = t.match(/(10\.\d{4,}\/[^\s,]+)/);
  if (doiMatch) result.doi = doiMatch[1];

  // Split on first period to get author vs rest
  const firstPeriod = t.indexOf(". ");
  if (firstPeriod > 0 && firstPeriod < 80) {
    const authorStr = t.slice(0, firstPeriod);
    const rest = t.slice(firstPeriod + 2);

    // Parse authors
    const parts = authorStr.split(/,\s*and\s+|;\s*/);
    for (const part of parts) {
      const comma = part.indexOf(",");
      if (comma > 0) {
        const family = part.slice(0, comma).trim();
        const given = part.slice(comma + 1).trim().replace(/\.$/, "").replace(/,\s*$/, "");
        if (family.length > 1) result.authors.push({ given, family });
      } else if (part.trim().length > 1) {
        // "First Last" format
        const words = part.trim().split(/\s+/);
        if (words.length >= 2) {
          result.authors.push({ given: words.slice(0, -1).join(" "), family: words[words.length - 1] });
        } else {
          result.authors.push({ given: "", family: part.trim() });
        }
      }
    }

    // Detect article vs book
    const quotedMatch = rest.match(/^"([^"]+)"/);
    if (quotedMatch) {
      result.type = "article";
      result.title = quotedMatch[1];
      const afterTitle = rest.slice(quotedMatch[0].length).replace(/^\s*[.,]\s*/, "");
      // Journal name is typically the next phrase
      const journalMatch = afterTitle.match(/^([^,\d(]+)/);
      if (journalMatch && journalMatch[1].trim().length > 3) {
        result.journal = journalMatch[1].trim();
      }
      // Volume/issue
      const volMatch = afterTitle.match(/(\d+),?\s*no\.\s*(\d+)/);
      if (volMatch) { result.volume = volMatch[1]; result.issue = volMatch[2]; }
      // Pages
      const pagesMatch = afterTitle.match(/:\s*(\d+[\u2013–-]\d+)/);
      if (pagesMatch) result.pages = pagesMatch[1];
    } else {
      // Book title — everything up to publisher or year
      const titleMatch = rest.match(/^([^.]+)\./);
      if (titleMatch) {
        result.title = titleMatch[1].replace(/[*_]/g, "").trim();
      } else {
        result.title = rest.split(",")[0].trim();
      }
      // Publisher
      const pubPatterns = [
        /(?:^|\.\s*)([\w\s&]+?(?:Press|Publishing|Books|University|Inc\.|Ltd\.|Company|Routledge|Springer|Pantheon|Dover|McKay)[\w\s]*)/i,
        /\(([^)]+)\)/
      ];
      for (const pat of pubPatterns) {
        const m = rest.match(pat);
        if (m) { result.publisher = m[1].trim().replace(/,\s*$/, ""); break; }
      }
    }
  } else {
    // Fallback: whole text as title
    result.title = t.replace(/\.$/, "").trim();
  }

  // Detect special types
  if (/lecture|class|course/i.test(t)) result.type = "lecture";
  else if (/https?:\/\//.test(t) && !result.journal) result.type = "website";
  else if (/ordinance|bill|statute|code/i.test(t)) result.type = "legal";
  else if (/video|film|recording|episode/i.test(t)) result.type = "video";
  else if (result.journal) result.type = "article";

  return result;
}

// ── Parse Chicago footnote ──────────────────────────────────

function parseFootnote(text) {
  // Footnotes are like bibliography entries but with "First Last" author order
  // and may have page references at the end
  const t = text.trim();
  const result = parseBibEntry(t);

  // If parseBibEntry got authors in "Last, First" format, footnotes might be "First Last"
  // Try to detect and fix
  if (result.authors.length === 0) {
    // Try "First Last, Title..." pattern
    const fnAuthorMatch = t.match(/^([A-Z][a-zA-Z.]+(?:\s[A-Z][a-zA-Z.'-]+)+)\s*,\s*/);
    if (fnAuthorMatch) {
      const name = fnAuthorMatch[1].trim();
      const words = name.split(/\s+/);
      if (words.length >= 2) {
        result.authors = [{ given: words.slice(0, -1).join(" "), family: words[words.length - 1] }];
      }
      // Try to get title from what follows
      const afterAuthor = t.slice(fnAuthorMatch[0].length);
      const quotedTitle = afterAuthor.match(/^"([^"]+)"/);
      const plainTitle = afterAuthor.match(/^([^(,]+?)(?:\s*[\(,])/);
      if (quotedTitle) { result.title = quotedTitle[1]; result.type = "article"; }
      else if (plainTitle) result.title = plainTitle[1].trim();
    }
  }

  // Extract page locator from end
  const pageMatch = t.match(/,\s*(\d+[\u2013–-]\d+|\d+)\s*\.?\s*$/);
  const locator = pageMatch ? { type: "page", value: pageMatch[1] } : null;

  return { ...result, locator };
}

// ── Parse APA inline citation ───────────────────────────────

function parseInlineCitation(text) {
  // Patterns: (Author, Year), (Author, Year, p. XX), (Author & Author, Year)
  const t = text.replace(/[()]/g, "").trim();

  const authors = [];
  let year = "";
  let locator = null;

  // Extract page/locator
  const pageMatch = t.match(/,?\s*(?:pp?\.\s*|p\s+)(\d+[\u2013–-]?\d*)/);
  if (pageMatch) locator = { type: "page", value: pageMatch[1] };

  // Extract year
  const yearMatch = t.match(/\b((?:19|20)\d{2})\b/);
  if (yearMatch) year = yearMatch[1];

  // Extract authors — everything before the year
  const beforeYear = t.split(/\b(?:19|20)\d{2}\b/)[0].replace(/,?\s*$/, "").trim();
  const authorParts = beforeYear.split(/\s*[&,]\s*/);
  for (const part of authorParts) {
    const name = part.replace(/et\s+al\.?/i, "").trim();
    if (name.length > 1 && !/^p+\./i.test(name)) {
      // Single word = last name
      authors.push({ given: "", family: name });
    }
  }

  return { authors, year, locator };
}

// ── Deduplication ───────────────────────────────────────────

function makeDedupeKey(source) {
  const lastName = normalizeAuthor(source.authors?.[0]?.family);
  const year = source.year || "";
  // Also use first 20 chars of title for disambiguation (e.g., two Dewey books)
  const titleBit = (source.title || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  return `${lastName}|${year}|${titleBit}`;
}

function fuzzyMatch(a, b) {
  const keyA = normalizeAuthor(a.authors?.[0]?.family) + (a.year || "");
  const keyB = normalizeAuthor(b.authors?.[0]?.family) + (b.year || "");
  if (keyA === keyB && keyA.length > 3) return true;
  // Also try matching just last name + year (looser)
  const lastA = normalizeAuthor(a.authors?.[0]?.family);
  const lastB = normalizeAuthor(b.authors?.[0]?.family);
  return lastA === lastB && a.year === b.year && lastA.length > 2;
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log("Parsing docx...");

  const result = await mammoth.convertToHtml({ path: DOCX_PATH });
  const html = result.value;
  const rawResult = await mammoth.extractRawText({ path: DOCX_PATH });
  const rawText = rawResult.value;

  // ── 1. Extract footnotes ──────────────────────────────────
  const footnotes = [];
  const fnRegex = /<li\s+id="footnote-(\d+)">([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = fnRegex.exec(html)) !== null) {
    const num = parseInt(m[1]);
    const text = stripHtml(m[2]);
    footnotes.push({ num, text });
  }
  console.log(`  Footnotes extracted: ${footnotes.length}`);

  // ── 2. Extract inline parenthetical citations ─────────────
  const inlineCitations = [];
  const inlineRegex = /\(([A-Z][a-zA-Z'&\s]+,?\s*(?:19|20)\d{2}[^)]*)\)/g;
  const rawLines = rawText.split(/\n/);
  for (let i = 0; i < rawLines.length; i++) {
    let im;
    while ((im = inlineRegex.exec(rawLines[i])) !== null) {
      inlineCitations.push({
        text: im[1].trim(),
        line: i + 1,
        context: rawLines[i].slice(Math.max(0, im.index - 30), im.index + im[0].length + 30).trim(),
      });
    }
  }
  console.log(`  Inline citations extracted: ${inlineCitations.length}`);

  // ── 3. Extract bibliography section ───────────────────────
  const bibEntries = [];
  const bibStart = rawText.indexOf("Bibliography");
  if (bibStart >= 0) {
    const bibText = rawText.slice(bibStart + "Bibliography".length);
    const lines = bibText.split(/\n/).map(l => l.trim()).filter(l => l.length > 10);
    for (const line of lines) {
      // Stop if we hit a non-bibliography section
      if (/^(Conclusion|Working Notes|Part |Section )/i.test(line)) break;
      // Skip obvious non-entries
      if (line.length < 15) continue;
      bibEntries.push(line);
    }
  }
  console.log(`  Bibliography entries extracted: ${bibEntries.length}`);

  // ── 4. Parse everything into sources ──────────────────────

  const allParsed = []; // {origin, parsed, raw, locator?}

  // From bibliography
  for (const entry of bibEntries) {
    const parsed = parseBibEntry(entry);
    if (parsed.title || parsed.authors.length > 0) {
      allParsed.push({ origin: "bibliography", parsed, raw: entry });
    }
  }

  // From footnotes
  for (const fn of footnotes) {
    const t = fn.text;
    const wordCount = t.split(/\s+/).length;

    // Classify: is this a citation or explanatory prose?
    const hasYear = /\b(?:19|20)\d{2}\b/.test(t);
    const startsWithAuthor = /^[A-Z][a-zA-Z.'-]+(?:\s[A-Z])?/.test(t);
    const isExplanatory = wordCount > 40 && !startsWithAuthor;
    const isSeeRef = /^(?:See |See also |Compare |Cf\. |Note )/i.test(t);
    const isShort = /^(?:Ibid|Id)\b/i.test(t);

    if (isExplanatory && !hasYear) {
      allParsed.push({ origin: "footnote-explanatory", parsed: null, raw: t, footnoteNum: fn.num });
    } else if (isShort) {
      allParsed.push({ origin: "footnote-short", parsed: null, raw: t, footnoteNum: fn.num });
    } else if (isSeeRef) {
      allParsed.push({ origin: "footnote-seeref", parsed: null, raw: t, footnoteNum: fn.num });
    } else {
      const parsed = parseFootnote(t);
      allParsed.push({
        origin: "footnote-citation",
        parsed,
        raw: t,
        footnoteNum: fn.num,
        locator: parsed.locator,
      });
    }
  }

  // From inline
  for (const ic of inlineCitations) {
    const parsed = parseInlineCitation(ic.text);
    allParsed.push({
      origin: "inline",
      parsed: { ...parsed, title: "" },
      raw: ic.text,
      context: ic.context,
      locator: parsed.locator,
    });
  }

  console.log(`  Total parsed items: ${allParsed.length}`);

  // ── 5. Deduplicate into master source list ────────────────

  const masterSources = []; // final deduplicated sources
  const dedupeMap = new Map(); // key → index in masterSources

  // First pass: bibliography entries (most complete data)
  for (const item of allParsed.filter(i => i.origin === "bibliography")) {
    const key = makeDedupeKey(item.parsed);
    if (!dedupeMap.has(key)) {
      const idx = masterSources.length;
      masterSources.push({
        id: `src-mig-${idx}`,
        citationKey: generateKey(item.parsed.authors, item.parsed.year),
        ...item.parsed,
        abstract: "",
        usageNotes: [],
        tags: [],
        category: "referenced",
        zoteroKey: null,
        formattedBib: null,
        cslJson: null,
        _origins: [item.origin],
        _rawTexts: [item.raw],
        _citations: [],
      });
      dedupeMap.set(key, idx);
    }
  }

  // Second pass: footnote citations
  for (const item of allParsed.filter(i => i.origin === "footnote-citation" && i.parsed)) {
    const key = makeDedupeKey(item.parsed);
    if (dedupeMap.has(key)) {
      const idx = dedupeMap.get(key);
      masterSources[idx]._origins.push(item.origin);
      masterSources[idx]._rawTexts.push(item.raw);
      if (item.locator) {
        masterSources[idx]._citations.push({
          footnoteNum: item.footnoteNum,
          locator: item.locator,
        });
      }
      masterSources[idx].category = "cited";
    } else {
      // Try fuzzy match
      let matched = false;
      for (const [existingKey, idx] of dedupeMap.entries()) {
        if (fuzzyMatch(item.parsed, masterSources[idx])) {
          masterSources[idx]._origins.push(item.origin);
          masterSources[idx]._rawTexts.push(item.raw);
          if (item.locator) {
            masterSources[idx]._citations.push({ footnoteNum: item.footnoteNum, locator: item.locator });
          }
          masterSources[idx].category = "cited";
          matched = true;
          break;
        }
      }
      if (!matched) {
        const idx = masterSources.length;
        masterSources.push({
          id: `src-mig-${idx}`,
          citationKey: generateKey(item.parsed.authors, item.parsed.year),
          ...item.parsed,
          abstract: "",
          usageNotes: [],
          tags: [],
          category: "cited",
          zoteroKey: null,
          formattedBib: null,
          cslJson: null,
          _origins: [item.origin],
          _rawTexts: [item.raw],
          _citations: item.locator ? [{ footnoteNum: item.footnoteNum, locator: item.locator }] : [],
        });
        dedupeMap.set(key, idx);
      }
    }
  }

  // Third pass: inline citations (may add new sources or match existing)
  for (const item of allParsed.filter(i => i.origin === "inline" && i.parsed)) {
    const key = makeDedupeKey(item.parsed);
    let matched = false;

    // Try exact key match
    if (dedupeMap.has(key)) {
      const idx = dedupeMap.get(key);
      masterSources[idx]._origins.push("inline");
      masterSources[idx]._rawTexts.push(item.raw);
      if (item.locator) {
        masterSources[idx]._citations.push({ inline: item.raw, locator: item.locator, context: item.context });
      }
      masterSources[idx].category = "cited";
      matched = true;
    }

    // Try fuzzy match
    if (!matched) {
      for (const [existingKey, idx] of dedupeMap.entries()) {
        if (fuzzyMatch(item.parsed, masterSources[idx])) {
          masterSources[idx]._origins.push("inline");
          masterSources[idx]._rawTexts.push(item.raw);
          if (item.locator) {
            masterSources[idx]._citations.push({ inline: item.raw, locator: item.locator, context: item.context });
          }
          masterSources[idx].category = "cited";
          matched = true;
          break;
        }
      }
    }

    if (!matched && item.parsed.authors.length > 0) {
      const idx = masterSources.length;
      masterSources.push({
        id: `src-mig-${idx}`,
        citationKey: generateKey(item.parsed.authors, item.parsed.year),
        ...item.parsed,
        title: `[NEEDS TITLE — inline cite: ${item.raw}]`,
        abstract: "",
        usageNotes: [],
        tags: [],
        category: "cited",
        zoteroKey: null,
        formattedBib: null,
        cslJson: null,
        _origins: ["inline"],
        _rawTexts: [item.raw],
        _citations: item.locator ? [{ inline: item.raw, locator: item.locator, context: item.context }] : [],
        _needsTitle: true,
      });
      dedupeMap.set(key, idx);
    }
  }

  // ── 6. Collect explanatory footnotes → notes ──────────────

  const explanatoryNotes = allParsed
    .filter(i => i.origin === "footnote-explanatory" || i.origin === "footnote-seeref")
    .map(i => ({
      footnoteNum: i.footnoteNum,
      text: i.raw,
      origin: i.origin,
    }));

  const shortCitations = allParsed
    .filter(i => i.origin === "footnote-short")
    .map(i => ({
      footnoteNum: i.footnoteNum,
      text: i.raw,
    }));

  // ── 7. Generate review output ─────────────────────────────

  console.log(`\n${"=".repeat(70)}`);
  console.log("MIGRATION SUMMARY");
  console.log("=".repeat(70));
  console.log(`  Master sources (deduplicated): ${masterSources.length}`);
  console.log(`  Sources from bibliography:     ${masterSources.filter(s => s._origins.includes("bibliography")).length}`);
  console.log(`  Sources from footnotes only:   ${masterSources.filter(s => !s._origins.includes("bibliography") && s._origins.some(o => o.startsWith("footnote"))).length}`);
  console.log(`  Sources from inline only:      ${masterSources.filter(s => s._origins.length === 1 && s._origins[0] === "inline").length}`);
  console.log(`  Sources needing title:         ${masterSources.filter(s => s._needsTitle).length}`);
  console.log(`  Cited sources (have citations): ${masterSources.filter(s => s.category === "cited").length}`);
  console.log(`  Referenced only (no citations): ${masterSources.filter(s => s.category === "referenced").length}`);
  console.log(`  Explanatory footnotes → notes: ${explanatoryNotes.length}`);
  console.log(`  Short/ibid citations:          ${shortCitations.length}`);

  // Build review JSON
  const review = {
    summary: {
      totalSources: masterSources.length,
      citedSources: masterSources.filter(s => s.category === "cited").length,
      referencedSources: masterSources.filter(s => s.category === "referenced").length,
      needsTitle: masterSources.filter(s => s._needsTitle).length,
      explanatoryNotes: explanatoryNotes.length,
      shortCitations: shortCitations.length,
    },
    sources: masterSources.map(s => ({
      id: s.id,
      citationKey: s.citationKey,
      type: s.type,
      authors: s.authors,
      title: s.title,
      year: s.year,
      publisher: s.publisher,
      journal: s.journal,
      url: s.url,
      doi: s.doi,
      category: s.category,
      origins: s._origins,
      citationCount: s._citations.length,
      citations: s._citations,
      needsTitle: s._needsTitle || false,
      rawTexts: s._rawTexts,
    })),
    explanatoryNotes,
    shortCitations,
  };

  fs.writeFileSync(REVIEW_JSON, JSON.stringify(review, null, 2));
  console.log(`\nReview JSON written to: ${REVIEW_JSON}`);

  // Build human-readable markdown
  let md = "# Citation Migration Review\n\n";
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Count |\n|---|---|\n`;
  md += `| Total unique sources | ${review.summary.totalSources} |\n`;
  md += `| Cited (have inline/footnote citations) | ${review.summary.citedSources} |\n`;
  md += `| Referenced only (bibliography, no citations) | ${review.summary.referencedSources} |\n`;
  md += `| Needs title (inline-only, no full entry) | ${review.summary.needsTitle} |\n`;
  md += `| Explanatory footnotes → notes | ${review.summary.explanatoryNotes} |\n`;
  md += `| Short/ibid citations | ${review.summary.shortCitations} |\n\n`;

  md += `## Sources (${masterSources.length})\n\n`;
  for (const s of review.sources) {
    const flag = s.needsTitle ? " **[NEEDS TITLE]**" : "";
    const authorStr = s.authors.map(a => `${a.given} ${a.family}`.trim()).join(", ") || "Unknown";
    md += `### ${s.citationKey}${flag}\n`;
    md += `- **Author(s):** ${authorStr}\n`;
    md += `- **Title:** ${s.title}\n`;
    md += `- **Year:** ${s.year || "n.d."}\n`;
    md += `- **Type:** ${s.type}\n`;
    if (s.publisher) md += `- **Publisher:** ${s.publisher}\n`;
    if (s.journal) md += `- **Journal:** ${s.journal}\n`;
    if (s.url) md += `- **URL:** ${s.url}\n`;
    md += `- **Category:** ${s.category}\n`;
    md += `- **Found in:** ${s.origins.join(", ")}\n`;
    md += `- **Citation count:** ${s.citationCount}\n`;
    if (s.citations.length > 0) {
      md += `- **Citations:**\n`;
      for (const c of s.citations) {
        if (c.footnoteNum) md += `  - Footnote ${c.footnoteNum}: ${c.locator?.type} ${c.locator?.value || ""}\n`;
        if (c.inline) md += `  - Inline: (${c.inline}) — "${c.context?.slice(0, 60)}..."\n`;
      }
    }
    md += `\n`;
  }

  if (explanatoryNotes.length > 0) {
    md += `## Explanatory Footnotes → Notes (${explanatoryNotes.length})\n\n`;
    for (const n of explanatoryNotes) {
      md += `- **Footnote ${n.footnoteNum}** (${n.origin}): ${n.text.slice(0, 120)}${n.text.length > 120 ? "..." : ""}\n`;
    }
    md += "\n";
  }

  if (shortCitations.length > 0) {
    md += `## Short/Ibid Citations (${shortCitations.length})\n\n`;
    for (const c of shortCitations) {
      md += `- **Footnote ${c.footnoteNum}**: ${c.text.slice(0, 120)}\n`;
    }
    md += "\n";
  }

  fs.writeFileSync(REVIEW_MD, md);
  console.log(`Review markdown written to: ${REVIEW_MD}`);

  // Write the clean sources JSON (without internal tracking fields)
  const cleanSources = masterSources.map(s => {
    const { _origins, _rawTexts, _citations, _needsTitle, locator, ...clean } = s;
    return {
      ...clean,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  fs.writeFileSync(SOURCES_OUT, JSON.stringify(cleanSources, null, 2));
  console.log(`Migrated sources JSON written to: ${SOURCES_OUT}`);
  console.log(`\nDone! Review the markdown file, then load migrated-sources.json into the app.`);
}

main().catch(console.error);
