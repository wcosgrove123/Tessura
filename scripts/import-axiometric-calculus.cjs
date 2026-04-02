/**
 * Import script for the Axiometric Calculus v4.
 * Parses the .docx into 10 Parts matching the document's own structure.
 *
 * Input:  docs/writings/Purpose of School/Axiometric Calculus/Axiometric_Calculus_v4.docx
 * Output: src/data/ac-imported.json
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const {
  docxToHtml,
  splitByHeading,
  elementsFromHtml,
  tableToParas,
  stripTags,
  autoSpineRole,
  makePara,
  makeSec,
  slugify,
  firstSentence
} = require('./import-utils.cjs');

const DOCX_PATH = path.join(__dirname, '..', 'docs', 'writings', 'Purpose of School', 'Axiometric Calculus', 'Axiometric_Calculus_v4.docx');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'ac-imported.json');

// Part-level spine sentences (hand-written for quality)
const PART_SPINES = {
  'PART I: GENESIS': 'The calculus emerged through the very processes it names — omniperegrination crystallizing into formal notation.',
  'PART II: PRIMITIVES': 'Seven foundational claims ground the system: noema as substance, cogito as anchor, schema as truth.',
  'PART III: TEMPORAL AND CAUSAL ARCHITECTURE': 'Time is not a river but a structure we slice through — awareness moves because instinct compels it.',
  'PART IV: THE AXIOMS': 'The axioms are mutually constitutive — each holds because the others hold. Remove any one and the system becomes undefined.',
  'PART V: OPERATORS': 'A complete operator set for equality, derivation, framing, and causation within noematic reality.',
  'PART VI: SPATIAL ARCHITECTURE': 'The topology within which cognition occurs: Noemascape, Endosphere, Perifield, Exofield, and boundaries between them.',
  'PART VII: COGNITIVE EMERGENCE': 'From gravity to metacognition — a causal hierarchy where each level emerges from and requires the one below.',
  'PART VIII: COMPOSITION RULES': 'Rules governing how operators combine: lens composition, frame dominance, tesseractic containment, temporal identity.',
  'PART IX: COMPLETE SYMBOL REFERENCE': 'A comprehensive reference of all symbols organized by category: primitives, axioms, operators, spaces, relations.',
  'PART X: OPEN QUESTIONS': 'Negation, quantification, proof, computation, the origin of gravity, the boundary of consciousness — questions the system raises.'
};

async function importAxiometricCalculus() {
  console.log('Importing Axiometric Calculus v4...');
  const html = await docxToHtml(DOCX_PATH);
  console.log(`  HTML length: ${html.length} chars`);

  // Split into Parts by <h1>
  const parts = splitByHeading(html, 'h1');
  console.log(`  Found ${parts.length} Parts`);

  const tesseraParts = [];

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    const partNum = pi + 1;
    const partId = `ac-part-${partNum}`;
    const partTitle = cleanPartTitle(part.title);
    const partSpine = PART_SPINES[part.title] || firstSentence(stripTags(part.content));

    console.log(`  Part ${partNum}: ${partTitle}`);

    // Split sections by <h2>
    const sections = splitByHeading(part.content, 'h2');

    // Handle any content before the first h2 (Part-level intro paragraphs)
    const introElements = getIntroElements(part.content, 'h2');

    const tesseraSections = [];
    let paraCounter = 0;

    // Add intro paragraphs as a section if they exist
    if (introElements.length > 0) {
      const introParas = [];
      for (const el of introElements) {
        if (el.type === 'table') {
          const tblParas = tableToParas(el.html, `${partId}-intro`, paraCounter);
          introParas.push(...tblParas);
          paraCounter += tblParas.length;
        } else if (el.type === 'paragraph') {
          paraCounter++;
          introParas.push(makePara(
            `${partId}-intro-p${paraCounter}`,
            stripTags(el.html),
            autoSpineRole(el.text),
            []
          ));
        }
      }
      if (introParas.length > 0) {
        tesseraSections.push(makeSec(
          `${partId}-intro`,
          'Introduction',
          firstSentence(introParas[0]?.text || ''),
          'revised',
          [],
          introParas
        ));
      }
    }

    // Process each h2 section
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      const secId = slugify(sec.title, partId);
      const secTitle = sec.title;

      const elements = elementsFromHtml(sec.content);
      const secParas = [];

      for (const el of elements) {
        if (el.type === 'table') {
          const tblParas = tableToParas(el.html, secId, paraCounter);
          secParas.push(...tblParas);
          paraCounter += tblParas.length;
        } else if (el.type === 'paragraph') {
          paraCounter++;
          secParas.push(makePara(
            `${secId}-p${paraCounter}`,
            stripTags(el.html),
            autoSpineRole(el.text),
            []
          ));
        }
      }

      const secSpine = firstSentence(secParas[0]?.text || secTitle);

      tesseraSections.push(makeSec(
        secId,
        secTitle,
        secSpine,
        'revised',
        [],
        secParas
      ));
    }

    tesseraParts.push({
      id: partId,
      title: `Part ${toRoman(partNum)}: ${partTitle}`,
      subtitle: partSpine,
      children: tesseraSections
    });
  }

  // Build the project object
  const project = {
    id: 'axiometric-calculus',
    name: 'Axiometric Calculus',
    icon: '∑',
    color: '#2D6B5A',
    parts: tesseraParts
  };

  // Count totals
  let totalParas = 0;
  let totalSections = 0;
  for (const part of tesseraParts) {
    for (const sec of part.children) {
      totalSections++;
      totalParas += sec.paragraphs.length;
    }
  }

  console.log(`  Total: ${tesseraParts.length} Parts, ${totalSections} Sections, ${totalParas} Paragraphs`);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(project, null, 2));
  console.log(`  Written to ${OUTPUT_PATH}`);

  return project;
}

/**
 * Get elements that appear before the first occurrence of a heading tag.
 */
function getIntroElements(html, headingTag) {
  const $ = cheerio.load(html, null, false);
  const results = [];
  const children = $.root().children().toArray();

  for (const el of children) {
    const tag = el.tagName?.toLowerCase();
    if (tag === headingTag) break;
    if (tag === 'p') {
      const text = $(el).text().trim();
      if (text.length === 0) continue;
      results.push({ type: 'paragraph', html: $(el).html(), text });
    } else if (tag === 'table') {
      results.push({ type: 'table', html: $.html(el), text: $(el).text().trim() });
    }
  }

  return results;
}

/**
 * Clean up Part titles — remove "PART X: " prefix for the subtitle,
 * but keep the core title.
 */
function cleanPartTitle(title) {
  return title.replace(/^PART\s+[IVXLC]+:\s*/i, '').trim();
}

/**
 * Convert number to Roman numeral.
 */
function toRoman(num) {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i];
      num -= vals[i];
    }
  }
  return result;
}

// Run if executed directly
if (require.main === module) {
  importAxiometricCalculus().catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}

module.exports = { importAxiometricCalculus };
