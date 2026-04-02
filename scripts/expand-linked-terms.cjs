/**
 * Expand linked terms from OD and AC imported data.
 * Extracts ~40-50 terms with symbols, definitions, and project references.
 *
 * Input:  src/data/od-imported.json, src/data/ac-imported.json
 * Output: src/data/linkedTerms.js
 */

const fs = require('fs');
const path = require('path');

const OD_PATH = path.join(__dirname, '..', 'src', 'data', 'od-imported.json');
const AC_PATH = path.join(__dirname, '..', 'src', 'data', 'ac-imported.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'linkedTerms.js');

// Known symbols for terms (from the Calculus and Dictionary)
const SYMBOL_MAP = {
  'noema': 'ν',
  'noemata': 'ν*',
  'noematic': '~ν',
  'schemata': '~σ',
  'schema': 'σ',
  'noemascape': 'N',
  'perifield': '℘',
  'outer lens': 'L',
  'threshold': 'T',
  'exofield': 'Ξf',
  'noemagraph': 'G',
  'trace': 'τ',
  'bond': 'β',
  'fluxion': '↝',
  'nebula': '≋',
  'axis': 'α',
  'constellation': 'Ω',
  'exosphere': 'Ξ',
  'projection': '→Ξ',
  'refractal': 'ρ',
  'exologue': '⇒*',
  'cogniscience': 'κ*',
  'cognesce': 'κ~',
  'cogniscent': 'κ+',
  'contexture': '◊',
  'endospecture': 'endo(',
  'endospection': 'endo(',
  'omnipere': 'omni(',
  'omniperegrination': 'omni(',
  'constellare': 'const(',
  'constellaration': 'const(',
  'refracture': 'refr(',
  'refraction': 'refr(',
  'exospecture': 'exo(',
  'exospection': 'exo(',
  'tesseractic': '=*',
  'oppression': 'Ω',
  'axiomatics': 'Ax',
  'axiomatica': 'Ax*',
  'versor': 'V(',
  'versation': 'V~',
  'versum': 'V(x)',
  'versura': 'Vₐ',
  'gravity': 'g',
  'instinct': 'i',
  'thought': 'θ',
  'consciousness': 'κ',
  'emotion': 'Em',
  'memory': 'M',
  'life': 'L',
  'endosphere': 'E',
  'endologue': 'E~',
  'omniperegrination': 'omni~',
  'constellaration': 'const~',
  'endospecture': 'endo(',
  'exospecture': 'exo(',
  'omnipere': 'omni(',
  'constellare': 'const(',
  'refracture': 'refr(',
  'refraction': 'refr~',
  'exospection': 'exo~',
  'metacognition': 'μκ',
};

// Color palette — OD terms use warm tones, AC terms use cool/green tones
const OD_COLORS = [
  '#9E5A2A', '#A0633A', '#8B5C3E', '#7A5230', '#B06B3A',
  '#96522E', '#AA6644', '#8C4E28', '#9A5832', '#A46038',
];
const AC_COLORS = [
  '#2D6B5A', '#357A66', '#2A6050', '#3B8570', '#28574A',
  '#3D7F6B', '#2F6E5D', '#348063', '#266050', '#3A7565',
];

// Terms to extract — section title patterns in the OD that represent term definitions
// We'll walk the OD tree and identify h3-level sections as terms
function extractTermsFromOD(odProject) {
  const terms = {};
  let colorIdx = 0;

  function walkSections(sections, depth) {
    for (const sec of sections) {
      // h3-level term definitions have title in CAPS or are known terms
      const title = sec.title.trim();
      const key = normalizeTermKey(title);

      if (key && isTermSection(sec, depth)) {
        const def = extractDefinition(sec);
        const symbol = SYMBOL_MAP[key] || '';

        if (!terms[key]) {
          terms[key] = {
            symbol,
            definition: def || `${title} — term from the Ontological Dictionary.`,
            project: 'ontological-dictionary',
            color: OD_COLORS[colorIdx % OD_COLORS.length],
            refs: []
          };
          colorIdx++;
        }
      }

      if (sec.children) {
        walkSections(sec.children, depth + 1);
      }
    }
  }

  for (const part of odProject.parts) {
    walkSections(part.children, 0);
  }

  return terms;
}

/**
 * Check if a section looks like a term definition.
 */
function isTermSection(sec, depth) {
  // Must have paragraphs
  if (!sec.paragraphs || sec.paragraphs.length === 0) {
    // Could still be a term if it has children with content
    if (!sec.children || sec.children.length === 0) return false;
  }

  const title = sec.title.trim();

  // Skip generic structural titles
  if (/^(Introduction|Definition|Core Questions|What .+ (IS|Examines|Navigates|Organizes)|The Key|Structural Pattern|Complete Parallel|The Two Patterns|The Three Elements|The Formula|Complete Versation|When to Use|The Distinctions|Why This Matters)/i.test(title)) {
    return false;
  }

  // Known term titles (all caps or recognized terms)
  if (title === title.toUpperCase() && title.length > 2 && title.length < 60) return true;

  // Known term patterns
  if (/^(TO |THE )?[A-Z][A-Z\s()\-]+$/.test(title)) return true;

  // Named versors
  if (/^(ENDO|EXO|KOINO|NULO)\(/.test(title)) return true;

  return false;
}

/**
 * Normalize a section title to a term key.
 */
function normalizeTermKey(title) {
  let key = title
    .toLowerCase()
    .replace(/^(the\s+)/i, '')
    .replace(/\s*[—–-]\s*.+$/, '') // Remove subtitle after dash
    .replace(/\s*\(.+\)$/, '') // Remove parenthetical
    .trim();

  // Skip overly generic titles
  if (['introduction', 'definition', 'core questions', 'properties', 'structural pattern',
       'complete parallel structure', 'the key inversion', 'habit 1', 'habit 2', 'habit 3',
       'habit 4', 'habit 5', 'the two patterns', 'the three elements encoded in every versum',
       'the formula', 'complete versation guide', 'when to use each',
       'the distinctions visualized', 'why this matters', 'appendix a', 'appendix b',
       'appendix c', 'appendix d', 'notes for future terminology work',
       'quick reference for all terms', 'possessive rules summary',
       'five core questions', 'quick reference card',
       'structures', 'case study',
       'complete terminology with examples', 'products, relations, and events',
       'schemata and schema: the trust distinction', 'cogniscence and learning',
       'core ontological claim', 'noema lifecycle', 'noema properties',
       'four versōra in detail', 'enclosure patterns: the grammar of direction',
       'versation and the versātor', 'noun',
       'noun-as-noun convention',
       'endo', 'exo(', 'koino(', 'nulo('].some(s => key === s || key.includes(s))) {
    return null;
  }

  // Clean up "to X" verb forms
  if (key.startsWith('to ')) {
    key = key.substring(3); // "to cognesce" → "cognesce"
  }

  // Remove articles
  key = key.replace(/^(a|an|the)\s+/i, '');

  return key || null;
}

/**
 * Extract the definition text from a term section's paragraphs.
 */
function extractDefinition(sec) {
  const allParas = [...(sec.paragraphs || [])];

  // Also check first few paragraphs of children
  if (sec.children) {
    for (const child of sec.children.slice(0, 2)) {
      allParas.push(...(child.paragraphs || []));
    }
  }

  for (const p of allParas) {
    const plain = (p.text || '').replace(/<[^>]+>/g, '');
    const match = plain.match(/^Definition:\s*(.+)/i);
    if (match) {
      // First sentence
      const def = match[1].trim();
      const sentenceMatch = def.match(/^[^.!?]+[.!?]/);
      return sentenceMatch ? sentenceMatch[0].trim() : def.substring(0, 200);
    }
  }

  // Fallback: first substantial paragraph
  for (const p of allParas) {
    const plain = (p.text || '').replace(/<[^>]+>/g, '');
    if (plain.length > 30 && !/^(Part of Speech|Example|Note|Key|Possessive)/i.test(plain)) {
      const sentenceMatch = plain.match(/^[^.!?]+[.!?]/);
      return sentenceMatch ? sentenceMatch[0].trim() : plain.substring(0, 200);
    }
  }

  return null;
}

/**
 * Add AC-specific terms and ensure existing curated terms are present.
 */
function addACTerms(terms) {
  let colorIdx = 0;

  const acOnlyTerms = {
    'gravity': {
      definition: 'The fundamental relational force — why mass relates to mass across distance, why anything connects to anything else.',
    },
    'instinct': {
      definition: 'Gravity applied to noema — the reason for movement between moments.',
    },
    'thought': {
      definition: 'Semi-intentional processing: instinct combined with memory (θ ≝ i ∧ M).',
    },
    'consciousness': {
      definition: 'Intentional decision-making: thought combined with endospection of thought (κ ≝ θ ∧ endo(θ)).',
    },
    'emotion': {
      definition: 'Experiential coloring of thought — embedded in thought, not consciousness (Em → θ ∧ ¬(Em → κ)).',
    },
    'tesseractic': {
      definition: 'Mutual containment: A contains B and B contains A simultaneously. Meaning is bidirectional.',
      project: 'axiometric-calculus',
    },
    'oppression': {
      definition: 'What happens when your reality is defined for you — the spine of the oppression section.',
      project: 'purpose-of-schools',
    },
    'endospection': {
      definition: 'The first metacognitive habit: turning awareness inward to examine one\'s own noemascape.',
      project: 'ontological-dictionary',
    },
    'endosphere': {
      definition: 'The self — the Cartesian anchor, the pulsating sphere of identity from which all meaning emerges.',
      project: 'ontological-dictionary',
    },
    'endologue': {
      definition: 'The product of endospection — the internal narrative or self-dialogue that emerges from examining the Endosphere.',
      project: 'ontological-dictionary',
    },
    'omniperegrination': {
      definition: 'The process of intentional wandering through the Noemagraph — thought traveling without predetermined destination.',
      project: 'ontological-dictionary',
    },
    'constellaration': {
      definition: 'The process of purposefully organizing noema around an axis — research before it has a formal method.',
      project: 'ontological-dictionary',
    },
    'endospecture': {
      definition: 'The habit of returning to, narrating, and revising the self through endospection.',
      project: 'ontological-dictionary',
    },
    'exospecture': {
      definition: 'The habit of modeling and engaging external realities through exospheres and the Threshold.',
      project: 'ontological-dictionary',
    },
    'omnipere': {
      definition: 'The habit of intentional wandering — legitimizing curiosity-driven exploration of the Noemagraph.',
      project: 'ontological-dictionary',
    },
    'constellare': {
      definition: 'The habit of purposefully organizing noema around an axis in the Perifield.',
      project: 'ontological-dictionary',
    },
    'refracture': {
      definition: 'The habit of examining how your thinking shapes your thinking — refracting through the Outer Lens.',
      project: 'ontological-dictionary',
    },
    'refraction': {
      definition: 'The process of examining how the Outer Lens bends cognition — discovering refractive patterns.',
      project: 'ontological-dictionary',
    },
    'exospection': {
      definition: 'The process of modeling external realities — building exospheres and attending to the Threshold.',
      project: 'ontological-dictionary',
    },
    'metacognition': {
      definition: 'The five habits operating on noema — consciousness examining its own cognitive processes.',
      project: 'purpose-of-schools',
    },
    'life': {
      definition: 'The conjunction of thought, awareness, and perception (L ↔ θ ∧ A ∧ P).',
      project: 'axiometric-calculus',
    },
    'memory': {
      definition: 'Physical marker of change — exists in non-life (craters) and life (DNA). M → Δ.',
      project: 'axiometric-calculus',
    },
  };

  for (const [key, data] of Object.entries(acOnlyTerms)) {
    if (!terms[key]) {
      terms[key] = {
        symbol: SYMBOL_MAP[key] || '',
        definition: data.definition,
        project: 'axiometric-calculus',
        color: AC_COLORS[colorIdx % AC_COLORS.length],
        refs: []
      };
      colorIdx++;
    }
  }
}

/**
 * Preserve manually curated data from existing linked terms.
 */
function preserveExisting(terms) {
  // These 8 terms have hand-curated refs — preserve them if the term exists
  const CURATED_REFS = {
    noema: [
      { project: "purpose-of-schools", doc: "metacognitive-framework", snippet: "...the nucleus pulses with noema, the irreducible units of meaning..." },
      { project: "purpose-of-schools", doc: "oppression-section", snippet: "...imposed reality overwrites the noema one holds about oneself..." },
      { project: "axiometric-calculus", doc: "primitives", snippet: "P₀: ν exists. A noema is any unit of meaning..." },
    ],
    contexture: [
      { project: "purpose-of-schools", doc: "what-is-curriculum", snippet: "...curriculum, understood as contexture, does not exist apart from its interpreters..." },
      { project: "purpose-of-schools", doc: "metacognitive-framework", snippet: "...schools should be contextures for metacognitive engagement..." },
      { project: "ontological-dictionary", doc: "structures", snippet: "...contexture: the structured relational space of a curriculum..." },
    ],
    cogniscience: [
      { project: "purpose-of-schools", doc: "what-is-curriculum", snippet: "...the anchor is no longer content. The anchor is cogniscience..." },
      { project: "purpose-of-schools", doc: "metacognitive-framework", snippet: "...cogniscience itself as the organizing center of schooling..." },
      { project: "axiometric-calculus", doc: "axioms", snippet: "...κ* ≝ endo(κ): cogniscience is consciousness turned upon itself..." },
    ],
    tesseractic: [
      { project: "axiometric-calculus", doc: "axioms", snippet: "...A₀: (ν₁ ∋ ν₂) =* (ν₂ ∋ ν₁). Tesseractic equality..." },
      { project: "purpose-of-schools", doc: "what-is-curriculum", snippet: "...it behaves more like a tesseract: a shape that looks different depending on angle..." },
    ],
    oppression: [
      { project: "purpose-of-schools", doc: "who-no-power", snippet: "...oppression is what happens when your reality is defined for you..." },
    ],
  };

  for (const [key, refs] of Object.entries(CURATED_REFS)) {
    if (terms[key]) {
      terms[key].refs = refs;
    }
  }
}

async function expandLinkedTerms() {
  console.log('Expanding linked terms...');

  const od = JSON.parse(fs.readFileSync(OD_PATH, 'utf8'));
  const ac = JSON.parse(fs.readFileSync(AC_PATH, 'utf8'));

  // Extract terms from OD
  const terms = extractTermsFromOD(od);
  console.log(`  Extracted ${Object.keys(terms).length} terms from OD`);

  // Add AC-specific terms
  addACTerms(terms);
  console.log(`  Total after AC terms: ${Object.keys(terms).length}`);

  // Preserve curated refs
  preserveExisting(terms);

  // Sort alphabetically
  const sorted = {};
  for (const key of Object.keys(terms).sort()) {
    sorted[key] = terms[key];
  }

  // Generate linkedTerms.js
  const output = `/**
 * Tessera Linked Terms — Auto-generated from Ontological Dictionary & Axiometric Calculus
 * Generated: ${new Date().toISOString()}
 * ${Object.keys(sorted).length} terms tracked across 3 projects
 */

const LINKED_TERMS = ${JSON.stringify(sorted, null, 2)};

export default LINKED_TERMS;
`;

  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(`  Written ${Object.keys(sorted).length} terms to ${OUTPUT_PATH}`);

  // Print term list
  console.log('\n  Terms:');
  for (const [key, val] of Object.entries(sorted)) {
    console.log(`    ${val.symbol || '  '} ${key} (${val.project})`);
  }

  return sorted;
}

if (require.main === module) {
  expandLinkedTerms().catch(err => {
    console.error('Expand failed:', err);
    process.exit(1);
  });
}

module.exports = { expandLinkedTerms };
