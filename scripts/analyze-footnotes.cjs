#!/usr/bin/env node
'use strict';

const mammoth = require('../node_modules/mammoth');
const path = require('path');
const fs = require('fs');

const DOCX_PATH = path.resolve(
  __dirname,
  '../docs/writings/Purpose of School/Purpose of Schools - expanded.docx'
);

// ─── Categorisation helpers ───────────────────────────────────────────────────

// Pure citation patterns:
//   (Author, YYYY)  /  (Author YYYY)  /  Author (YYYY)  /  Author, YYYY, p. N
//   Chicago-style: Author, Title, p. N   — detected by being short with no full sentence
const AUTHOR_YEAR = /\([\w\s\-']+,?\s+\d{4}[a-z]?(,\s+p{1,2}\.\s*\d+[\–\-]?\d*)?\)/i;
const YEAR_ONLY   = /\(\d{4}\)/;
const PAGE_REF    = /p{1,2}\.\s*\d+/i;
const IBID        = /^ibid/i;
const URL_LIKE    = /https?:\/\//i;

function categorize(text) {
  const t = text.trim();
  const wordCount = t.split(/\s+/).length;
  const hasSentence = /[A-Z][^.!?]{15,}[.!?]/.test(t);  // a real sentence (not just a title)

  // Very short entries with citations are pure citations
  if (wordCount <= 25 && !hasSentence) {
    if (AUTHOR_YEAR.test(t) || IBID.test(t) || (PAGE_REF.test(t) && wordCount <= 15)) {
      return 'pure-citation';
    }
  }

  // Longer text — check for mix
  if (hasSentence && (AUTHOR_YEAR.test(t) || PAGE_REF.test(t) || IBID.test(t))) {
    return 'mixed';
  }

  if (hasSentence) {
    return 'explanatory';
  }

  // Fallback — short but no clear citation marker
  if (wordCount <= 30) {
    return 'pure-citation';
  }

  return 'other';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(DOCX_PATH)) {
    console.error('ERROR: Could not find docx at', DOCX_PATH);
    process.exit(1);
  }

  console.log('Reading docx …\n');

  // mammoth exposes raw footnotes/endnotes through its transform pipeline.
  // The simplest approach: convert with footnotes embedded and parse the output,
  // BUT mammoth also supports a lower-level XML transform.
  // We'll use the convertToHtml approach and extract footnote content via
  // mammoth's `convertToHtml` with `includeDefaultStyleMap: false` so we can
  // inspect the raw HTML footnote anchors, PLUS a raw XML read for the actual text.

  // Strategy: use mammoth's internal API to read footnotes from word/footnotes.xml
  const JSZip = require('../node_modules/jszip');

  const buf = fs.readFileSync(DOCX_PATH);
  const zip = await JSZip.loadAsync(buf);

  const footnoteFiles = [
    'word/footnotes.xml',
    'word/endnotes.xml',
  ];

  const allNotes = [];

  for (const fname of footnoteFiles) {
    const file = zip.file(fname);
    if (!file) {
      console.log(`  (no ${fname} found)`);
      continue;
    }
    const xml = await file.async('string');
    // Extract each w:footnote / w:endnote element
    const nodeTag = fname.includes('endnote') ? 'w:endnote' : 'w:footnote';
    // Regex to pull out each note block
    const noteRe = new RegExp(`<${nodeTag}[^>]*w:id="(\\d+)"[^>]*>([\\s\\S]*?)<\\/${nodeTag}>`, 'g');
    let m;
    while ((m = noteRe.exec(xml)) !== null) {
      const id   = parseInt(m[1], 10);
      const body = m[2];

      // Skip separator notes (id 0 and -1 in OOXML are separators)
      if (id <= 0) continue;

      // Extract plain text from w:t elements
      const textRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
      let tm;
      const parts = [];
      while ((tm = textRe.exec(body)) !== null) {
        parts.push(tm[1]);
      }
      const text = parts.join('').trim();
      if (!text) continue;

      allNotes.push({ id, text, source: fname });
    }
  }

  if (allNotes.length === 0) {
    console.log('No footnotes/endnotes found via XML parse. Falling back to mammoth HTML…\n');

    // Fallback: embed footnotes in converted HTML and parse <sup> markers
    const result = await mammoth.convertToHtml(
      { buffer: buf },
      { includeEmbeddedStyleMap: false }
    );
    const html = result.value;
    // mammoth renders footnotes as <ol> at the end with li elements
    // Each footnote ref becomes <sup><a href="#footnote-N">N</a></sup>
    // and footnote bodies are <li id="footnote-N">…</li>
    const liRe = /<li id="footnote-(\d+)">([\s\S]*?)<\/li>/g;
    let lm;
    while ((lm = liRe.exec(html)) !== null) {
      const id   = parseInt(lm[1], 10);
      const text = lm[2].replace(/<[^>]+>/g, '').trim();
      allNotes.push({ id, text, source: 'html-fallback' });
    }
  }

  allNotes.sort((a, b) => a.id - b.id);

  console.log(`Total footnotes/endnotes found: ${allNotes.length}\n`);
  console.log('═'.repeat(72));

  // ── First 30 ──
  const first30 = allNotes.slice(0, 30);
  const counts  = { 'pure-citation': 0, explanatory: 0, mixed: 0, other: 0 };

  first30.forEach((note, i) => {
    const cat = categorize(note.text);
    counts[cat]++;
    const label = cat.padEnd(14);
    const preview = note.text.length > 140
      ? note.text.slice(0, 140) + '…'
      : note.text;
    console.log(`[${String(i + 1).padStart(2)}] id=${note.id}  [${label}]`);
    console.log(`     ${preview}`);
    console.log();
  });

  // ── Full-corpus categorisation ──
  const allCounts = { 'pure-citation': 0, explanatory: 0, mixed: 0, other: 0 };
  allNotes.forEach(n => allCounts[categorize(n.text)]++);

  console.log('═'.repeat(72));
  console.log('\nCATEGORY BREAKDOWN — first 30:');
  Object.entries(counts).forEach(([k, v]) =>
    console.log(`  ${k.padEnd(16)} ${v}`)
  );

  console.log('\nCATEGORY BREAKDOWN — all ' + allNotes.length + ' notes:');
  Object.entries(allCounts).forEach(([k, v]) =>
    console.log(`  ${k.padEnd(16)} ${v}  (${Math.round(v / allNotes.length * 100)}%)`)
  );
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
