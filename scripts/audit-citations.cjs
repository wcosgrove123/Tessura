/**
 * audit-citations.cjs
 *
 * Comprehensive citation audit of Purpose of Schools - expanded.docx
 * Extracts footnotes, inline citations, comments, and bibliography.
 */

const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs');

const DOCX_PATH = path.resolve(__dirname, '../docs/writings/Purpose of School/Purpose of Schools - expanded.docx');

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
}

/**
 * Classify a footnote as FULL_CITATION, SHORT_CITATION, EXPLANATORY, or MIXED
 */
function classifyFootnote(text) {
  const t = text.trim();

  // Patterns for full citations (author, title, publisher, year)
  const fullCitePat = /\b\d{4}\b.*(?:press|publisher|university|journal|review|quarterly|books?|edition|ed\.|vol\.|chapter|pp?\.\s*\d)/i;
  const fullCitePat2 = /(?:press|publisher|university|books?)\s*[,.)]/i;
  const hasYear = /\b(?:19|20)\d{2}\b/.test(t);
  const hasPublisher = fullCitePat.test(t) || fullCitePat2.test(t);
  const hasItalic = /<em>|<i>/i.test(t); // might still have residual html
  const hasQuotes = /[""\u201C\u201D]/.test(t);
  const hasPageRef = /\bp+\.\s*\d+/i.test(t);

  // Short citation: "Author, Short Title, page" or "Ibid." or "Author, page"
  const shortCitePat = /^(?:ibid|id)\b/i;
  const shortCitePat2 = /^\w[\w\s,]+,\s*(?:p+\.\s*\d+|ch\.\s*\d+)/i;
  const isShort = shortCitePat.test(t) || (shortCitePat2.test(t) && t.length < 150);

  // Check if mostly prose (long sentences without citation markers)
  const sentenceCount = (t.match(/[.!?]\s/g) || []).length + 1;
  const wordCount = t.split(/\s+/).length;
  const isProse = wordCount > 30 && !hasPublisher && !hasPageRef;

  // Check for "See" / "See also" / "Compare" references
  const hasSeeRef = /^(?:see\s|see also\s|compare\s|cf\.\s|note\s)/i.test(t);

  if (isShort) return 'SHORT_CITATION';

  if (hasYear && hasPublisher) {
    if (isProse || sentenceCount > 3) return 'MIXED';
    return 'FULL_CITATION';
  }

  if (hasYear && (hasPageRef || hasSeeRef || hasQuotes)) {
    if (t.length < 200) return 'SHORT_CITATION';
    return 'MIXED';
  }

  if (hasYear && t.length < 120) return 'SHORT_CITATION';

  if (isProse) return 'EXPLANATORY';

  // Fallback: short + has year-like = citation, else explanatory
  if (hasYear) return 'MIXED';
  return 'EXPLANATORY';
}

/**
 * Extract unique source info from a full citation footnote
 */
function extractSource(text) {
  const t = text.trim();

  // Try to get author(s) — typically the first words before a comma or period
  // Common patterns: "Author, Title..." or "Author. Title..."
  const authorMatch = t.match(/^([A-Z][a-zA-Z\s.'-]+?)(?:,\s*|\.\s*)/);
  const author = authorMatch ? authorMatch[1].trim() : null;

  // Try to get a title — often in italics or quotes
  const italicTitle = t.match(/(?:<em>|<i>)([^<]+)(?:<\/em>|<\/i>)/i);
  const quotedTitle = t.match(/["\u201C]([^"\u201D]+)["\u201D]/);
  const title = italicTitle ? italicTitle[1].trim() : quotedTitle ? quotedTitle[1].trim() : null;

  // Get year
  const yearMatch = t.match(/\b((?:19|20)\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : null;

  return { author, title, year, raw: t.substring(0, 120) };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(80));
  console.log('CITATION AUDIT: Purpose of Schools - expanded.docx');
  console.log('='.repeat(80));
  console.log();

  if (!fs.existsSync(DOCX_PATH)) {
    console.error('ERROR: File not found:', DOCX_PATH);
    process.exit(1);
  }

  // ── 1. Convert to HTML ──────────────────────────────────────────────────
  const result = await mammoth.convertToHtml({ path: DOCX_PATH }, {
    includeDefaultStyleMap: true,
  });

  const html = result.value;
  const messages = result.messages;

  // Log mammoth warnings
  if (messages.length > 0) {
    console.log('Mammoth messages:', messages.length);
    messages.slice(0, 5).forEach(m => console.log('  -', m.type, m.message?.substring(0, 100)));
    if (messages.length > 5) console.log(`  ... and ${messages.length - 5} more`);
    console.log();
  }

  // ── 2. Extract raw text ─────────────────────────────────────────────────
  const rawResult = await mammoth.extractRawText({ path: DOCX_PATH });
  const rawText = rawResult.value;

  // ── 3. Extract footnotes ────────────────────────────────────────────────
  console.log('='.repeat(80));
  console.log('SECTION 1: FOOTNOTES');
  console.log('='.repeat(80));
  console.log();

  // mammoth renders footnotes as <li id="footnote-N"> elements
  const footnotes = [];
  const footnoteRegex = /<li\s+id="footnote-(\d+)">([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = footnoteRegex.exec(html)) !== null) {
    const num = parseInt(match[1]);
    const bodyHtml = match[2];
    const text = stripHtml(bodyHtml);
    footnotes.push({ num, text, html: bodyHtml });
  }

  // Also try alternate patterns - footnotes as paragraphs with footnote markers
  if (footnotes.length === 0) {
    // Try looking for sup elements linking to footnotes
    const supRegex = /<sup>\s*<a[^>]*href="#footnote-(\d+)"[^>]*>\[(\d+)\]<\/a>\s*<\/sup>/gi;
    const refs = [];
    while ((match = supRegex.exec(html)) !== null) {
      refs.push({ id: match[1], num: match[2] });
    }
    if (refs.length > 0) {
      console.log(`Found ${refs.length} footnote references in text (sup links).`);
    }
  }

  // Also check for endnote-style patterns
  if (footnotes.length === 0) {
    const endnoteRegex = /<li\s+id="endnote-(\d+)">([\s\S]*?)<\/li>/gi;
    while ((match = endnoteRegex.exec(html)) !== null) {
      const num = parseInt(match[1]);
      const bodyHtml = match[2];
      const text = stripHtml(bodyHtml);
      footnotes.push({ num, text, html: bodyHtml });
    }
    if (footnotes.length > 0) {
      console.log('(Found as endnotes rather than footnotes)');
    }
  }

  // Classify each footnote
  footnotes.forEach(fn => {
    fn.type = classifyFootnote(fn.text);
    if (fn.type === 'FULL_CITATION' || fn.type === 'MIXED') {
      fn.source = extractSource(fn.text);
    }
  });

  // Print footnotes
  if (footnotes.length === 0) {
    console.log('No footnotes found in mammoth HTML output.');
    console.log();

    // Debug: check what footnote-like content exists
    const fnCheck = html.match(/footnote|endnote|<sup>|<ol\b/gi);
    console.log('HTML contains footnote-related elements:', fnCheck ? [...new Set(fnCheck)].join(', ') : 'NONE');

    // Check for footnote references
    const supMatches = [...html.matchAll(/<sup>([\s\S]*?)<\/sup>/gi)];
    if (supMatches.length > 0) {
      console.log(`Found ${supMatches.length} <sup> elements. First few:`);
      supMatches.slice(0, 5).forEach((m, i) => {
        console.log(`  sup[${i}]: ${stripHtml(m[1]).substring(0, 80)}`);
      });
    }

    // Check raw text for footnote markers like [1], [2] etc
    const bracketNotes = rawText.match(/\[\d+\]/g);
    if (bracketNotes) {
      console.log(`Found ${bracketNotes.length} bracketed numbers in raw text: ${bracketNotes.slice(0, 10).join(', ')}...`);
    }
    console.log();
  } else {
    footnotes.forEach(fn => {
      console.log(`--- Footnote #${fn.num} [${fn.type}] ---`);
      console.log(fn.text.substring(0, 300) + (fn.text.length > 300 ? '...' : ''));
      if (fn.source) {
        console.log(`  Source: ${fn.source.author || '?'} | ${fn.source.title || '?'} | ${fn.source.year || '?'}`);
      }
      console.log();
    });
  }

  // ── 4. Extract footnote bodies from raw HTML more aggressively ──────────
  // Sometimes mammoth puts footnotes in a different structure
  if (footnotes.length === 0) {
    console.log('Attempting alternative footnote extraction...');

    // Look for ordered lists that might be footnotes
    const olMatches = [...html.matchAll(/<ol>([\s\S]*?)<\/ol>/gi)];
    console.log(`Found ${olMatches.length} <ol> elements.`);
    olMatches.forEach((m, idx) => {
      const items = [...m[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
      if (items.length > 0) {
        console.log(`  <ol>[${idx}] has ${items.length} items. First: "${stripHtml(items[0][1]).substring(0, 80)}"`);
      }
    });

    // Check for footnote section markers in raw text
    const rawLines = rawText.split('\n');
    let inFootnotes = false;
    const rawFootnotes = [];
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (/^\[\d+\]\s/.test(line) || /^\d+\.\s+[A-Z]/.test(line) && inFootnotes) {
        inFootnotes = true;
        rawFootnotes.push(line);
      } else if (inFootnotes && line.length === 0) {
        // continue collecting
      } else if (inFootnotes && line.length > 0 && !/^\[\d+\]/.test(line)) {
        // might be continuation or end
        if (rawFootnotes.length > 0 && line.length > 20) {
          rawFootnotes[rawFootnotes.length - 1] += ' ' + line;
        }
      }
    }

    if (rawFootnotes.length > 0) {
      console.log(`\nFound ${rawFootnotes.length} footnote-like lines in raw text:`);
      rawFootnotes.slice(0, 10).forEach((fn, i) => {
        console.log(`  [${i}] ${fn.substring(0, 200)}`);
      });
    }
    console.log();
  }

  // ── 5. Dump HTML structure near footnotes for debugging ─────────────────
  // Search for any "footnote" or "endnote" in the html
  const fnPositions = [];
  let searchIdx = 0;
  while (true) {
    const pos = html.indexOf('footnote', searchIdx);
    if (pos === -1) break;
    fnPositions.push(pos);
    searchIdx = pos + 1;
  }
  if (fnPositions.length > 0) {
    console.log(`Found "footnote" at ${fnPositions.length} positions in HTML.`);
    fnPositions.slice(0, 3).forEach(pos => {
      console.log(`  ...${html.substring(Math.max(0, pos - 50), pos + 100)}...`);
    });
    console.log();
  }

  // ── 6. Extract inline parenthetical citations ───────────────────────────
  console.log('='.repeat(80));
  console.log('SECTION 2: INLINE PARENTHETICAL CITATIONS');
  console.log('='.repeat(80));
  console.log();

  // Work with raw text split into paragraphs
  const paragraphs = rawText.split(/\n+/).filter(p => p.trim().length > 0);

  // Citation patterns
  const citationPatterns = [
    // (Author, Year) or (Author, Year, p. XX) or (Author Year)
    /\(([A-Z][a-zA-Z\s&.'-]+?),?\s+(\d{4}[a-z]?)(?:,\s*(?:pp?\.\s*\d+[\d\s–-]*)?)?\)/g,
    // (Author et al., Year)
    /\(([A-Z][a-zA-Z'-]+\s+et\s+al\.?),?\s+(\d{4}[a-z]?)(?:,\s*(?:pp?\.\s*\d+[\d\s–-]*)?)?\)/g,
    // (see Author, Year)
    /\((?:see|cf\.?|compare)\s+([A-Z][a-zA-Z\s&.'-]+?),?\s+(\d{4}[a-z]?)(?:,\s*(?:pp?\.\s*\d+[\d\s–-]*)?)?\)/gi,
    // General: anything in parens that contains a 4-digit year and a capitalized word
    /\(([^)]{3,80}?\b(?:19|20)\d{2}[a-z]?\b[^)]{0,40}?)\)/g,
  ];

  const inlineCitations = [];
  const seenCitations = new Set();

  paragraphs.forEach((para, pIdx) => {
    citationPatterns.forEach(pat => {
      const regex = new RegExp(pat.source, pat.flags);
      let m;
      while ((m = regex.exec(para)) !== null) {
        const fullMatch = m[0];
        if (seenCitations.has(`${pIdx}:${m.index}:${fullMatch}`)) continue;
        seenCitations.add(`${pIdx}:${m.index}:${fullMatch}`);

        // Filter out false positives
        const inner = fullMatch.slice(1, -1); // remove parens
        if (/^\d+$/.test(inner)) continue; // just a number
        if (inner.length < 5) continue;
        // Must have a year
        if (!/\b(?:19|20)\d{2}\b/.test(inner)) continue;
        // Must have at least one capitalized word (author name)
        if (!/[A-Z][a-z]{2,}/.test(inner)) continue;

        inlineCitations.push({
          text: fullMatch,
          paraIndex: pIdx,
          paraPreview: para.substring(0, 80),
        });
      }
    });
  });

  if (inlineCitations.length === 0) {
    console.log('No inline parenthetical citations found.');
  } else {
    inlineCitations.forEach((c, i) => {
      console.log(`[${i + 1}] ${c.text}`);
      console.log(`    Para ${c.paraIndex}: "${c.paraPreview}..."`);
      console.log();
    });
  }

  // ── 7. Extract Word comments ────────────────────────────────────────────
  console.log('='.repeat(80));
  console.log('SECTION 3: WORD COMMENTS');
  console.log('='.repeat(80));
  console.log();

  // Check for comment patterns in HTML
  const commentPatterns = [
    /<a[^>]*class="comment-reference"[^>]*>([\s\S]*?)<\/a>/gi,
    /\[Comment\s+(\d+)\]/gi,
    /\[([A-Z][A-Z]\d+)\]/g, // Word comment IDs like [WC1]
    /<aside[^>]*>([\s\S]*?)<\/aside>/gi,
  ];

  const comments = [];
  commentPatterns.forEach(pat => {
    const regex = new RegExp(pat.source, pat.flags);
    let m;
    while ((m = regex.exec(html)) !== null) {
      comments.push(stripHtml(m[0]));
    }
  });

  // Also check raw text for comment markers
  const rawCommentPat = /\[(?:Comment|Note|Author)\s*\d*\]/gi;
  let cm;
  while ((cm = rawCommentPat.exec(rawText)) !== null) {
    comments.push(cm[0]);
  }

  // Check for mammoth comment annotations
  const commentAnno = html.match(/comment-/gi);
  if (commentAnno) {
    console.log(`Found ${commentAnno.length} "comment-" references in HTML.`);
  }

  if (comments.length === 0) {
    console.log('No Word comments found.');
    console.log('(mammoth typically strips Word comments during conversion)');
  } else {
    comments.forEach((c, i) => {
      console.log(`Comment ${i + 1}: ${c}`);
    });
  }
  console.log();

  // ── 8. Extract bibliography section ─────────────────────────────────────
  console.log('='.repeat(80));
  console.log('SECTION 4: BIBLIOGRAPHY / REFERENCES');
  console.log('='.repeat(80));
  console.log();

  // Search for bibliography/references section in raw text
  const bibHeaders = [
    /^(?:bibliography|references|works cited|sources|works consulted)\s*$/im,
  ];

  let bibStartIdx = -1;
  const rawLines = rawText.split('\n');

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    for (const pat of bibHeaders) {
      if (pat.test(line)) {
        bibStartIdx = i;
        console.log(`Found bibliography header at line ${i}: "${line}"`);
        break;
      }
    }
    if (bibStartIdx >= 0) break;
  }

  const bibEntries = [];
  if (bibStartIdx >= 0) {
    for (let i = bibStartIdx + 1; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (line.length === 0) continue;
      // Stop if we hit another major section header
      if (/^(?:appendix|index|chapter|part\s+[ivx\d])/i.test(line) && line.length < 60) break;
      bibEntries.push(line);
    }

    console.log(`Found ${bibEntries.length} bibliography entries:`);
    console.log();
    bibEntries.forEach((entry, i) => {
      console.log(`  [${i + 1}] ${entry.substring(0, 200)}${entry.length > 200 ? '...' : ''}`);
    });
  } else {
    console.log('No bibliography/references section header found.');

    // Try to find bibliography-like content at the end of the document
    console.log('Checking last 50 lines of document for bibliography-like content...');
    const lastLines = rawLines.slice(-50).filter(l => l.trim().length > 0);
    const bibLike = lastLines.filter(l => {
      const t = l.trim();
      return /\b(?:19|20)\d{2}\b/.test(t) && /[A-Z][a-z]+,?\s+[A-Z]/.test(t) && t.length > 40;
    });

    if (bibLike.length > 3) {
      console.log(`Found ${bibLike.length} bibliography-like lines near end:`);
      bibLike.forEach((l, i) => {
        console.log(`  [${i + 1}] ${l.substring(0, 200)}`);
      });
    } else {
      console.log('No bibliography-like content found near end of document.');
    }
  }
  console.log();

  // ── 9. Scan all raw text for any citation-like patterns ─────────────────
  console.log('='.repeat(80));
  console.log('SECTION 5: ALL CITATION-LIKE PATTERNS IN RAW TEXT');
  console.log('='.repeat(80));
  console.log();

  // Look for Chicago/Turabian footnote-style patterns anywhere
  // "Author, Title (Place: Publisher, Year), page."
  const chicagoPattern = /([A-Z][a-zA-Z\s.'-]+?),\s+([A-Z][^,\n]{5,60})\s+\(([^)]+(?:19|20)\d{2}[^)]*)\)/g;
  const chicagoCites = [];
  let cm2;
  while ((cm2 = chicagoPattern.exec(rawText)) !== null) {
    chicagoCites.push({
      full: cm2[0],
      author: cm2[1].trim(),
      title: cm2[2].trim(),
      pubInfo: cm2[3].trim(),
    });
  }

  if (chicagoCites.length > 0) {
    console.log(`Found ${chicagoCites.length} Chicago-style citations:`);
    chicagoCites.forEach((c, i) => {
      console.log(`  [${i + 1}] ${c.author} — ${c.title}`);
      console.log(`         (${c.pubInfo})`);
    });
  } else {
    console.log('No Chicago-style citation patterns found.');
  }
  console.log();

  // Look for any quoted titles that might indicate citations
  const quotedTitles = rawText.match(/[""\u201C]([^"""\u201D]{10,80})[""\u201D]/g);
  if (quotedTitles) {
    const unique = [...new Set(quotedTitles)];
    console.log(`Found ${unique.length} unique quoted phrases (potential article/chapter titles):`);
    unique.forEach((q, i) => {
      console.log(`  [${i + 1}] ${q}`);
    });
  }
  console.log();

  // ── 10. Look for superscript numbers (footnote refs) ────────────────────
  console.log('='.repeat(80));
  console.log('SECTION 6: FOOTNOTE REFERENCE MARKERS');
  console.log('='.repeat(80));
  console.log();

  const supRefs = [...html.matchAll(/<sup>([\s\S]*?)<\/sup>/gi)];
  console.log(`Total <sup> elements: ${supRefs.length}`);
  if (supRefs.length > 0) {
    const supTexts = supRefs.map(m => stripHtml(m[1]));
    // Check if they're numeric (footnote refs)
    const numericSups = supTexts.filter(t => /^\[?\d+\]?$/.test(t.trim()));
    console.log(`Numeric sup refs (likely footnote markers): ${numericSups.length}`);
    if (numericSups.length > 0) {
      console.log(`  Range: ${numericSups[0]} to ${numericSups[numericSups.length - 1]}`);
    }
    const nonNumericSups = supTexts.filter(t => !/^\[?\d+\]?$/.test(t.trim()));
    if (nonNumericSups.length > 0) {
      console.log(`Non-numeric sup elements: ${nonNumericSups.length}`);
      nonNumericSups.slice(0, 10).forEach(s => console.log(`  "${s}"`));
    }
  }
  console.log();

  // ── 11. Dump HTML around footnote bodies ────────────────────────────────
  // Look for the footnote body section
  const fnBodyIdx = html.indexOf('footnote-1');
  if (fnBodyIdx > -1) {
    console.log('HTML around first footnote body:');
    console.log(html.substring(Math.max(0, fnBodyIdx - 200), fnBodyIdx + 500));
    console.log();
  }

  // Also look for endnote section
  const enIdx = html.indexOf('endnote');
  if (enIdx > -1) {
    console.log('HTML around first endnote reference:');
    console.log(html.substring(Math.max(0, enIdx - 200), enIdx + 500));
    console.log();
  }

  // ── SUMMARY ─────────────────────────────────────────────────────────────
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log();

  console.log(`Total footnotes extracted: ${footnotes.length}`);

  if (footnotes.length > 0) {
    const byType = {};
    footnotes.forEach(fn => {
      byType[fn.type] = (byType[fn.type] || 0) + 1;
    });
    console.log('Footnotes by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }

  const numericSups = [...html.matchAll(/<sup>([\s\S]*?)<\/sup>/gi)]
    .map(m => stripHtml(m[1]).trim())
    .filter(t => /^\[?\d+\]?$/.test(t));
  console.log(`Total footnote reference markers (sup): ${numericSups.length}`);

  console.log(`Total inline parenthetical citations: ${inlineCitations.length}`);
  console.log(`Total Word comments: ${comments.length}`);
  console.log(`Total bibliography entries: ${bibEntries.length}`);
  console.log(`Total Chicago-style citations found: ${chicagoCites.length}`);
  console.log(`Total quoted phrases (potential titles): ${quotedTitles ? [...new Set(quotedTitles)].length : 0}`);
  console.log();

  // Unique sources from footnotes
  if (footnotes.length > 0) {
    const sources = new Map();
    footnotes.filter(fn => fn.source).forEach(fn => {
      const key = `${(fn.source.author || '').toLowerCase()}|${(fn.source.title || '').toLowerCase()}`;
      if (!sources.has(key)) {
        sources.set(key, { ...fn.source, count: 1 });
      } else {
        sources.get(key).count++;
      }
    });

    console.log(`Unique sources from footnotes: ${sources.size}`);
    console.log();
    [...sources.values()].sort((a, b) => b.count - a.count).forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.author || '?'} — ${s.title || '?'} (${s.year || '?'}) × ${s.count}`);
    });
  }

  // Unique sources from inline citations
  if (inlineCitations.length > 0) {
    const inlineSources = new Map();
    inlineCitations.forEach(c => {
      const inner = c.text.slice(1, -1);
      const key = inner.replace(/,?\s*pp?\.\s*\d+.*$/, '').trim().toLowerCase();
      if (!inlineSources.has(key)) {
        inlineSources.set(key, { text: inner, count: 1 });
      } else {
        inlineSources.get(key).count++;
      }
    });

    console.log();
    console.log(`Unique inline citation sources: ${inlineSources.size}`);
    [...inlineSources.values()].sort((a, b) => b.count - a.count).forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.text} × ${s.count}`);
    });
  }

  // Unique sources from Chicago-style citations
  if (chicagoCites.length > 0) {
    const chiSources = new Map();
    chicagoCites.forEach(c => {
      const key = `${c.author.toLowerCase()}|${c.title.toLowerCase().substring(0, 30)}`;
      if (!chiSources.has(key)) {
        chiSources.set(key, { ...c, count: 1 });
      } else {
        chiSources.get(key).count++;
      }
    });

    console.log();
    console.log(`Unique Chicago-style sources: ${chiSources.size}`);
    [...chiSources.values()].sort((a, b) => b.count - a.count).forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.author} — ${s.title} × ${s.count}`);
    });
  }

  console.log();
  console.log('='.repeat(80));
  console.log('AUDIT COMPLETE');
  console.log('='.repeat(80));

  // ── Save HTML for manual inspection ─────────────────────────────────────
  const debugPath = path.resolve(__dirname, '../docs/debug-citation-audit.html');
  fs.writeFileSync(debugPath, html);
  console.log(`\nFull HTML saved to: ${debugPath}`);
  console.log(`HTML size: ${(html.length / 1024).toFixed(0)} KB`);
  console.log(`Raw text size: ${(rawText.length / 1024).toFixed(0)} KB`);
  console.log(`Total paragraphs in raw text: ${paragraphs.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
