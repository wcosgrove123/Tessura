#!/usr/bin/env node
'use strict';

/**
 * Import Script: Same Means.docx → Tessera Data
 *
 * Parses the full thesis docx using XML extraction (jszip + xmldom)
 * to produce structured sections, citations, sources, and notes.
 *
 * Outputs:
 *   src/data/imported-pos-data.json — Complete import payload
 *   src/data/projects.js — Regenerated with new PoS content + preserved Calculus/Dictionary
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('../node_modules/jszip');
const { DOMParser } = require('../node_modules/@xmldom/xmldom');

// ─── Config ──────────────────────────────────────────────────────────────────

const DOCX_PATH = path.resolve(
  'C:/Users/Wil Cosgrove/OneDrive/Documents/Personal/Philosophy/Education/Purpose of School/Full Drafts/Same Means v2.docx'
);

const OUTPUT_JSON = path.resolve(__dirname, '../src/data/imported-pos-data.json');
const OUTPUT_PROJECTS = path.resolve(__dirname, '../src/data/projects.js');

// ─── Linked terms for detection ──────────────────────────────────────────────

const LINKED_TERM_NAMES = [
  'axiomatica', 'axiomatics', 'axiomation', 'axiomatist', 'axiomatize',
  'axis', 'bond', 'cognesce', 'cogniscence', 'cogniscent',
  'consciousness', 'constellaration', 'constellare', 'constellation', 'contexture',
  'emotion', 'endologue', 'endospection', 'endospecture', 'endosphere',
  'exofield', 'exologue', 'exospection', 'exospecture', 'exosphere',
  'fluxion', 'gravity', 'instinct', 'life', 'memory',
  'metacognition', 'nebula', 'noema', 'noemagraph', 'noemascape',
  'noemata', 'noematic', 'omnipere', 'omniperegrination', 'oppression',
  'perifield', 'projection', 'refractal', 'refraction', 'refracture',
  'schema', 'schemata', 'schematize', 'tesseractic', 'thought',
  'threshold', 'trace', 'versate', 'versation', 'verso', 'versologue',
];

const TERM_REGEXES = LINKED_TERM_NAMES.map(t => ({
  name: t,
  regex: new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
}));

function detectLinkedTerms(text) {
  return TERM_REGEXES.filter(tr => tr.regex.test(text)).map(tr => tr.name);
}

// ─── XML Helpers ─────────────────────────────────────────────────────────────

const NSMAP = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
};

function getAttr(el, ns, name) {
  return el.getAttributeNS?.(NSMAP[ns] || '', name) || el.getAttribute?.(`${ns}:${name}`) || '';
}

function getChildrenByTag(el, ns, tag) {
  const results = [];
  if (!el || !el.childNodes) return results;
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i];
    if (child.localName === tag || child.nodeName === `${ns}:${tag}`) {
      results.push(child);
    }
  }
  return results;
}

function getAllByTag(el, ns, tag) {
  return Array.from(el.getElementsByTagName(`${ns}:${tag}`));
}

function getTextContent(el) {
  if (!el) return '';
  const texts = [];
  const tNodes = getAllByTag(el, 'w', 't');
  for (const t of tNodes) {
    texts.push(t.textContent || '');
  }
  return texts.join('');
}

// ─── Style Extraction ────────────────────────────────────────────────────────

function getParagraphStyle(pEl) {
  const pPr = getChildrenByTag(pEl, 'w', 'pPr')[0];
  if (!pPr) return 'Normal';
  const pStyle = getChildrenByTag(pPr, 'w', 'pStyle')[0];
  if (!pStyle) return 'Normal';
  return getAttr(pStyle, 'w', 'val') || 'Normal';
}

function getHeadingLevel(style) {
  const match = style.match(/^Heading(\d)$/);
  return match ? parseInt(match[1]) : 0;
}

function hasNumbering(pEl) {
  const pPr = getChildrenByTag(pEl, 'w', 'pPr')[0];
  if (!pPr) return false;
  const numPr = getChildrenByTag(pPr, 'w', 'numPr')[0];
  return !!numPr;
}

function isBoldOnly(pEl) {
  const runs = getChildrenByTag(pEl, 'w', 'r');
  if (runs.length === 0) return false;
  const text = getTextContent(pEl).trim();
  if (!text || text.length >= 100) return false;

  let allBold = true;
  for (const r of runs) {
    const rPr = getChildrenByTag(r, 'w', 'rPr')[0];
    const t = getTextContent(r).trim();
    if (!t) continue; // skip empty runs
    if (!rPr) { allBold = false; break; }
    const bold = getChildrenByTag(rPr, 'w', 'b')[0];
    if (!bold) { allBold = false; break; }
  }
  return allBold && text.length > 2;
}

// ─── Footnote Reference Detection ────────────────────────────────────────────

function getFootnoteRefs(pEl) {
  const refs = [];
  const fnRefs = getAllByTag(pEl, 'w', 'footnoteReference');
  for (const ref of fnRefs) {
    const id = getAttr(ref, 'w', 'id');
    if (id && id !== '0' && id !== '-1') {
      refs.push(parseInt(id));
    }
  }
  return refs;
}

// ─── Comment Range Detection ─────────────────────────────────────────────────

function getCommentRefs(pEl) {
  const refs = [];
  const starts = getAllByTag(pEl, 'w', 'commentRangeStart');
  for (const s of starts) {
    const id = getAttr(s, 'w', 'id');
    if (id) refs.push(parseInt(id));
  }
  // Also check for commentReference in runs
  const commentRefs = getAllByTag(pEl, 'w', 'commentReference');
  for (const cr of commentRefs) {
    const id = getAttr(cr, 'w', 'id');
    if (id && !refs.includes(parseInt(id))) refs.push(parseInt(id));
  }
  return refs;
}

// ─── Section ID Generation ───────────────────────────────────────────────────

function toKebab(text) {
  return text
    .toLowerCase()
    .replace(/[""'']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

const usedIds = new Set();
function uniqueId(base) {
  let id = base;
  let counter = 2;
  while (usedIds.has(id)) {
    id = `${base}-${counter}`;
    counter++;
  }
  usedIds.add(id);
  return id;
}

// ─── Meta-commentary detection ───────────────────────────────────────────────

const META_PREFIXES = [
  'working draft', 'section summary', 'draft for:', 'what comes next',
  'this draft covers', 'comments from your outline', 'remaining open comments',
  'remaining items deferred', 'transition into section', 'section b fixes',
  'section c fixes', 'section d fixes', 'section e fixes', 'two changes to make',
  'approximate paragraph count', 'no instances of',
];

const META_PATTERNS = [
  /^comments?\s+\d+[\-–]\d+\s*:/i,
  /^comment\s+\d+\s*:/i,
  /^comment\s+\d+\s+fix/i,
  /^draft comment\s+\d+/i,
  /^d\+e\.\d/i,
  /^section [a-z] ends with/i,
  /^the transition sentence between/i,
  /^axiometrica calculus/i,
  /^formal introduction of the six/i,
  /^assessment architecture for/i,
  /^communication as a core/i,
  /^banking logic embedded/i,
];

function isMetaCommentary(text) {
  const lower = text.toLowerCase().trim();
  if (META_PREFIXES.some(p => lower.startsWith(p) || lower === p)) return true;
  if (META_PATTERNS.some(p => p.test(text))) return true;
  if (lower.includes('purple-bordered notes throughout')) return true;
  return false;
}

// ─── Part boundary markers ───────────────────────────────────────────────────

const PART_MARKERS = [
  { pattern: /\[END OF [""]?WHY[""]?\]/i, type: 'end', section: 'why' },
  { pattern: /\[BEGINNING OF [""]?WHAT[""]?\]/i, type: 'start', section: 'what' },
  { pattern: /\[END OF [""]?WHAT[""]?\]/i, type: 'end', section: 'what' },
  { pattern: /\[BEGINNING OF [""]?WHO[""]?\]/i, type: 'start', section: 'who' },
  { pattern: /\[END OF [""]?WHO[""]?\]/i, type: 'end', section: 'who' },
];

function checkPartMarker(text) {
  for (const m of PART_MARKERS) {
    if (m.pattern.test(text)) return m;
  }
  return null;
}

// ─── Outline content heuristic ───────────────────────────────────────────────

function isOutlineContent(text) {
  const t = text.trim();
  // Numbered items: "7.0 Introduction", "8.1 The Problem", "9.2 Why..."
  if (/^\d+\.\d+\s/.test(t)) return true;
  // Short bold-label lines ending with colon: "The Role of the Facilitator:"
  if (t.endsWith(':') && t.length < 80) return true;
  // Bullet-style: starts with dash/bullet/arrow
  if (/^[\-\u2022\u2013\u2014\u25CF\u25CB\u27A4►→]\s/.test(t)) return true;
  // Very short lines that look like outline items (< 10 words, no period/question mark at end)
  const words = t.split(/\s+/).length;
  if (words <= 10 && !t.endsWith('.') && !t.endsWith('?') && !t.endsWith('"') && /^[A-Z]/.test(t)) return true;
  // "Node 1:", "Step 2:", numbered labels
  if (/^(?:Node|Step|Phase|Stage|Level|Part)\s+\d+/i.test(t)) return true;
  // K-5/6-12 grade ranges with colons
  if (/^[K\d]+[\-–]\d+\s*\(/.test(t)) return true;
  return false;
}

// ─── Spine role detection ────────────────────────────────────────────────────

function detectSpineRole(text, isFirst) {
  if (isFirst) return 'setup';
  const lower = text.toLowerCase();
  if (lower.startsWith('for example') || lower.startsWith('consider ')) return 'evidence';
  if (lower.startsWith('in summary') || lower.startsWith('therefore') || lower.startsWith('thus')) return 'synthesis';
  if (lower.startsWith('this leads') || lower.startsWith('moving ') || lower.startsWith('turning ')) return 'bridge';
  if (lower.startsWith('in other words') || lower.startsWith('to put it')) return 'synthesis';
  if (lower.startsWith('the question') || lower.startsWith('what if') || lower.startsWith('but ')) return 'claim';
  return 'claim';
}

// ─── Citation Parsing ────────────────────────────────────────────────────────

/**
 * Classify a footnote as bibliographic, discursive, cross-ref, or draft.
 */
function classifyFootnote(text) {
  const t = text.trim();
  const wordCount = t.split(/\s+/).length;

  // Cross-reference
  if (/^see\s+/i.test(t) || /^explored more in/i.test(t) || /^cf\.\s/i.test(t)) {
    return 'cross-ref';
  }

  // Draft placeholder (very short, informal)
  if (wordCount <= 8 && (/--\s*eh$/i.test(t) || /\.\.\.$/.test(t) || /^no\s+/i.test(t))) {
    return 'draft';
  }

  // Discursive (long prose with multiple sentences)
  const sentences = t.split(/[.!?]+\s+/).filter(s => s.length > 10);
  if (sentences.length >= 3 && wordCount > 50) {
    // But check if it ends with a citation — mixed discursive+citation
    if (hasCitationPattern(t)) return 'mixed';
    return 'discursive';
  }

  // Bibliographic
  if (hasCitationPattern(t)) return 'bibliographic';

  // Short but not clearly a citation
  if (wordCount <= 15) return 'bibliographic'; // assume short-form citation

  // Longer text without clear citation markers → discursive
  if (wordCount > 30) return 'discursive';

  return 'bibliographic';
}

function hasCitationPattern(text) {
  // Has author-like start + title or year
  if (/^[A-Z][a-z]+(\s+[A-Z]\.?\s*)?[,.]/.test(text)) return true;
  // Has quoted title
  if (/[""\u201C].+?[""\u201D]/.test(text)) return true;
  // Has year pattern
  if (/\b(1[6-9]\d{2}|20[0-2]\d)\b/.test(text)) return true;
  // Has page reference
  if (/\bp{1,2}\.\s*\d+/i.test(text)) return true;
  // Has URL
  if (/https?:\/\//i.test(text)) return true;
  // Has DOI
  if (/doi\.org/i.test(text)) return true;
  return false;
}

/**
 * Parse a Chicago NB footnote into a Source-like object.
 * Returns null if unparseable.
 */
function parseChicagoFootnote(text) {
  const t = text.trim();
  const source = {
    type: 'book',
    authors: [],
    title: '',
    year: '',
    publisher: null,
    journal: null,
    volume: null,
    issue: null,
    pages: null,
    url: null,
    doi: null,
    locatorType: null,
    locatorValue: null,
    rawText: t,
  };

  // Extract URL
  const urlMatch = t.match(/(https?:\/\/[^\s,;.]+[^\s,;.])/);
  if (urlMatch) source.url = urlMatch[1];

  // Extract DOI
  const doiMatch = t.match(/(?:https?:\/\/)?doi\.org\/([^\s,;]+)/i);
  if (doiMatch) source.doi = doiMatch[1];

  // Extract year
  const yearMatch = t.match(/\b(1[5-9]\d{2}|20[0-2]\d)\b/);
  if (yearMatch) source.year = yearMatch[1];

  // Extract page locator - multiple patterns
  // "p. 20" or "pp. 20-23"
  let pageMatch = t.match(/\bp{1,2}\.\s*(\d+[\-–]?\d*)/i);
  // "(Year), 104." — trailing number after year
  if (!pageMatch) pageMatch = t.match(/\d{4}\)?,\s*(\d+[\-–]\d+|\d+)\s*[.,]?\s*$/);
  // ", 20-23." at end of text
  if (!pageMatch) pageMatch = t.match(/,\s*(\d+[\-–]\d+)\s*[.,]?\s*$/);
  if (pageMatch) {
    source.locatorType = 'page';
    source.locatorValue = pageMatch[1];
  }

  // Try to extract quoted title
  const quotedTitle = t.match(/[""\u201C]([^""\u201D]+)[""\u201D]/);
  if (quotedTitle) {
    source.title = quotedTitle[1].replace(/[,.]$/, '').trim();
    source.type = 'article'; // quoted titles are usually articles
  }

  // Try to extract italic/unquoted title (after author, before publisher/year)
  if (!source.title) {
    // Pattern: Author, Title (Publisher, Year)
    const titleMatch = t.match(/^[^,]+,\s+(.+?)(?:\s*\(|,\s*\d{4}|,\s*(?:ed\.|vol\.|no\.))/i);
    if (titleMatch) {
      source.title = titleMatch[1].replace(/[,.]$/, '').trim();
    }
  }

  // Extract authors - Chicago pattern: "First Last" or "Last, First"
  // Split at first quoted title, or at comma followed by title-like text
  let authorText = '';

  // Try splitting at quoted title
  const quoteSplit = t.split(/[""\u201C]/);
  if (quoteSplit.length > 1) {
    authorText = quoteSplit[0];
  } else {
    // Try splitting at first comma followed by a capitalized word that looks like a title
    const firstComma = t.match(/^([^,]+),\s+/);
    if (firstComma) authorText = firstComma[1];
  }

  // Clean author text
  authorText = authorText
    .replace(/\s*,$/, '')
    .replace(/\s*,?\s*ed\.?\s*$/i, '') // remove ", ed." or "ed."
    .replace(/\s*,?\s*eds\.?\s*$/i, '') // remove ", eds."
    .replace(/\s*et al\.?\s*$/i, '') // handle "et al." (keep partial)
    .trim();

  const hasEtAl = /et al\.?/i.test(t.split(/[""\u201C]/)[0] || '');

  if (authorText && authorText.length > 1 && authorText.length < 80) {
    // Multiple authors: "First Last, Second Author, and Third Author"
    const authorParts = authorText.split(/,?\s+and\s+/i);
    for (let part of authorParts) {
      part = part.trim();
      if (!part || part.length < 2) continue;

      // Skip non-author text (numbers, legal names, etc.)
      if (/^\d/.test(part) || /^A Bill/i.test(part) || /^Ordinance/i.test(part)) continue;

      // "Last, First" pattern (e.g., "Burns, James P.")
      const commaMatch = part.match(/^([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+)*),\s*([A-Z][a-z.'-]+(?:\s+[A-Z]\.?)*)/);
      if (commaMatch) {
        source.authors.push({ family: commaMatch[1], given: commaMatch[2].replace(/\.$/, '') });
        continue;
      }

      // "First M. Last" or "First Last" pattern
      const spaceMatch = part.match(/^([A-Z][a-z.'-]+(?:\s+[A-Z]\.?)*)\s+([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+)*)$/);
      if (spaceMatch) {
        source.authors.push({ given: spaceMatch[1], family: spaceMatch[2] });
        continue;
      }

      // "F. Siclari" pattern (initial + last name)
      const initialMatch = part.match(/^([A-Z]\.\s*(?:[A-Z]\.\s*)?)\s*([A-Z][a-z'-]+)$/);
      if (initialMatch) {
        source.authors.push({ given: initialMatch[1].trim(), family: initialMatch[2] });
        continue;
      }

      // Organization or single-name author
      if (/^[A-Z]/.test(part) && part.split(/\s+/).length <= 5) {
        // Try to split "Benjamin Bloom" type
        const words = part.split(/\s+/);
        if (words.length === 2 && /^[A-Z]/.test(words[0]) && /^[A-Z]/.test(words[1])) {
          source.authors.push({ given: words[0], family: words[1] });
        } else if (words.length >= 3) {
          source.authors.push({ given: words.slice(0, -1).join(' '), family: words[words.length - 1] });
        } else {
          source.authors.push({ family: part, given: '' });
        }
      }
    }

    if (hasEtAl && source.authors.length > 0) {
      // Mark that there are more authors
      source.authors[0]._etAl = true;
    }
  }

  // Extract journal
  const journalMatch = t.match(/[""\u201D][,.]?\s+([A-Z][^,]+?)\s+\d+,?\s+no\.\s*\d+/);
  if (journalMatch) {
    source.journal = journalMatch[1].trim();
    source.type = 'article';

    const volMatch = t.match(/(\d+),?\s+no\.\s*(\d+)/);
    if (volMatch) {
      source.volume = volMatch[1];
      source.issue = volMatch[2];
    }

    const pagesMatch = t.match(/:\s*(\d+[\-–]\d+)/);
    if (pagesMatch) source.pages = pagesMatch[1];
  }

  // Extract publisher (in parentheses or after last comma before year)
  const pubMatch = t.match(/\(([^()]+?),\s*\d{4}\)/);
  if (pubMatch) {
    source.publisher = pubMatch[1].trim();
  }

  // Detect lecture
  if (/\blecture\b/i.test(t)) source.type = 'lecture';
  // Detect legal
  if (/\b(?:United States Code|General Assembly|Ordinance)\b/i.test(t)) source.type = 'legal';
  // Detect website
  if (source.url && !source.journal && !source.publisher) source.type = 'website';
  // Detect video
  if (/\b(?:TV Show|film|aired)\b/i.test(t)) source.type = 'video';

  // If we have no title but have text, use the whole thing minus author as title
  if (!source.title && source.authors.length > 0) {
    const afterAuthor = t.slice(authorText.length).replace(/^[,.\s]+/, '').trim();
    // Take up to the year or URL
    const titleEnd = afterAuthor.search(/\b\d{4}\b|https?:\/\//);
    source.title = titleEnd > 0 ? afterAuthor.slice(0, titleEnd).replace(/[,.]$/, '').trim() : afterAuthor.split('.')[0].trim();
  }

  return source;
}

/**
 * Check if a short-form citation matches a known source.
 * Short-form: "Author, Title, page" or "Author, page"
 */
function matchShortForm(text, sources) {
  const t = text.trim().toLowerCase();

  for (const src of sources) {
    if (!src.authors.length) continue;
    const lastName = src.authors[0].family?.toLowerCase();
    if (!lastName) continue;

    // Check if text starts with or contains the author's last name
    if (!t.includes(lastName)) continue;

    // Check if title (or first few words) appears
    if (src.title) {
      const titleWords = src.title.toLowerCase().split(/\s+/).slice(0, 4).join(' ');
      if (titleWords.length > 5 && t.includes(titleWords.slice(0, 15))) {
        return src;
      }
    }

    // Author + page reference in a short text → likely short-form
    if (/\bp{1,2}\.\s*\d+/i.test(t) && t.split(/\s+/).length <= 15) {
      return src;
    }

    // Author + year match
    if (src.year && t.includes(src.year)) {
      return src;
    }
  }
  return null;
}

// ─── Comment Categorization ──────────────────────────────────────────────────

function recommendCommentCategory(text) {
  const lower = text.toLowerCase();

  if (/\bcite\b|\bcitation\b|\bfind citation|\bstill need to cite/i.test(lower)) return 'task';
  if (/\bstress test/i.test(lower)) return 'task';
  if (/\badd to dictionary\b|\bindex\b|\bdictionary\b/i.test(lower)) return 'task';
  if (/\bfix\b|\brewrite\b|\bdelete\b|\bremove\b/i.test(lower)) return 'task';
  if (/\bintroduce\b|\bintroduce and cite/i.test(lower)) return 'task';
  if (/\bdefine\b|\bdefine here/i.test(lower)) return 'task';
  if (/\bbetter word\b|\bdon't like\b|\bshould be\b/i.test(lower)) return 'comment';
  if (text.split(/\s+/).length > 30) return 'idea';

  return 'comment';
}

// ─── Main Import Function ────────────────────────────────────────────────────

async function main() {
  console.log('=== Tessera Import: Same Means.docx ===\n');

  if (!fs.existsSync(DOCX_PATH)) {
    console.error('ERROR: File not found:', DOCX_PATH);
    process.exit(1);
  }

  // Load and extract docx
  const buf = fs.readFileSync(DOCX_PATH);
  const zip = await JSZip.loadAsync(buf);

  const docXml = await zip.file('word/document.xml').async('string');
  const fnXml = await zip.file('word/footnotes.xml')?.async('string');
  const commXml = await zip.file('word/comments.xml')?.async('string');

  const parser = new DOMParser();
  const docDom = parser.parseFromString(docXml, 'text/xml');
  const fnDom = fnXml ? parser.parseFromString(fnXml, 'text/xml') : null;
  const commDom = commXml ? parser.parseFromString(commXml, 'text/xml') : null;

  // ─── 1. Parse footnotes ──────────────────────────────────────────────────

  console.log('Parsing footnotes...');
  const footnotes = {};
  if (fnDom) {
    const fnEls = getAllByTag(fnDom, 'w', 'footnote');
    for (const fn of fnEls) {
      const id = getAttr(fn, 'w', 'id');
      if (id === '0' || id === '-1') continue; // separator/continuation
      const text = getTextContent(fn).trim();
      if (text) footnotes[parseInt(id)] = text;
    }
  }
  console.log(`  Found ${Object.keys(footnotes).length} footnotes`);

  // ─── 2. Parse Word comments ──────────────────────────────────────────────

  console.log('Parsing Word comments...');
  const wordComments = {};
  if (commDom) {
    const commentEls = getAllByTag(commDom, 'w', 'comment');
    for (const c of commentEls) {
      const id = getAttr(c, 'w', 'id');
      const author = getAttr(c, 'w', 'author') || '';
      const date = getAttr(c, 'w', 'date') || '';
      const text = getTextContent(c).trim();
      if (text) {
        wordComments[parseInt(id)] = { id: parseInt(id), author, date, text };
      }
    }
  }
  console.log(`  Found ${Object.keys(wordComments).length} comments`);

  // ─── 3. Parse document body ──────────────────────────────────────────────

  console.log('Parsing document structure...');
  const bodyEl = getAllByTag(docDom, 'w', 'body')[0];
  const paragraphEls = getChildrenByTag(bodyEl, 'w', 'p');

  const now = Date.now();
  let paraCounter = 0;
  let noteCounter = 0;

  // Collect raw items
  const items = [];
  const partBoundaries = [];
  const commentAnchors = {}; // commentId → paragraph index

  for (let i = 0; i < paragraphEls.length; i++) {
    const pEl = paragraphEls[i];
    const style = getParagraphStyle(pEl);
    const text = getTextContent(pEl).trim();
    if (!text) continue;

    const headingLevel = getHeadingLevel(style);
    const fnRefs = getFootnoteRefs(pEl);
    const commRefs = getCommentRefs(pEl);
    const isNormalWeb = style === 'NormalWeb';
    const isBibStyle = style === 'Bibliography';
    const isList = hasNumbering(pEl);
    // Only treat bold-only text as heading if:
    // - Not NormalWeb (outline content)
    // - Not starting with a number (outline items like "7.3")
    // - Not a list item
    const boldHeading = !headingLevel && !isNormalWeb && !isList
      && !/^\d+[\.\):]/.test(text) && isBoldOnly(pEl);

    // Track comment anchors
    for (const cId of commRefs) {
      commentAnchors[cId] = items.length;
    }

    // Check for part boundary markers
    const marker = checkPartMarker(text);
    if (marker) {
      partBoundaries.push({ ...marker, itemIndex: items.length, text });
      // Don't skip — these may be in paragraphs we want to keep
    }

    // Skip bibliography style paragraphs
    if (isBibStyle) continue;

    // Part boundary markers → record and skip (don't create sections)
    if (marker) {
      // These are section markers like [END OF "WHY"], not content
      continue;
    }

    // Section inline markers like [Section 7: ...] → skip
    if (/^\[(?:Section|END|BEGINNING)\s/i.test(text)) continue;

    // Meta-commentary → extract as notes
    if (isMetaCommentary(text)) {
      noteCounter++;
      items.push({
        type: 'meta',
        text,
        style,
        noteId: `imp-note-${now}-${noteCounter}`,
      });
      continue;
    }

    if (headingLevel > 0) {
      items.push({ type: 'heading', level: headingLevel, text, style, index: i, fnRefs, commRefs });
    } else if (boldHeading) {
      items.push({ type: 'bold-heading', text, style, index: i, fnRefs, commRefs });
    } else {
      paraCounter++;
      items.push({
        type: 'paragraph',
        text,
        style,
        index: i,
        fnRefs,
        commRefs,
        isNormalWeb,
        isList,
      });
    }
  }

  console.log(`  Found ${items.filter(i => i.type === 'heading').length} headings`);
  console.log(`  Found ${items.filter(i => i.type === 'paragraph').length} paragraphs`);
  console.log(`  Found ${items.filter(i => i.type === 'bold-heading').length} bold headings`);
  console.log(`  Found ${items.filter(i => i.type === 'meta').length} meta-commentary items`);
  console.log(`  Found ${partBoundaries.length} part boundary markers`);

  // ─── 4. Build section tree ─────────────────────────────────────────────

  console.log('\nBuilding section tree...');

  // First H1 is document title
  const firstH1 = items.find(i => i.type === 'heading' && i.level === 1);
  const docTitle = firstH1 ? firstH1.text : 'Same Means';

  // Part I sections (WHY, WHAT, WHO) — detected by H1 headings
  // Part II sections (Implementation) — everything after WHO
  const part1H1s = new Set([
    'INTRODUCTION',
  ]);

  // Map headings to sections
  const allSections = [];
  const sectionStack = []; // [{section, level}]
  const paraToSection = {}; // paraId → sectionId
  const sectionToParent = {}; // sectionId → parentId

  // Group H1s into WHY/WHAT/WHO/etc based on known structure
  const introSections = [];
  const whySections = [];
  const intermissionSections = [];
  const whatSections = [];
  const whoSections = [];
  const implSections = [];
  const conclusionSections = [];
  const workingNotes = [];

  let currentGroup = 'pre'; // 'why', 'intermission', 'what', 'who', 'impl', 'conclusion', 'working'

  // Detect groups from heading text
  function detectGroup(headingText) {
    const t = headingText.toUpperCase().trim();
    if (t.includes('INTRODUCTION')) return 'introduction';
    if (t.includes('STRONG SCAFFOLD') || t.includes('PYRAMIDS BUILT') || t.includes('THERMOMETERS')) return 'why';
    if (t.includes('INTERMISSION')) return 'intermission';
    if (t.includes('CURRICULUM AS A CONCEPT')) return 'what';
    if (t.includes('WHO IS IN CHARGE') || t.includes('WHO DOES NOT HAVE')) return 'who';
    if (t.includes('SECTION 5') || t.includes('SECTION 6') || t.includes('SECTION 7') || t.includes('SECTION 8') || t.includes('SECTION 9') || t.includes('SECTION 10') || t.includes('DESIGNING A METACOGNIT') || t.includes('RETHINKING OPPRESSION') || t.includes('CURRERE') || t.includes('TECHNOLOGY') || t.includes('SO WHAT') || t.includes('CALL TO ACTION')) return 'impl';
    if (t.includes('CONCLUSION') || t.includes('IN CONCLUSION')) return 'conclusion';
    if (t.includes('IN SUMMARY') || t.includes('REMAINING STRUCTURE') || t.includes('WORKING')) return 'working';
    return null;
  }

  function currentSection() {
    return sectionStack.length > 0 ? sectionStack[sectionStack.length - 1] : null;
  }

  function makeSectionObj(text, level) {
    const id = uniqueId(toKebab(text) || `section-${now}`);
    return {
      id,
      title: text,
      spine: '',
      status: 'drafting',
      children: [],
      paragraphs: [],
      _level: level,
    };
  }

  const notes = [];
  const citationsRaw = []; // {fnId, paraId, sectionId, text}

  // Process items into sections
  for (const item of items) {
    if (item.type === 'heading') {
      const level = item.level;
      const section = makeSectionObj(item.text, level);

      if (level === 1) {
        // Detect which group this H1 belongs to
        const group = detectGroup(item.text);
        if (group) currentGroup = group;

        // H1 = top-level section
        sectionStack.length = 0;
        sectionStack.push(section);

        switch (currentGroup) {
          case 'introduction': introSections.push(section); break;
          case 'why': whySections.push(section); break;
          case 'intermission': intermissionSections.push(section); break;
          case 'what': whatSections.push(section); break;
          case 'who': whoSections.push(section); break;
          case 'impl': implSections.push(section); break;
          case 'conclusion': conclusionSections.push(section); break;
          case 'working': workingNotes.push(section); break;
          default: whySections.push(section); break;
        }
      } else {
        // H2+ = nested under appropriate parent
        const targetDepth = level - 1; // H2→depth 1, H3→depth 2, H4→depth 3
        while (sectionStack.length >= targetDepth + 1) sectionStack.pop();

        const parent = currentSection();
        if (parent) {
          parent.children.push(section);
          sectionToParent[section.id] = parent.id;
        } else {
          // No parent — put in current group
          switch (currentGroup) {
            case 'introduction': introSections.push(section); break;
            case 'why': whySections.push(section); break;
            case 'intermission': intermissionSections.push(section); break;
            case 'what': whatSections.push(section); break;
            case 'who': whoSections.push(section); break;
            case 'impl': implSections.push(section); break;
            case 'conclusion': conclusionSections.push(section); break;
            case 'working': workingNotes.push(section); break;
            default: implSections.push(section); break;
          }
        }
        sectionStack.push(section);
      }
    } else if (item.type === 'bold-heading') {
      const section = makeSectionObj(item.text, 99); // arbitrary deep level
      const parent = currentSection();
      if (parent) {
        parent.children.push(section);
        sectionToParent[section.id] = parent.id;
      }
      sectionStack.push(section);
    } else if (item.type === 'paragraph') {
      const ownerSection = currentSection();
      const paraId = `${ownerSection?.id || 'root'}-p${++paraCounter}`;
      const isFirst = ownerSection ? ownerSection.paragraphs.length === 0 : false;

      // Build paragraph text with footnote markers
      let paraText = item.text;

      const para = {
        id: paraId,
        text: paraText,
        status: (item.isNormalWeb || isOutlineContent(paraText)) ? 'brainstorm' : 'drafting',
        spineRole: detectSpineRole(paraText, isFirst),
        linkedTerms: detectLinkedTerms(paraText),
      };

      if (ownerSection) {
        ownerSection.paragraphs.push(para);
        paraToSection[paraId] = ownerSection.id;
      }

      // Track footnote references for citation creation
      for (const fnId of item.fnRefs) {
        citationsRaw.push({
          fnId,
          paraId,
          sectionId: ownerSection?.id || null,
          fnText: footnotes[fnId] || '',
        });
      }

      // Track comment anchors
      for (const cId of item.commRefs) {
        if (wordComments[cId]) {
          wordComments[cId].anchorParaId = paraId;
          wordComments[cId].anchorSectionId = ownerSection?.id || null;
          wordComments[cId].anchorExcerpt = paraText.slice(0, 100);
        }
      }
    } else if (item.type === 'meta') {
      noteCounter++;
      const ownerSection = currentSection();
      notes.push({
        id: item.noteId,
        category: 'task',
        text: item.text,
        tags: ['imported', 'meta-commentary'],
        linkedProjectId: 'purpose-of-schools',
        linkedSectionId: ownerSection?.id || null,
        linkedParagraphId: null,
        inlineRange: null,
        resolved: false,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // ─── 5. Process footnotes → Sources + Citations ──────────────────────

  console.log('\nProcessing footnotes into citations and sources...');

  const sources = [];
  const citations = [];
  const sourceMap = {}; // citationKey → source

  for (const cr of citationsRaw) {
    if (!cr.fnText) continue;

    const fnType = classifyFootnote(cr.fnText);

    if (fnType === 'cross-ref' || fnType === 'draft') {
      noteCounter++;
      notes.push({
        id: `imp-note-${now}-${++noteCounter}`,
        category: fnType === 'draft' ? 'task' : 'comment',
        text: cr.fnText,
        tags: ['imported', 'footnote', fnType === 'draft' ? 'draft-placeholder' : 'cross-ref'],
        linkedProjectId: 'purpose-of-schools',
        linkedSectionId: cr.sectionId,
        linkedParagraphId: cr.paraId,
        inlineRange: null,
        resolved: false,
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    if (fnType === 'discursive') {
      noteCounter++;
      notes.push({
        id: `imp-note-${now}-${++noteCounter}`,
        category: 'comment',
        text: cr.fnText,
        tags: ['imported', 'footnote', 'discursive'],
        linkedProjectId: 'purpose-of-schools',
        linkedSectionId: cr.sectionId,
        linkedParagraphId: cr.paraId,
        inlineRange: null,
        resolved: false,
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    // Bibliographic or mixed — parse as citation
    const parsed = parseChicagoFootnote(cr.fnText);

    if (!parsed || (!parsed.title && parsed.authors.length === 0)) {
      // Couldn't parse — save as note
      noteCounter++;
      notes.push({
        id: `imp-note-${now}-${++noteCounter}`,
        category: 'bibliography',
        text: cr.fnText,
        tags: ['imported', 'footnote', 'unparsed'],
        linkedProjectId: 'purpose-of-schools',
        linkedSectionId: cr.sectionId,
        linkedParagraphId: cr.paraId,
        inlineRange: null,
        resolved: false,
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    // Generate citation key
    const citKey = generateCitationKey(parsed.authors, parsed.year);

    // Check if this is a short-form citation of an existing source
    let existingSource = sourceMap[citKey];

    if (!existingSource) {
      // Try matching by author last name
      const matchedSource = matchShortForm(cr.fnText, sources);
      if (matchedSource) {
        existingSource = matchedSource;
      }
    }

    if (!existingSource) {
      // Create new source
      const srcId = `src-${now}-${sources.length + 1}`;
      const newSource = {
        id: srcId,
        citationKey: citKey,
        type: parsed.type,
        authors: parsed.authors,
        title: parsed.title,
        year: parsed.year,
        publisher: parsed.publisher,
        journal: parsed.journal,
        volume: parsed.volume,
        issue: parsed.issue,
        pages: parsed.pages,
        url: parsed.url,
        doi: parsed.doi,
        abstract: '',
        usageNotes: [],
        tags: ['imported'],
        category: 'cited',
        zoteroKey: null,
        formattedBib: cr.fnText, // store raw footnote as formatted bib
        cslJson: null,
        createdAt: now,
        updatedAt: now,
      };
      sources.push(newSource);
      sourceMap[citKey] = newSource;
      existingSource = newSource;
    }

    // Create citation
    const citeId = `cite-${now}-${citations.length + 1}`;
    citations.push({
      id: citeId,
      sourceId: existingSource.id,
      projectId: 'purpose-of-schools',
      sectionId: cr.sectionId,
      paragraphId: cr.paraId,
      anchorText: '',
      locator: parsed.locatorType ? {
        type: parsed.locatorType,
        value: parsed.locatorValue,
      } : { type: 'page', value: '' },
      footnoteText: cr.fnText,
      inlineRange: null,
      noteIndex: cr.fnId,
      createdAt: now,
    });
  }

  console.log(`  Created ${sources.length} sources`);
  console.log(`  Created ${citations.length} citations`);

  // ─── 6. Process Word comments → Notes ────────────────────────────────

  console.log('\nProcessing Word comments...');

  const commentNotes = [];
  for (const [idStr, comment] of Object.entries(wordComments)) {
    noteCounter++;
    const recCat = recommendCommentCategory(comment.text);
    commentNotes.push({
      id: `imp-note-${now}-${++noteCounter}`,
      category: recCat,
      text: comment.text,
      tags: ['imported', 'word-comment'],
      linkedProjectId: 'purpose-of-schools',
      linkedSectionId: comment.anchorSectionId || null,
      linkedParagraphId: comment.anchorParaId || null,
      inlineRange: null,
      resolved: false,
      createdAt: comment.date ? new Date(comment.date).getTime() : now,
      updatedAt: now,
      _recommendedCategory: recCat,
      _reviewStatus: 'pending',
      _author: comment.author,
      _anchorExcerpt: comment.anchorExcerpt || '',
      _wordCommentId: comment.id,
    });
  }

  console.log(`  Created ${commentNotes.length} comment notes`);
  const allNotes = [...notes, ...commentNotes];

  // ─── 7. Build the project structure ──────────────────────────────────

  console.log('\nBuilding project structure...');

  // Clean _level from sections (used internally)
  function cleanSection(sec) {
    const { _level, ...rest } = sec;
    const cleaned = {
      ...rest,
      children: sec.children.map(cleanSection),
    };
    // Auto-set section status to brainstorm if ALL paragraphs (including descendants) are brainstorm
    const allParas = [];
    function collect(s) { allParas.push(...(s.paragraphs || [])); (s.children || []).forEach(collect); }
    collect(cleaned);
    if (allParas.length > 0 && allParas.every(p => p.status === 'brainstorm')) {
      cleaned.status = 'brainstorm';
    }
    return cleaned;
  }

  // Build section wrappers — Introduction and Intermission are standalone top-level
  const introChildren = introSections.map(cleanSection);
  const intermissionChildren = intermissionSections.map(cleanSection);

  const whySection = {
    id: uniqueId('why'),
    title: 'WHY',
    spine: 'The current system is broken because it has always prioritized content over cognition.',
    status: 'revised',
    children: whySections.map(cleanSection),
    paragraphs: [],
  };

  const whatSection = {
    id: uniqueId('what'),
    title: 'WHAT',
    spine: 'Curriculum is not a thing but a relational space — a contexture.',
    status: 'revised',
    children: whatSections.map(cleanSection),
    paragraphs: [],
  };

  const whoSection = {
    id: uniqueId('who'),
    title: 'WHO',
    spine: 'Power flows through curriculum — who designs it, who enforces it, and who is excluded by it.',
    status: 'drafting',
    children: whoSections.map(cleanSection),
    paragraphs: [],
  };

  const posProject = {
    id: 'purpose-of-schools',
    name: 'Purpose of Schools',
    icon: '\u{1F4D6}',
    color: '#2A5F7C',
    parts: [
      {
        id: 'part-1',
        title: 'Part I: Philosophy & Rationale',
        subtitle: 'The foundation — why, what, and who',
        children: [...introChildren, whySection, ...intermissionChildren, whatSection, whoSection],
      },
      {
        id: 'part-2',
        title: 'Part II: Implementation',
        subtitle: 'The proposal — rethinking, designing, scaling',
        children: implSections.map(cleanSection),
      },
      {
        id: 'conclusion',
        title: 'Conclusion',
        subtitle: '',
        children: conclusionSections.map(cleanSection),
      },
      {
        id: 'working-notes',
        title: 'Working Notes',
        subtitle: 'Planning, meta-content, and editorial notes',
        children: workingNotes.map(cleanSection),
      },
    ],
  };

  // ─── 8. QC metadata ──────────────────────────────────────────────────

  function countSections(sections) {
    let count = sections.length;
    for (const s of sections) count += countSections(s.children || []);
    return count;
  }

  function countParagraphs(sections) {
    let count = 0;
    for (const s of sections) {
      count += (s.paragraphs || []).length;
      count += countParagraphs(s.children || []);
    }
    return count;
  }

  function findEmptySections(sections, result = []) {
    for (const s of sections) {
      if ((!s.paragraphs || s.paragraphs.length === 0) && (!s.children || s.children.length === 0)) {
        result.push({ id: s.id, title: s.title });
      }
      findEmptySections(s.children || [], result);
    }
    return result;
  }

  const totalSections = posProject.parts.reduce((acc, p) => acc + countSections(p.children), 0);
  const totalParagraphs = posProject.parts.reduce((acc, p) => acc + countParagraphs(p.children), 0);
  const emptySections = posProject.parts.reduce((acc, p) => [...acc, ...findEmptySections(p.children)], []);

  const qc = {
    headingCount: items.filter(i => i.type === 'heading').length,
    boldHeadingCount: items.filter(i => i.type === 'bold-heading').length,
    totalSections,
    totalParagraphs,
    footnoteCount: Object.keys(footnotes).length,
    commentCount: Object.keys(wordComments).length,
    sourceCount: sources.length,
    citationCount: citations.length,
    noteCount: allNotes.length,
    partBoundaries: partBoundaries.map(b => `${b.type} ${b.section}: "${b.text}"`),
    emptySections,
    brainstormParagraphs: (() => {
      let count = 0;
      function walk(sections) {
        for (const s of sections) {
          count += (s.paragraphs || []).filter(p => p.status === 'brainstorm').length;
          walk(s.children || []);
        }
      }
      posProject.parts.forEach(p => walk(p.children));
      return count;
    })(),
  };

  // ─── 9. Write output ────────────────────────────────────────────────

  console.log('\n=== QC Summary ===');
  console.log(`  Headings:     ${qc.headingCount} (+ ${qc.boldHeadingCount} bold headings)`);
  console.log(`  Sections:     ${qc.totalSections}`);
  console.log(`  Paragraphs:   ${qc.totalParagraphs} (${qc.brainstormParagraphs} brainstorm)`);
  console.log(`  Footnotes:    ${qc.footnoteCount}`);
  console.log(`  Comments:     ${qc.commentCount}`);
  console.log(`  Sources:      ${qc.sourceCount}`);
  console.log(`  Citations:    ${qc.citationCount}`);
  console.log(`  Notes:        ${qc.noteCount}`);
  console.log(`  Part markers: ${qc.partBoundaries.length}`);
  console.log(`  Empty sects:  ${qc.emptySections.length}`);

  if (qc.emptySections.length > 0) {
    console.log('\n  Empty sections (preserved):');
    for (const es of qc.emptySections) {
      console.log(`    - ${es.title} (${es.id})`);
    }
  }

  console.log('\n  Sources created:');
  for (const src of sources) {
    console.log(`    ${src.citationKey}: ${src.authors.map(a => a.family).join(', ')} — ${src.title.slice(0, 50)}`);
  }

  // Write JSON payload
  const payload = {
    project: posProject,
    sources,
    citations,
    notes: allNotes,
    qc,
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(payload, null, 2));
  console.log(`\nWrote ${OUTPUT_JSON}`);
  console.log(`  JSON size: ${(fs.statSync(OUTPUT_JSON).size / 1024).toFixed(1)} KB`);

  // ─── 10. Regenerate projects.js ─────────────────────────────────────

  // Read current projects.js to extract Calculus and Dictionary
  const currentProjects = fs.readFileSync(OUTPUT_PROJECTS, 'utf8');

  // Extract the AC and OD data from the current file
  // They start after the purpose-of-schools entry
  const acStart = currentProjects.indexOf('"id": "axiometric-calculus"');
  const odStart = currentProjects.indexOf('"id": "ontological-dictionary"');

  if (acStart === -1 || odStart === -1) {
    console.error('WARNING: Could not find Axiometric Calculus or Ontological Dictionary in current projects.js');
    console.log('Generating projects.js with only Purpose of Schools...');
  }

  // Build new projects array by parsing the old one to extract AC and OD
  // Since projects.js is a JS module with `const PROJECTS = [...]`, we need to evaluate it
  // Safer approach: just extract AC and OD from current projects.js using the generate-projects.cjs pattern
  const existingProjectsJs = fs.readFileSync(path.resolve(__dirname, 'generate-projects.cjs'), 'utf8');

  // Extract AC and OD from the generate-projects.cjs which has them hardcoded
  // Actually, let's just read the current projects.js as a module
  // We can do this by wrapping in a function

  let acProject, odProject;
  try {
    // Create a temporary module wrapper
    const tmpCode = currentProjects
      .replace('export default PROJECTS;', 'module.exports = PROJECTS;')
      .replace(/^\/\*\*[\s\S]*?\*\/\n*/m, ''); // remove leading comment
    const tmpFile = path.resolve(__dirname, '../src/data/_tmp_projects.cjs');
    fs.writeFileSync(tmpFile, tmpCode);
    const allProjects = require(tmpFile);
    acProject = allProjects.find(p => p.id === 'axiometric-calculus');
    odProject = allProjects.find(p => p.id === 'ontological-dictionary');
    fs.unlinkSync(tmpFile);
  } catch (e) {
    console.error('WARNING: Could not parse existing projects.js:', e.message);
    console.log('Calculus/Dictionary will need manual recovery.');
  }

  const finalProjects = [posProject];
  if (acProject) finalProjects.push(acProject);
  if (odProject) finalProjects.push(odProject);

  const output = `/**
 * Tessera Data — Auto-generated from Same Means.docx
 * Generated: ${new Date().toISOString()}
 *
 * Structure: Project → Part → Section (recursive) → Paragraphs
 * ${qc.totalParagraphs} paragraphs across ${qc.totalSections} sections
 * ${sources.length} sources, ${citations.length} citations
 */

const PROJECTS = ${JSON.stringify(finalProjects, null, 2)};

export default PROJECTS;
`;

  fs.writeFileSync(OUTPUT_PROJECTS, output);
  console.log(`\nWrote ${OUTPUT_PROJECTS}`);
  console.log(`  JS size: ${(fs.statSync(OUTPUT_PROJECTS).size / 1024).toFixed(1)} KB`);

  console.log('\n=== Import complete! ===');
  console.log('Next steps:');
  console.log('  1. Run: node scripts/qc-import.cjs');
  console.log('  2. Review comment notes in the app');
  console.log('  3. Clear localStorage and reload to pick up new data');
}

function generateCitationKey(authors, year) {
  const lastName = authors?.[0]?.family || 'unknown';
  const y = year || 'nd';
  return (lastName.toLowerCase().replace(/[^a-z]/g, '') + y).slice(0, 30);
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
