#!/usr/bin/env node
'use strict';

/**
 * Import Script: Integrated_Ontological_Dictionary v3.docx → Tessera Data
 *
 * Parses the full OD v3 docx and produces:
 *   - Updated OD project content in projects.js (preserving PoS + AC)
 *   - Updated linkedTerms.js with new/revised terms and cross-references
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('../node_modules/jszip');
const { DOMParser } = require('../node_modules/@xmldom/xmldom');

// ─── Config ──────────────────────────────────────────────────────────────────

const DOCX_PATH = path.resolve(
  'C:/Users/Wil Cosgrove/OneDrive/Documents/Personal/Philosophy/Education/Purpose of School/Ontological Dictionary/Integrated_Ontological_Dictionary v3.docx'
);
const OUTPUT_PROJECTS = path.resolve(__dirname, '../src/data/projects.js');
const OUTPUT_LINKED_TERMS = path.resolve(__dirname, '../src/data/linkedTerms.js');

// ─── XML Helpers ─────────────────────────────────────────────────────────────

const NSMAP = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
};

function getAttr(el, ns, name) {
  return el.getAttributeNS?.(NSMAP[ns] || '', name) || el.getAttribute?.(`${ns}:${name}`) || '';
}

function getChildrenByTag(el, ns, tag) {
  const results = [];
  if (!el || !el.childNodes) return results;
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i];
    if (child.localName === tag || child.nodeName === `${ns}:${tag}`) results.push(child);
  }
  return results;
}

function getAllByTag(el, ns, tag) {
  return Array.from(el.getElementsByTagName(`${ns}:${tag}`));
}

function getTextContent(el) {
  if (!el) return '';
  const tNodes = getAllByTag(el, 'w', 't');
  return tNodes.map(t => t.textContent || '').join('');
}

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

function isBoldOnly(pEl) {
  const runs = getChildrenByTag(pEl, 'w', 'r');
  if (runs.length === 0) return false;
  const text = getTextContent(pEl).trim();
  if (!text || text.length >= 120) return false;

  let allBold = true;
  for (const r of runs) {
    const rPr = getChildrenByTag(r, 'w', 'rPr')[0];
    const t = getTextContent(r).trim();
    if (!t) continue;
    if (!rPr) { allBold = false; break; }
    const bold = getChildrenByTag(rPr, 'w', 'b')[0];
    if (!bold) { allBold = false; break; }
  }
  return allBold && text.length > 2;
}

// ─── Section ID Generation ──────────────────────────────────────────────────

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
  let id = 'od-' + base;
  let counter = 2;
  while (usedIds.has(id)) {
    id = `od-${base}-${counter}`;
    counter++;
  }
  usedIds.add(id);
  return id;
}

// ─── Linked terms for cross-reference detection ─────────────────────────────

const TERM_NAMES = [
  // Substance
  'noema', 'noemata', 'noematic', 'schema', 'schemata', 'schematize',
  'schematic', 'schematatic',
  // Spatial
  'noemascape', 'endosphere', 'perifield', 'exofield', 'nuloscape',
  'noemagraph', 'outer lens', 'threshold',
  // Habits
  'endospecture', 'endospection', 'endologue', 'endospective',
  'omnipere', 'omniperegrination', 'omniperegrinal',
  'constellare', 'constellaration', 'constellative', 'constellation',
  'refracture', 'refraction', 'refractive', 'refractal',
  'exospecture', 'exospection', 'exospective', 'exosphere', 'projection',
  'synthesure', 'synthesis', 'synthesuric', 'holos',
  // Events/Relations
  'trace', 'bond', 'fluxion', 'nebula', 'axis',
  'cogniscence', 'cognesce', 'cogniscent', 'contexture',
  // Axiomatics
  'axiomatics', 'axiomatica', 'axiomation', 'axiomatize', 'axiomatist',
  // Versōr
  'versate', 'versation', 'versologue', 'verso',
  'metacognition', 'tesseractic',
  // Calculus-origin
  'consciousness', 'emotion', 'gravity', 'instinct', 'life', 'memory',
  'oppression', 'thought',
];

const TERM_REGEXES = TERM_NAMES.map(t => ({
  name: t,
  regex: new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
}));

function detectLinkedTerms(text) {
  return TERM_REGEXES.filter(tr => tr.regex.test(text)).map(tr => tr.name);
}

// ─── Spine role detection ────────────────────────────────────────────────────

function detectSpineRole(text, isFirst) {
  if (isFirst) return 'setup';
  const lower = text.toLowerCase();
  if (lower.startsWith('definition:') || lower.startsWith('part of speech:')) return 'definition';
  if (lower.startsWith('example:') || lower.startsWith('examples:')) return 'evidence';
  if (lower.startsWith('for example') || lower.startsWith('consider ')) return 'evidence';
  if (lower.startsWith('key ') || lower.startsWith('note:') || lower.startsWith('note on')) return 'claim';
  if (lower.startsWith('the key') || lower.startsWith('why ') || lower.startsWith('what ')) return 'claim';
  if (lower.startsWith('in summary') || lower.startsWith('therefore')) return 'synthesis';
  return 'claim';
}

// ─── Main Import Function ────────────────────────────────────────────────────

async function main() {
  console.log('=== Tessera Import: Ontological Dictionary v3 ===\n');

  if (!fs.existsSync(DOCX_PATH)) {
    console.error('ERROR: File not found:', DOCX_PATH);
    process.exit(1);
  }

  // Load and extract docx
  const buf = fs.readFileSync(DOCX_PATH);
  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file('word/document.xml').async('string');
  const parser = new DOMParser();
  const docDom = parser.parseFromString(docXml, 'text/xml');

  // ─── 1. Parse document body ──────────────────────────────────────────────

  console.log('Parsing document structure...');
  const bodyEl = getAllByTag(docDom, 'w', 'body')[0];
  const paragraphEls = getChildrenByTag(bodyEl, 'w', 'p');

  const now = Date.now();
  let paraCounter = 0;

  // Collect raw items
  const items = [];
  for (let i = 0; i < paragraphEls.length; i++) {
    const pEl = paragraphEls[i];
    const style = getParagraphStyle(pEl);
    const text = getTextContent(pEl).trim();
    if (!text) continue;

    // Skip Claude response drafts at the end
    if (style === 'font-claude-response-body') continue;

    const headingLevel = getHeadingLevel(style);
    const boldHeading = !headingLevel && isBoldOnly(pEl);

    if (headingLevel > 0) {
      items.push({ type: 'heading', level: headingLevel, text, style });
    } else if (boldHeading) {
      // Bold lines in the OD are often table headers, property labels, etc.
      // Keep them as content paragraphs, not section headings
      items.push({ type: 'paragraph', text, style, isBoldLabel: true });
    } else {
      items.push({ type: 'paragraph', text, style });
    }
  }

  console.log(`  Found ${items.filter(i => i.type === 'heading').length} headings`);
  console.log(`  Found ${items.filter(i => i.type === 'paragraph').length} paragraphs`);

  // ─── 2. Build section tree ─────────────────────────────────────────────

  console.log('\nBuilding section tree...');

  function makeSectionObj(text, level) {
    const id = uniqueId(toKebab(text) || `section-${now}`);
    return {
      id,
      title: text,
      spine: '',
      status: 'revised',
      children: [],
      paragraphs: [],
      _level: level,
    };
  }

  // Part-level containers
  const parts = [];
  let currentPart = null;
  const sectionStack = [];

  function currentSection() {
    return sectionStack.length > 0 ? sectionStack[sectionStack.length - 1] : null;
  }

  for (const item of items) {
    if (item.type === 'heading') {
      const level = item.level;

      if (level === 1) {
        // H1 = Part boundary
        currentPart = {
          id: uniqueId('part-' + toKebab(item.text).slice(0, 20)),
          title: item.text,
          subtitle: '',
          children: [],
        };
        parts.push(currentPart);
        sectionStack.length = 0;
      } else {
        // H2/H3/H4 = sections within current part
        const section = makeSectionObj(item.text, level);
        const targetDepth = level - 1; // H2→1, H3→2, H4→3

        while (sectionStack.length >= targetDepth) sectionStack.pop();

        const parent = currentSection();
        if (parent) {
          parent.children.push(section);
        } else if (currentPart) {
          currentPart.children.push(section);
        }
        sectionStack.push(section);
      }
    } else if (item.type === 'paragraph') {
      const ownerSection = currentSection();
      if (!ownerSection) continue;

      paraCounter++;
      const paraId = `${ownerSection.id}-p${paraCounter}`;
      const isFirst = ownerSection.paragraphs.length === 0;

      const para = {
        id: paraId,
        text: item.text,
        status: 'revised',
        spineRole: item.isBoldLabel ? 'claim' : detectSpineRole(item.text, isFirst),
        linkedTerms: detectLinkedTerms(item.text),
      };
      ownerSection.paragraphs.push(para);
    }
  }

  // ─── 3. Clean sections ─────────────────────────────────────────────────

  function cleanSection(sec) {
    const { _level, ...rest } = sec;
    return { ...rest, children: sec.children.map(cleanSection) };
  }

  const cleanedParts = parts.map(p => ({
    ...p,
    children: p.children.map(cleanSection),
  }));

  // ─── 4. Build OD project ──────────────────────────────────────────────

  const odProject = {
    id: 'ontological-dictionary',
    name: 'Ontological Dictionary',
    icon: '\u{1F4D6}',
    color: '#9E5A2A',
    parts: cleanedParts,
  };

  // QC counts
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

  const totalSections = odProject.parts.reduce((acc, p) => acc + countSections(p.children), 0);
  const totalParagraphs = odProject.parts.reduce((acc, p) => acc + countParagraphs(p.children), 0);

  console.log(`  ${odProject.parts.length} parts`);
  console.log(`  ${totalSections} sections`);
  console.log(`  ${totalParagraphs} paragraphs`);
  for (const p of odProject.parts) {
    console.log(`  - ${p.title}: ${p.children.length} top-level sections`);
  }

  // ─── 5. Extract term definitions from content ──────────────────────────

  console.log('\nExtracting term definitions...');

  // Walk all sections looking for "Definition:" paragraphs
  const termDefs = {}; // termName → { definition, partOfSpeech, sectionId }

  function walkSections(sections) {
    for (const sec of sections) {
      const title = sec.title.toUpperCase().trim();
      const paras = sec.paragraphs || [];

      // Find definition and part-of-speech in paragraphs
      let definition = '';
      let partOfSpeech = '';
      for (const p of paras) {
        if (p.text.startsWith('Part of Speech:')) {
          partOfSpeech = p.text.replace('Part of Speech:', '').trim();
        }
        if (p.text.startsWith('Definition:')) {
          definition = p.text.replace('Definition:', '').trim();
          // Take first sentence or up to 200 chars
          const firstSentence = definition.match(/^[^.]+\./);
          if (firstSentence && firstSentence[0].length < 200) {
            definition = firstSentence[0];
          } else if (definition.length > 200) {
            definition = definition.slice(0, 200).replace(/\s+\S*$/, '') + '...';
          }
        }
      }

      if (definition) {
        // Match section title to known term name
        const termName = matchTitleToTerm(sec.title);
        if (termName) {
          termDefs[termName] = { definition, partOfSpeech, sectionId: sec.id };
        }
      }

      walkSections(sec.children || []);
    }
  }

  function matchTitleToTerm(title) {
    const t = title.toLowerCase().replace(/^the\s+/, '').trim();
    // Direct match
    for (const name of TERM_NAMES) {
      if (t === name) return name;
      if (t === 'to ' + name) return name;
      if (t === 'to cognesce') return 'cognesce';
      if (t === 'to contexture') return 'contexture';
      if (t === 'to schematize') return 'schematize';
      if (t === 'to axiomatize') return 'axiomatize';
      if (t === 'to versate') return 'versate';
    }
    // Fuzzy match
    const mappings = {
      'noema': 'noema', 'noemata': 'noemata', 'noematic': 'noematic',
      'schemata': 'schemata', 'schema': 'schema', 'schematize': 'schematize',
      'noemascape': 'noemascape', 'perifield': 'perifield', 'outer lens': 'outer lens',
      'threshold': 'threshold', 'exofield': 'exofield', 'nuloscape': 'nuloscape',
      'noemagraph': 'noemagraph', 'endosphere': 'endosphere',
      'trace': 'trace', 'bond': 'bond', 'fluxion': 'fluxion',
      'nebula': 'nebula', 'axis': 'axis', 'constellation': 'constellation',
      'exosphere': 'exosphere', 'projection': 'projection', 'refractal': 'refractal',
      'exologue': 'exologue', 'endologue': 'endologue',
      'cogniscence': 'cogniscence', 'cogniscent': 'cogniscent',
      'contexture': 'contexture',
      'endospecture': 'endospecture', 'omnipere': 'omnipere',
      'constellare': 'constellare', 'refracture': 'refracture',
      'exospecture': 'exospecture', 'synthesure': 'synthesure',
      'axiomatics': 'axiomatics', 'axiomation': 'axiomation',
      'axiomatica': 'axiomatica', 'axiomatist': 'axiomatist',
      'versation and the versetor': 'versation',
      'versation': 'versation', 'verso': 'verso', 'versologue': 'versologue',
    };
    for (const [key, val] of Object.entries(mappings)) {
      if (t.includes(key)) return val;
    }
    // Habit headers
    if (t.includes('habit 1') || t.includes('endospecture')) return 'endospecture';
    if (t.includes('habit 2') || t.includes('omnipere')) return 'omnipere';
    if (t.includes('habit 3') || t.includes('constellare')) return 'constellare';
    if (t.includes('habit 4') || t.includes('refracture')) return 'refracture';
    if (t.includes('habit 5') || t.includes('exospecture')) return 'exospecture';
    if (t.includes('habit 6') || t.includes('synthesure')) return 'synthesure';
    return null;
  }

  walkSections(odProject.parts.flatMap(p => p.children));
  console.log(`  Found definitions for ${Object.keys(termDefs).length} terms`);
  for (const [name, def] of Object.entries(termDefs)) {
    console.log(`    ${name}: ${def.definition.slice(0, 60)}...`);
  }

  // ─── 6. Update linkedTerms ─────────────────────────────────────────────

  console.log('\nUpdating linked terms...');

  // Load current linkedTerms
  const currentLTCode = fs.readFileSync(OUTPUT_LINKED_TERMS, 'utf8');
  const tmpLTFile = path.resolve(__dirname, '../src/data/_tmp_lt.cjs');
  fs.writeFileSync(tmpLTFile, currentLTCode.replace('export default LINKED_TERMS;', 'module.exports = LINKED_TERMS;'));
  const currentLT = require(tmpLTFile);
  fs.unlinkSync(tmpLTFile);

  // Category → color mapping for new terms
  const CATEGORY_COLORS = {
    substance: '#9E5A2A',
    spatial: '#2D6B5A',
    habits: '#6B3A6E',
    axiomatics: '#AA6644',
    events: '#7C6A2A',
    calculus: '#2A5F7C',
  };

  function termCategory(name) {
    if (['noema', 'noemata', 'noematic', 'schema', 'schemata', 'schematize', 'schematic', 'schematatic'].includes(name)) return 'substance';
    if (['noemascape', 'endosphere', 'perifield', 'exofield', 'nuloscape', 'noemagraph', 'outer lens', 'threshold'].includes(name)) return 'spatial';
    if (['endospecture', 'endospection', 'endologue', 'endospective', 'omnipere', 'omniperegrination', 'omniperegrinal',
         'constellare', 'constellaration', 'constellative', 'constellation',
         'refracture', 'refraction', 'refractive', 'refractal',
         'exospecture', 'exospection', 'exospective', 'exosphere', 'projection',
         'synthesure', 'synthesis', 'synthesuric', 'holos'].includes(name)) return 'habits';
    if (['axiomatics', 'axiomatica', 'axiomation', 'axiomatize', 'axiomatist'].includes(name)) return 'axiomatics';
    if (['trace', 'bond', 'fluxion', 'nebula', 'axis', 'cogniscence', 'cognesce', 'cogniscent', 'contexture', 'exologue'].includes(name)) return 'events';
    if (['versate', 'versation', 'versologue', 'verso'].includes(name)) return 'axiomatics';
    return 'calculus';
  }

  // Symbol assignments for new terms
  const SYMBOLS = {
    'synthesure': 'Sy',
    'synthesis': 'Sy*',
    'synthesuric': '',
    'holos': 'H',
    'nuloscape': 'N0',
    'schemata': '\u03C3\u2070',   // σ⁰
    'schematic': '',
    'schematatic': '',
    'endospective': '',
    'omniperegrinal': '',
    'constellative': '',
    'refractive': '',
    'exospective': '',
    'exologue': 'ex\u2192',
  };

  // Update existing terms and add new ones
  const updatedLT = { ...currentLT };

  for (const termName of TERM_NAMES) {
    const def = termDefs[termName];
    if (updatedLT[termName]) {
      // Update definition if we found one
      if (def) {
        updatedLT[termName].definition = def.definition;
      }
    } else {
      // New term
      const cat = termCategory(termName);
      updatedLT[termName] = {
        symbol: SYMBOLS[termName] || (currentLT[termName]?.symbol || ''),
        definition: def?.definition || `Term from the Ontological Dictionary (${cat}).`,
        project: cat === 'calculus' ? 'purpose-of-schools' : 'ontological-dictionary',
        color: CATEGORY_COLORS[cat],
        refs: [],
      };
      console.log(`  + NEW: ${termName} (${cat})`);
    }
  }

  // ─── 7. Regenerate cross-references ────────────────────────────────────

  console.log('\nRegenerating cross-references across all projects...');

  // Load current projects to get PoS and AC content
  const currentProjectsCode = fs.readFileSync(OUTPUT_PROJECTS, 'utf8');
  const tmpProjFile = path.resolve(__dirname, '../src/data/_tmp_proj.cjs');
  fs.writeFileSync(tmpProjFile, currentProjectsCode.replace('export default PROJECTS;', 'module.exports = PROJECTS;'));
  const currentProjects = require(tmpProjFile);
  fs.unlinkSync(tmpProjFile);

  const posProject = currentProjects.find(p => p.id === 'purpose-of-schools');
  const acProject = currentProjects.find(p => p.id === 'axiometric-calculus');

  // Build refs for all terms across all projects
  const allProjects = [posProject, odProject, acProject].filter(Boolean);

  function collectAllSections(parts) {
    const result = [];
    function walk(sections) {
      for (const s of sections) {
        result.push(s);
        walk(s.children || []);
      }
    }
    for (const p of parts) walk(p.children || []);
    return result;
  }

  for (const termName of Object.keys(updatedLT)) {
    const regex = new RegExp(`\\b${termName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const refs = [];

    for (const proj of allProjects) {
      const sections = collectAllSections(proj.parts);
      for (const sec of sections) {
        for (const p of (sec.paragraphs || [])) {
          if (regex.test(p.text)) {
            // Find snippet around the match
            const matchIdx = p.text.toLowerCase().indexOf(termName.toLowerCase());
            const start = Math.max(0, matchIdx - 30);
            const end = Math.min(p.text.length, matchIdx + termName.length + 40);
            const snippet = (start > 0 ? '...' : '') + p.text.slice(start, end) + (end < p.text.length ? '...' : '');

            refs.push({
              project: proj.id,
              doc: sec.id,
              snippet,
            });
            break; // One ref per section per term
          }
        }
      }
    }

    updatedLT[termName].refs = refs.slice(0, 8); // Cap at 8 refs per term
  }

  const refCount = Object.values(updatedLT).reduce((sum, t) => sum + t.refs.length, 0);
  console.log(`  ${Object.keys(updatedLT).length} terms, ${refCount} cross-references`);

  // ─── 8. Write linkedTerms.js ───────────────────────────────────────────

  const ltOutput = `/**
 * Tessera Linked Terms — Auto-generated with cross-references
 * Generated: ${new Date().toISOString()}
 * ${Object.keys(updatedLT).length} terms tracked across 3 projects
 * ${refCount} cross-references detected
 */

const LINKED_TERMS = ${JSON.stringify(updatedLT, null, 2)};

export default LINKED_TERMS;
`;

  fs.writeFileSync(OUTPUT_LINKED_TERMS, ltOutput);
  console.log(`\nWrote ${OUTPUT_LINKED_TERMS}`);
  console.log(`  Size: ${(fs.statSync(OUTPUT_LINKED_TERMS).size / 1024).toFixed(1)} KB`);

  // ─── 9. Write projects.js ─────────────────────────────────────────────

  const finalProjects = [posProject, odProject];
  if (acProject) finalProjects.push(acProject);

  // QC for PoS project
  const posSections = posProject ? posProject.parts.reduce((acc, p) => acc + countSections(p.children), 0) : 0;
  const posParas = posProject ? posProject.parts.reduce((acc, p) => acc + countParagraphs(p.children), 0) : 0;

  const projOutput = `/**
 * Tessera Data — Auto-generated
 * Generated: ${new Date().toISOString()}
 *
 * Structure: Project -> Part -> Section (recursive) -> Paragraphs
 * Purpose of Schools: ${posParas} paragraphs across ${posSections} sections
 * Ontological Dictionary: ${totalParagraphs} paragraphs across ${totalSections} sections
 */

const PROJECTS = ${JSON.stringify(finalProjects, null, 2)};

export default PROJECTS;
`;

  fs.writeFileSync(OUTPUT_PROJECTS, projOutput);
  console.log(`\nWrote ${OUTPUT_PROJECTS}`);
  console.log(`  Size: ${(fs.statSync(OUTPUT_PROJECTS).size / 1024).toFixed(1)} KB`);

  // ─── Summary ──────────────────────────────────────────────────────────

  console.log('\n=== Import complete! ===');
  console.log(`  OD v3: ${odProject.parts.length} parts, ${totalSections} sections, ${totalParagraphs} paragraphs`);
  console.log(`  Linked terms: ${Object.keys(updatedLT).length} (${Object.keys(updatedLT).length - Object.keys(currentLT).length} new)`);
  console.log(`  Cross-refs: ${refCount}`);
  console.log('\nNew terms added:');
  for (const name of Object.keys(updatedLT)) {
    if (!currentLT[name]) console.log(`  + ${name}`);
  }
  console.log('\nNext steps:');
  console.log('  1. Clear localStorage and reload the app');
  console.log('  2. Check the Dictionary view for the constellation graph');
  console.log('  3. Verify cross-references in the CrossRef panel');
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
