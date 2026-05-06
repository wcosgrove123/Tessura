#!/usr/bin/env node
'use strict';

/**
 * QC Verification for Same Means.docx import.
 * Checks structural integrity and generates an HTML report.
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.resolve(__dirname, '../src/data/imported-pos-data.json');
const REPORT_PATH = path.resolve(__dirname, '../docs/import-qc-report.html');

const d = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const { project, sources, citations, notes, qc } = d;

const checks = [];
let pass = 0, warn = 0, fail = 0;

function check(name, condition, detail = '') {
  const status = condition === true ? 'PASS' : (condition === 'warn' ? 'WARN' : 'FAIL');
  if (status === 'PASS') pass++;
  else if (status === 'WARN') warn++;
  else fail++;
  checks.push({ name, status, detail });
  const icon = status === 'PASS' ? '✓' : status === 'WARN' ? '⚠' : '✗';
  console.log(`  ${icon} ${name}${detail ? ': ' + detail : ''}`);
}

// ── Helpers ──

function countSections(secs) {
  let n = secs.length;
  for (const s of secs) n += countSections(s.children || []);
  return n;
}

function countParagraphs(secs) {
  let n = 0;
  for (const s of secs) {
    n += (s.paragraphs || []).length;
    n += countParagraphs(s.children || []);
  }
  return n;
}

function collectParagraphs(secs, result = []) {
  for (const s of secs) {
    result.push(...(s.paragraphs || []));
    collectParagraphs(s.children || [], result);
  }
  return result;
}

function findSection(secs, title) {
  for (const s of secs) {
    if (s.title.includes(title)) return s;
    const found = findSection(s.children || [], title);
    if (found) return found;
  }
  return null;
}

function collectSections(secs, result = []) {
  for (const s of secs) {
    result.push(s);
    collectSections(s.children || [], result);
  }
  return result;
}

// ── Run checks ──

console.log('\n=== QC Import Verification ===\n');

// 1. Structure
console.log('Structure:');
const totalSections = project.parts.reduce((a, p) => a + countSections(p.children), 0);
const totalParagraphs = project.parts.reduce((a, p) => a + countParagraphs(p.children), 0);

check('Total sections', totalSections >= 70 && totalSections <= 120, `${totalSections} sections`);
check('Total paragraphs', totalParagraphs >= 500 && totalParagraphs <= 700, `${totalParagraphs} paragraphs`);
check('Part count', project.parts.length === 4, `${project.parts.length} parts`);

// 2. Part I structure
console.log('\nPart I:');
const part1 = project.parts[0];
check('Part I title', part1.title.includes('Philosophy'), part1.title);
check('Part I has Introduction', !!findSection(part1.children, 'INTRODUCTION'), '');
check('Part I has WHY', !!findSection(part1.children, 'WHY') && !findSection(part1.children, 'WHY')?.title.includes('INTRODUCTION'), '');
check('Part I has INTERMISSION', !!findSection(part1.children, 'INTERMISSION'), 'standalone between WHY and WHAT');
check('Part I has WHAT', !!findSection(part1.children, 'WHAT'), '');
check('Part I has WHO', !!findSection(part1.children, 'WHO'), '');

// Check Introduction is NOT inside WHY
const whySec = part1.children.find(c => c.title === 'WHY');
const introInWhy = whySec ? findSection([whySec], 'INTRODUCTION') : null;
check('Introduction is standalone (not in WHY)', !introInWhy, '');

// Check Intermission is NOT inside WHAT
const whatSec = part1.children.find(c => c.title === 'WHAT');
const intermInWhat = whatSec ? findSection([whatSec], 'INTERMISSION') : null;
check('Intermission is standalone (not in WHAT)', !intermInWhat, '');

// 3. Part II
console.log('\nPart II:');
const part2 = project.parts[1];
check('Part II title', part2.title.includes('Implementation'), part2.title);
check('Part II has Section 8', !!findSection(part2.children, 'Section 8'), '');
check('Part II has Section 9', !!findSection(part2.children, 'SECTION 9'), '');
check('Part II has Section 10', !!findSection(part2.children, 'SECTION 10'), '');

// 4. Empty sections preserved
console.log('\nEmpty sections:');
const allSections = project.parts.reduce((a, p) => [...a, ...collectSections(p.children)], []);
const emptySections = allSections.filter(s => (!s.paragraphs || s.paragraphs.length === 0) && (!s.children || s.children.length === 0));
check('Critical Thinking/Reflection exists', !!allSections.find(s => s.title.includes('Critical Thinking')), '');
check('Exospection exists', !!allSections.find(s => s.title === 'Exospection' || s.title.includes('Exospection')), '');

// 5. Brainstorm status
console.log('\nBrainstorm detection:');
const sec9 = findSection(part2.children, 'SECTION 9');
const sec9paras = sec9 ? collectParagraphs([sec9]) : [];
const sec9bs = sec9paras.filter(p => p.status === 'brainstorm').length;
check('Section 9 all brainstorm', sec9bs === sec9paras.length, `${sec9bs}/${sec9paras.length}`);

const sec10 = findSection(part2.children, 'SECTION 10');
const sec10paras = sec10 ? collectParagraphs([sec10]) : [];
const sec10bs = sec10paras.filter(p => p.status === 'brainstorm').length;
check('Section 10 all brainstorm', sec10bs === sec10paras.length, `${sec10bs}/${sec10paras.length}`);

const part1paras = collectParagraphs(part1.children);
const part1bs = part1paras.filter(p => p.status === 'brainstorm').length;
check('Part I no false brainstorm', part1bs === 0, `${part1bs} brainstorm in Part I`);

// 6. Sources & Citations
console.log('\nSources & Citations:');
check('Source count', sources.length >= 25, `${sources.length} sources`);
check('Citation count', citations.length >= 30, `${citations.length} citations`);
check('No orphan citations', citations.every(c => sources.some(s => s.id === c.sourceId)),
  citations.filter(c => !sources.some(s => s.id === c.sourceId)).length + ' orphans');

// Check for duplicate sources (same author+year)
const srcKeys = sources.map(s => s.citationKey);
const dupes = srcKeys.filter((k, i) => srcKeys.indexOf(k) !== i);
check('No duplicate source keys', dupes.length <= 3 ? (dupes.length === 0 ? true : 'warn') : false,
  dupes.length > 0 ? `duplicates: ${[...new Set(dupes)].join(', ')}` : '');

// 7. Notes
console.log('\nNotes:');
const wordComments = notes.filter(n => n.tags?.includes('word-comment'));
const footnoteNotes = notes.filter(n => n.tags?.includes('footnote'));
const metaNotes = notes.filter(n => n.tags?.includes('meta-commentary'));
check('Word comments extracted', wordComments.length >= 80, `${wordComments.length} comments`);
check('Footnote notes created', footnoteNotes.length >= 5, `${footnoteNotes.length} footnote notes`);
check('Meta-commentary extracted', metaNotes.length >= 10, `${metaNotes.length} meta notes`);

// 8. Linked terms
console.log('\nLinked terms:');
const allParas = project.parts.reduce((a, p) => [...a, ...collectParagraphs(p.children)], []);
const withTerms = allParas.filter(p => p.linkedTerms?.length > 0);
check('Linked terms detected', withTerms.length >= 20, `${withTerms.length} paragraphs with terms`);

// ── Summary ──

console.log(`\n=== SUMMARY: ${pass} passed, ${warn} warnings, ${fail} failed ===\n`);

// ── Generate HTML report ──

const sections = project.parts.reduce((a, p) => [...a, ...collectSections(p.children)], []);

function sectionTree(secs, depth = 0) {
  return secs.map(s => {
    const pCount = s.paragraphs?.length || 0;
    const cCount = s.children?.length || 0;
    const bs = (s.paragraphs || []).filter(p => p.status === 'brainstorm').length;
    const statusBadge = bs > 0 ? ` <span class="badge brainstorm">${bs} brainstorm</span>` : '';
    const emptyBadge = pCount === 0 && cCount === 0 ? ' <span class="badge empty">empty</span>' : '';
    const indent = '  '.repeat(depth);
    return `${indent}<div class="section" style="margin-left:${depth * 20}px">
${indent}  <b>${s.title}</b> <span class="count">${pCount}p, ${cCount}c</span>${statusBadge}${emptyBadge}
${indent}</div>
${s.children ? sectionTree(s.children, depth + 1) : ''}`;
  }).join('\n');
}

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Import QC Report</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #FAF7F2; color: #2C2418; }
  h1 { font-family: 'Cormorant Garamond', serif; border-bottom: 2px solid #8B4513; padding-bottom: 10px; }
  h2 { color: #8B4513; margin-top: 30px; }
  .check { padding: 4px 0; font-size: 14px; }
  .pass { color: #2D6B5A; } .pass::before { content: '✓ '; }
  .warn { color: #8B6914; } .warn::before { content: '⚠ '; }
  .fail { color: #943D3D; } .fail::before { content: '✗ '; }
  .detail { color: #777; font-size: 12px; }
  .section { padding: 3px 0; font-size: 13px; }
  .count { color: #888; font-size: 11px; }
  .badge { font-size: 10px; padding: 1px 6px; border-radius: 3px; }
  .badge.brainstorm { background: #8B691420; color: #8B6914; border: 1px solid #8B691440; }
  .badge.empty { background: #943D3D20; color: #943D3D; border: 1px solid #943D3D40; }
  .summary { font-size: 18px; padding: 12px; border-radius: 8px; margin: 20px 0; }
  .summary.good { background: #2D6B5A15; border: 1px solid #2D6B5A40; }
  .summary.bad { background: #943D3D15; border: 1px solid #943D3D40; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; }
  th, td { padding: 6px 10px; border: 1px solid #ddd; font-size: 12px; text-align: left; }
  th { background: #f5f0e8; }
</style></head><body>
<h1>Import QC Report — Same Means.docx</h1>
<p>Generated: ${new Date().toISOString()}</p>

<div class="summary ${fail === 0 ? 'good' : 'bad'}">
  ${pass} passed, ${warn} warnings, ${fail} failed
</div>

<h2>Checks</h2>
${checks.map(c => `<div class="check ${c.status.toLowerCase()}">${c.name} <span class="detail">${c.detail}</span></div>`).join('\n')}

<h2>Section Tree</h2>
${project.parts.map(p => `<h3>${p.title}</h3>\n${sectionTree(p.children)}`).join('\n')}

<h2>Sources (${sources.length})</h2>
<table>
<tr><th>Key</th><th>Author</th><th>Title</th><th>Year</th><th>Type</th><th>Citations</th></tr>
${sources.map(s => {
  const citeCount = citations.filter(c => c.sourceId === s.id).length;
  return `<tr><td>${s.citationKey}</td><td>${s.authors.map(a=>a.family).join(', ')}</td><td>${s.title.slice(0,50)}</td><td>${s.year}</td><td>${s.type}</td><td>${citeCount}</td></tr>`;
}).join('\n')}
</table>

<h2>Comment Categories</h2>
<table>
<tr><th>Category</th><th>Count</th></tr>
${Object.entries(notes.filter(n=>n.tags?.includes('word-comment')).reduce((a,n)=>{a[n.category]=(a[n.category]||0)+1;return a;},{})).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('\n')}
</table>

<h2>Paragraphs with Brainstorm Status (${allParas.filter(p=>p.status==='brainstorm').length})</h2>
<p>These paragraphs were detected as outline/brainstorm content:</p>
<table>
<tr><th>Section</th><th>Text (preview)</th><th>Detection</th></tr>
${(() => {
  const rows = [];
  function walk(secs, path='') {
    for (const s of secs) {
      for (const p of s.paragraphs || []) {
        if (p.status === 'brainstorm') {
          rows.push('<tr><td>' + path + s.title.slice(0,30) + '</td><td>' + p.text.slice(0,80).replace(/</g,'&lt;') + '</td><td>brainstorm</td></tr>');
        }
      }
      walk(s.children || [], path + s.title.slice(0,15) + ' > ');
    }
  }
  project.parts.forEach(p => walk(p.children));
  return rows.slice(0, 50).join('\n') + (rows.length > 50 ? `<tr><td colspan="3">... and ${rows.length - 50} more</td></tr>` : '');
})()}
</table>

</body></html>`;

fs.writeFileSync(REPORT_PATH, html);
console.log(`QC report written to ${REPORT_PATH}`);
console.log('Open in browser to review.');
