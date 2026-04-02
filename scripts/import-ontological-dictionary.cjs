/**
 * Import script for the Integrated Ontological Dictionary.
 * Parses the .docx into 5 Parts with h3-level term sub-sections.
 *
 * Input:  docs/writings/Purpose of School/Ontological Dictionary/Integrated_Ontological_Dictionary.docx
 * Output: src/data/od-imported.json
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

const DOCX_PATH = path.join(__dirname, '..', 'docs', 'writings', 'Purpose of School', 'Ontological Dictionary', 'Integrated_Ontological_Dictionary.docx');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'od-imported.json');

// Part-level spine sentences
const PART_SPINES = {
  'PART I: THE CORE PRINCIPLE': 'Grammar represents but is not the cognitive phenomena it names — the tension is intentional.',
  'PART II: THE SUBSTANCE — NOEMA, TRACES, AND THE TESSERACTIC NATURE OF MEANING': 'Noema is the fluid, recursive, tesseractic unit of meaning that constitutes all cognitive reality.',
  'PART III: THE FIVE METACOGNITIVE HABITS': 'Five habits structure metacognitive development: Endospecture, Omnipere, Constellare, Refracture, Exospecture.',
  'PART IV: AXIOMATICS — THE PRACTICE OF CREATING RULE-SYSTEMS': 'Axiomatics is not creating new truth — it is reorganizing thought into communicable, followable rule-systems.',
  'PART V: THE VERSŌR SYSTEM — A COMMUNICATIVE CALCULUS FOR METACOGNITIVE EXPRESSION': 'The Versōr System encodes metacognitive awareness in communication through cognitive orientation prefixes.'
};

async function importOntologicalDictionary() {
  console.log('Importing Integrated Ontological Dictionary...');
  const html = await docxToHtml(DOCX_PATH);
  console.log(`  HTML length: ${html.length} chars`);

  // Split into Parts by <h1>
  const parts = splitByHeading(html, 'h1');
  console.log(`  Found ${parts.length} Parts`);

  const tesseraParts = [];

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    const partNum = pi + 1;
    const partId = `od-part-${partNum}`;
    const partTitle = cleanPartTitle(part.title);
    const partSpine = PART_SPINES[part.title] || firstSentence(stripTags(part.content));

    console.log(`  Part ${partNum}: ${partTitle}`);

    // Split sections by <h2>
    const h2Sections = splitByHeading(part.content, 'h2');

    // Handle content before first h2
    const introElements = getIntroElements(part.content, 'h2');

    const tesseraSections = [];
    let paraCounter = 0;

    // Intro paragraphs
    if (introElements.length > 0) {
      const introParas = buildParas(introElements, `${partId}-intro`, paraCounter);
      paraCounter += introParas.length;
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
    for (const h2Sec of h2Sections) {
      const h2Id = slugify(h2Sec.title, partId);
      const h2Title = h2Sec.title;

      // Check if this h2 section has h3 sub-sections
      const h3Sections = splitByHeading(h2Sec.content, 'h3');

      if (h3Sections.length > 0) {
        // This h2 has h3 children — create nested structure
        const h2Children = [];

        // Get any content before the first h3
        const h2Intro = getIntroElements(h2Sec.content, 'h3');
        const h2IntroParas = buildParas(h2Intro, `${h2Id}-intro`, paraCounter);
        paraCounter += h2IntroParas.length;

        // Process h3 sub-sections as child sections
        for (const h3Sec of h3Sections) {
          const h3Id = slugify(h3Sec.title, h2Id);
          const h3Title = h3Sec.title;

          const h3Elements = elementsFromHtml(h3Sec.content);
          const h3Paras = buildParas(h3Elements, h3Id, paraCounter);
          paraCounter += h3Paras.length;

          // For term definitions, extract the definition as spine
          const h3Spine = extractDefinitionSpine(h3Paras) || firstSentence(h3Paras[0]?.text || h3Title);

          // Detect if this is a term definition (Part of Speech / Definition markers)
          const isTermDef = h3Paras.some(p =>
            p.text.replace(/<[^>]+>/g, '').match(/^(Part of Speech:|Definition:)/i)
          );

          // Mark definition paragraphs
          if (isTermDef) {
            for (const p of h3Paras) {
              const plain = p.text.replace(/<[^>]+>/g, '');
              if (/^Definition:/i.test(plain)) {
                p.spineRole = 'definition';
              } else if (/^Part of Speech:/i.test(plain)) {
                p.spineRole = 'setup';
              } else if (/^(Example|Note|Key|The |Why |What |Which |Avoiding|Properties|Possessive)/i.test(plain)) {
                p.spineRole = 'evidence';
              }
            }
          }

          h2Children.push(makeSec(
            h3Id,
            h3Title,
            h3Spine,
            'revised',
            [],
            h3Paras
          ));
        }

        tesseraSections.push(makeSec(
          h2Id,
          h2Title,
          firstSentence(h2IntroParas[0]?.text || h2Title),
          'revised',
          h2Children,
          h2IntroParas
        ));
      } else {
        // No h3 children — flat section
        const elements = elementsFromHtml(h2Sec.content);
        const secParas = buildParas(elements, h2Id, paraCounter);
        paraCounter += secParas.length;

        tesseraSections.push(makeSec(
          h2Id,
          h2Title,
          firstSentence(secParas[0]?.text || h2Title),
          'revised',
          [],
          secParas
        ));
      }
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
    id: 'ontological-dictionary',
    name: 'Ontological Dictionary',
    icon: '📓',
    color: '#9E5A2A',
    parts: tesseraParts
  };

  // Count totals
  let totalParas = 0;
  let totalSections = 0;
  function countSections(sections) {
    for (const sec of sections) {
      totalSections++;
      totalParas += sec.paragraphs.length;
      if (sec.children) countSections(sec.children);
    }
  }
  for (const part of tesseraParts) {
    countSections(part.children);
  }

  console.log(`  Total: ${tesseraParts.length} Parts, ${totalSections} Sections, ${totalParas} Paragraphs`);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(project, null, 2));
  console.log(`  Written to ${OUTPUT_PATH}`);

  return project;
}

/**
 * Build paragraph objects from element array.
 */
function buildParas(elements, idPrefix, startCounter) {
  const paras = [];
  let counter = startCounter;

  for (const el of elements) {
    if (el.type === 'table') {
      const tblParas = tableToParas(el.html, idPrefix, counter);
      paras.push(...tblParas);
      counter += tblParas.length;
    } else if (el.type === 'paragraph' || el.type === 'list') {
      counter++;
      paras.push(makePara(
        `${idPrefix}-p${counter}`,
        stripTags(el.html),
        autoSpineRole(el.text || ''),
        []
      ));
    }
  }

  return paras;
}

/**
 * Extract a definition sentence to use as spine.
 * Looks for "Definition:" line in paragraphs.
 */
function extractDefinitionSpine(paras) {
  for (const p of paras) {
    const plain = p.text.replace(/<[^>]+>/g, '');
    const match = plain.match(/^Definition:\s*(.+)/i);
    if (match) {
      const def = match[1].trim();
      // First sentence of the definition
      const sentenceMatch = def.match(/^[^.!?]+[.!?]/);
      return sentenceMatch ? sentenceMatch[0].trim() : def.substring(0, 150);
    }
  }
  return null;
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
    } else if (tag === 'ul' || tag === 'ol') {
      const items = [];
      $(el).find('li').each((_, li) => items.push($(li).html()));
      const listHtml = items.map((item, i) => {
        const bullet = tag === 'ol' ? `${i + 1}. ` : '• ';
        return bullet + item;
      }).join('<br>');
      results.push({ type: 'paragraph', html: listHtml, text: $(el).text().trim() });
    }
  }

  return results;
}

function cleanPartTitle(title) {
  return title.replace(/^PART\s+[IVXLC]+:\s*/i, '').trim();
}

function toRoman(num) {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
}

if (require.main === module) {
  importOntologicalDictionary().catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}

module.exports = { importOntologicalDictionary };
