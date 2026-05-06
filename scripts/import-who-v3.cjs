/**
 * Import "WHO DOES NOT HAVE THE POWER" docx into projects.js
 *
 * Replaces the entire who-no-power section with new content from the docx.
 * - Parses headings into nested section tree (H1 > H2 > H3)
 * - Separates prose paragraphs from NOTE paragraphs
 * - NOTEs become brainstorm notes in migrated-notes.json
 * - Footnotes [1], [2] are preserved inline as superscript markers
 * - Footnote bodies are stored as notes
 * - Section summaries and meta-commentary are excluded from prose
 */

const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const DOCX_PATH = path.join(__dirname, '..', 'docs', 'writings', 'Purpose of School', 'WHO DOES NOT HAVE THE POWER.docx');
const PROJECTS_PATH = path.join(__dirname, '..', 'src', 'data', 'projects.js');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    .replace(/-$/, '');
}

function cleanHtml(html) {
  let text = html;
  // Convert footnote superscripts to [N] markers
  text = text.replace(/<sup><a[^>]*>\[(\d+)\]<\/a><\/sup>/g, '[$1]');
  // Remove all remaining HTML tags
  text = text.replace(/<\/?[^>]+>/g, '');
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&rsquo;/g, "\u2019");
  text = text.replace(/&ldquo;/g, "\u201C");
  text = text.replace(/&rdquo;/g, "\u201D");
  text = text.replace(/&mdash;/g, "\u2014");
  text = text.replace(/&ndash;/g, "\u2013");
  text = text.replace(/&hellip;/g, "\u2026");
  return text.trim();
}

function isNote(text) {
  return /^NOTE[:\s]/i.test(text);
}

function isSectionSummary(text) {
  return /^SECTION SUMMARY/i.test(text) ||
    /^Approximate paragraph count/i.test(text) ||
    /^D\+E\.\d/i.test(text) ||
    /^No instances of/i.test(text) ||
    /^Remaining items deferred/i.test(text);
}

function isMetaCommentary(text) {
  // "WHAT COMES NEXT", "TRANSITION INTO", draft comments list items, etc.
  return /^WHAT COMES NEXT/i.test(text) ||
    /^This draft covers/i.test(text) ||
    /^Comments from your outline/i.test(text) ||
    /^Comment \d+[:\-–]/i.test(text) ||
    /^Comments \d+/i.test(text) ||
    /^Draft Comment \d+/i.test(text) ||
    /^TRANSITION INTO/i.test(text) ||
    /^Section [A-Z] ends with/i.test(text) ||
    /^The transition sentence/i.test(text) ||
    /^Remaining open comments/i.test(text) ||
    /^Two changes to make/i.test(text) ||
    /^SECTION [A-Z] FIXES/i.test(text) ||
    /^Axiometrica calculus/i.test(text) ||
    /^Formal introduction of the six/i.test(text) ||
    /^Assessment architecture/i.test(text) ||
    /^Communication as a core/i.test(text) ||
    /^Banking logic embedded/i.test(text);
}

function classifyParagraph(text) {
  if (isNote(text)) return 'note';
  if (isSectionSummary(text)) return 'meta';
  if (isMetaCommentary(text)) return 'meta';
  return 'prose';
}

function assignSpineRole(index, total) {
  if (index === 0) return 'setup';
  if (index === total - 1) return 'synthesis';
  if (index === 1) return 'claim';
  if (index <= Math.floor(total * 0.6)) return 'claim';
  if (index <= Math.floor(total * 0.8)) return 'evidence';
  return 'bridge';
}

async function main() {
  console.log('Reading docx...');
  const result = await mammoth.convertToHtml({ path: DOCX_PATH });
  const html = result.value;

  // Split by headings
  const parts = html.split(/(<h[1-3][^>]*>.*?<\/h[1-3]>)/);

  // Parse into flat section list
  let flatSections = [];
  let currentSection = null;

  for (const part of parts) {
    const headingMatch = part.match(/<h([1-3])[^>]*>(.*?)<\/h[1-3]>/);
    if (headingMatch) {
      if (currentSection) flatSections.push(currentSection);
      currentSection = {
        level: parseInt(headingMatch[1]),
        title: cleanHtml(headingMatch[2]),
        rawParagraphs: []
      };
    } else if (part.trim()) {
      if (!currentSection) {
        currentSection = { level: 0, title: 'Preamble', rawParagraphs: [] };
      }
      // Extract <p> elements
      const pMatches = [...part.matchAll(/<p>(.*?)<\/p>/gs)];
      for (const m of pMatches) {
        const text = cleanHtml(m[1]);
        if (text) {
          currentSection.rawParagraphs.push(text);
        }
      }
      // Extract <li> elements (footnote bodies)
      const liMatches = [...part.matchAll(/<li[^>]*id="(footnote-\d+)"[^>]*><p>(.*?)<\/p><\/li>/gs)];
      for (const m of liMatches) {
        let fnText = cleanHtml(m[2]);
        // Remove back-link arrow
        fnText = fnText.replace(/\s*↑\s*$/, '').trim();
        if (fnText) {
          currentSection.rawParagraphs.push('FOOTNOTE: ' + fnText);
        }
      }
    }
  }
  if (currentSection) flatSections.push(currentSection);

  // Collect notes and footnotes for migrated-notes
  const collectedNotes = [];
  const collectedFootnotes = [];

  // Build nested tree
  // H1 = top section, H2 = children, H3 = grandchildren
  function buildSection(flat, idPrefix) {
    const prose = [];
    const notes = [];

    for (const rawText of flat.rawParagraphs) {
      const type = classifyParagraph(rawText);

      if (rawText.startsWith('FOOTNOTE: ')) {
        collectedFootnotes.push({
          text: rawText.replace('FOOTNOTE: ', ''),
          sectionId: idPrefix
        });
        continue;
      }

      if (type === 'note') {
        collectedNotes.push({
          text: rawText,
          sectionId: idPrefix
        });
        continue;
      }

      if (type === 'meta') {
        // Store meta-commentary as notes too, tagged differently
        collectedNotes.push({
          text: rawText,
          sectionId: idPrefix,
          isMeta: true
        });
        continue;
      }

      // It's prose
      const pId = `${idPrefix}-p${prose.length + 1}`;
      prose.push({
        id: pId,
        text: rawText,
        status: 'drafting',
        spineRole: '', // assigned below
        linkedTerms: []
      });
    }

    // Assign spine roles
    for (let i = 0; i < prose.length; i++) {
      prose[i].spineRole = assignSpineRole(i, prose.length);
    }

    return {
      id: idPrefix,
      title: flat.title,
      spine: '',
      status: prose.length > 0 ? 'drafting' : 'brainstorm',
      children: [],
      paragraphs: prose
    };
  }

  // Nest: H1 is root, H2 are children, H3 are grandchildren of H2
  const rootFlat = flatSections.find(s => s.level === 1);
  if (!rootFlat) {
    console.error('No H1 heading found!');
    process.exit(1);
  }

  const rootId = 'who-no-power';
  const root = buildSection(rootFlat, rootId);
  root.spine = 'Oppression is what happens when your reality is defined for you.';

  let currentH2 = null;
  let h2Counter = 0;

  for (const flat of flatSections) {
    if (flat === rootFlat) continue;

    if (flat.level === 2) {
      h2Counter++;
      const h2Id = `${rootId}-${slugify(flat.title)}`;
      currentH2 = buildSection(flat, h2Id);
      root.children.push(currentH2);
    } else if (flat.level === 3 && currentH2) {
      const h3Id = `${currentH2.id}-${slugify(flat.title)}`;
      const h3Section = buildSection(flat, h3Id);
      currentH2.children.push(h3Section);
    }
  }

  // Count results
  let totalParagraphs = 0;
  let totalSections = 0;
  function countTree(s) {
    totalSections++;
    totalParagraphs += s.paragraphs.length;
    s.children.forEach(countTree);
  }
  countTree(root);

  console.log(`\nParsed: ${totalSections} sections, ${totalParagraphs} paragraphs`);
  console.log(`Notes collected: ${collectedNotes.length}`);
  console.log(`Footnotes collected: ${collectedFootnotes.length}`);

  // Print tree
  function printTree(s, indent = 0) {
    console.log(' '.repeat(indent) + `${s.id}: "${s.title}" (${s.paragraphs.length}p, ${s.children.length}c)`);
    s.children.forEach(c => printTree(c, indent + 2));
  }
  console.log('\nSection tree:');
  printTree(root);

  // Now replace in projects.js
  console.log('\nReading projects.js...');
  const projSource = fs.readFileSync(PROJECTS_PATH, 'utf-8');

  // Parse the JS to find and replace the who-no-power section
  // Strategy: find the JSON object for who-no-power and replace it
  // The file is essentially JSON wrapped in `const PROJECTS = [...]; export default PROJECTS;`

  // Extract JSON content
  const jsonStart = projSource.indexOf('const PROJECTS = ') + 'const PROJECTS = '.length;
  const jsonEnd = projSource.lastIndexOf('];\n');
  const jsonStr = projSource.substring(jsonStart, jsonEnd + 1);

  let projects;
  try {
    projects = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse projects JSON:', e.message);
    process.exit(1);
  }

  // Find and replace who-no-power
  function replaceSection(sections) {
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].id === 'who-no-power') {
        console.log('Found who-no-power, replacing...');
        sections[i] = root;
        return true;
      }
      if (sections[i].children && replaceSection(sections[i].children)) return true;
      if (sections[i].parts) {
        for (const part of sections[i].parts) {
          if (part.children && replaceSection(part.children)) return true;
        }
      }
    }
    return false;
  }

  if (!replaceSection(projects)) {
    console.error('Could not find who-no-power section in projects!');
    process.exit(1);
  }

  // Recount totals
  let purposeParas = 0, purposeSections = 0;
  let calcParas = 0, calcSections = 0;
  let dictParas = 0, dictSections = 0;

  function countProject(sections, counter) {
    for (const s of sections) {
      counter.sections++;
      counter.paragraphs += (s.paragraphs || []).length;
      if (s.children) countProject(s.children, counter);
    }
  }

  for (const proj of projects) {
    const counter = { sections: 0, paragraphs: 0 };
    if (proj.parts) {
      for (const part of proj.parts) {
        if (part.children) countProject(part.children, counter);
      }
    }
    if (proj.children) countProject(proj.children, counter);

    if (proj.id === 'purpose-of-schools') {
      purposeParas = counter.paragraphs;
      purposeSections = counter.sections;
    } else if (proj.id === 'axiometric-calculus') {
      calcParas = counter.paragraphs;
      calcSections = counter.sections;
    } else if (proj.id === 'ontological-dictionary') {
      dictParas = counter.paragraphs;
      dictSections = counter.sections;
    }
  }

  const totalParas = purposeParas + calcParas + dictParas;
  const totalSects = purposeSections + calcSections + dictSections;

  // Write back
  const header = `/**
 * Tessera Data — Auto-generated from all three project sources
 * Generated: ${new Date().toISOString()}
 *
 * Structure: Project → Part → Section (recursive) → Paragraphs
 *
 * Purpose of Schools: ${purposeParas} paragraphs, ${purposeSections} sections (from docx)
 * Axiometric Calculus: ${calcParas} paragraphs, ${calcSections} sections (from docx)
 * Ontological Dictionary: ${dictParas} paragraphs, ${dictSections} sections (from docx)
 * Total: ${totalParas} paragraphs across ${totalSects} sections
 */

const PROJECTS = `;

  const footer = `;\n\nexport default PROJECTS;\n`;

  const output = header + JSON.stringify(projects, null, 2) + footer;
  fs.writeFileSync(PROJECTS_PATH, output);
  console.log(`\nWrote projects.js (${purposeParas} Purpose paras, ${totalParas} total)`);

  // Write notes
  const notesOutput = [];
  const now = Date.now();

  for (let i = 0; i < collectedNotes.length; i++) {
    const n = collectedNotes[i];
    notesOutput.push({
      id: `n-who-v3-${i + 1}`,
      category: n.isMeta ? 'task' : 'idea',
      text: n.text.replace(/^NOTE:\s*/i, ''),
      tags: n.isMeta ? ['meta-commentary', 'who-section'] : ['author-note', 'who-section'],
      linkedProjectId: 'purpose-of-schools',
      linkedSectionId: n.sectionId,
      linkedParagraphId: null,
      inlineRange: null,
      resolved: false,
      createdAt: now + i,
      linkedSourceId: null
    });
  }

  for (let i = 0; i < collectedFootnotes.length; i++) {
    const fn = collectedFootnotes[i];
    notesOutput.push({
      id: `n-who-v3-fn${i + 1}`,
      category: 'idea',
      text: fn.text,
      tags: ['footnote', 'who-section', `fn${i + 1}`],
      linkedProjectId: 'purpose-of-schools',
      linkedSectionId: fn.sectionId,
      linkedParagraphId: null,
      inlineRange: null,
      resolved: false,
      createdAt: now + collectedNotes.length + i,
      linkedSourceId: null
    });
  }

  const notesPath = path.join(__dirname, '..', 'src', 'data', 'who-v3-notes.json');
  fs.writeFileSync(notesPath, JSON.stringify(notesOutput, null, 2));
  console.log(`Wrote ${notesOutput.length} notes to who-v3-notes.json`);

  console.log('\nDone! Clear localStorage in the browser to see the new content.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
