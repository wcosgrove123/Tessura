/**
 * Cross-reference scanner — scans all paragraphs in all projects for linked term mentions,
 * then builds refs arrays for each term.
 *
 * Input:  src/data/projects.js, src/data/linkedTerms.js
 * Output: Updated versions of both files
 */

const fs = require('fs');
const path = require('path');

const PROJECTS_PATH = path.join(__dirname, '..', 'src', 'data', 'projects.js');
const TERMS_PATH = path.join(__dirname, '..', 'src', 'data', 'linkedTerms.js');

function loadProjects() {
  const content = fs.readFileSync(PROJECTS_PATH, 'utf8');
  // Extract the JSON array from the JS module
  const match = content.match(/const PROJECTS = (\[[\s\S]+?\]);/);
  if (!match) throw new Error('Could not parse projects.js');
  return JSON.parse(match[1]);
}

function loadTerms() {
  const content = fs.readFileSync(TERMS_PATH, 'utf8');
  const match = content.match(/const LINKED_TERMS = ({[\s\S]+?});/);
  if (!match) throw new Error('Could not parse linkedTerms.js');
  return JSON.parse(match[1]);
}

/**
 * Build regex patterns for all terms, sorted by length (longest first)
 * to avoid substring matches.
 */
function buildTermPatterns(termKeys) {
  // Sort longest first
  const sorted = [...termKeys].sort((a, b) => b.length - a.length);

  const patterns = [];
  for (const key of sorted) {
    // Escape special regex chars
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Word boundary matching
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    patterns.push({ key, regex });
  }

  return patterns;
}

/**
 * Detect terms in a text string.
 */
function detectTermsInText(text, patterns) {
  if (!text) return [];
  const plain = text.replace(/<[^>]+>/g, '').toLowerCase();
  const matched = [];

  for (const { key, regex } of patterns) {
    if (regex.test(plain)) {
      matched.push(key);
    }
  }

  return matched;
}

/**
 * Extract a snippet around a term in text.
 */
function extractSnippet(text, termKey, maxLen = 120) {
  const plain = text.replace(/<[^>]+>/g, '');
  const idx = plain.toLowerCase().indexOf(termKey.toLowerCase());
  if (idx === -1) return plain.substring(0, maxLen);

  const start = Math.max(0, idx - 40);
  const end = Math.min(plain.length, idx + termKey.length + 40);

  let snippet = '';
  if (start > 0) snippet += '...';
  snippet += plain.substring(start, end).trim();
  if (end < plain.length) snippet += '...';

  return snippet;
}

/**
 * Walk all paragraphs in a project, applying term detection and collecting refs.
 */
function scanProject(project, patterns, termRefs) {
  let totalDetections = 0;

  function walkSections(sections, parentPath) {
    for (const sec of sections) {
      const secPath = parentPath ? `${parentPath} > ${sec.title}` : sec.title;

      if (sec.paragraphs) {
        for (const para of sec.paragraphs) {
          const terms = detectTermsInText(para.text, patterns);
          para.linkedTerms = terms;
          totalDetections += terms.length;

          // Collect refs
          for (const termKey of terms) {
            if (!termRefs[termKey]) termRefs[termKey] = {};
            if (!termRefs[termKey][project.id]) termRefs[termKey][project.id] = [];

            // Only keep up to 5 refs per project per term
            if (termRefs[termKey][project.id].length < 5) {
              termRefs[termKey][project.id].push({
                project: project.id,
                doc: sec.id,
                snippet: extractSnippet(para.text, termKey)
              });
            }
          }
        }
      }

      if (sec.children) {
        walkSections(sec.children, secPath);
      }
    }
  }

  for (const part of project.parts) {
    walkSections(part.children, part.title);
  }

  return totalDetections;
}

async function scanCrossRefs() {
  console.log('Scanning cross-references...');

  const projects = loadProjects();
  const terms = loadTerms();
  const termKeys = Object.keys(terms);
  const patterns = buildTermPatterns(termKeys);

  console.log(`  Scanning ${termKeys.length} terms across ${projects.length} projects`);

  const termRefs = {};
  let totalDetections = 0;

  for (const project of projects) {
    const count = scanProject(project, patterns, termRefs);
    totalDetections += count;
    console.log(`  ${project.name}: ${count} term detections`);
  }

  // Update term refs
  for (const key of termKeys) {
    if (termRefs[key]) {
      // Flatten all project refs into a single array, max 3 per project
      const allRefs = [];
      for (const [projectId, refs] of Object.entries(termRefs[key])) {
        allRefs.push(...refs.slice(0, 3));
      }
      terms[key].refs = allRefs;
    } else {
      terms[key].refs = [];
    }
  }

  // Count terms with refs
  const termsWithRefs = termKeys.filter(k => terms[k].refs.length > 0).length;
  console.log(`  ${termsWithRefs}/${termKeys.length} terms have cross-references`);
  console.log(`  ${totalDetections} total term detections across all paragraphs`);

  // Write updated projects.js
  const projectsHeader = fs.readFileSync(PROJECTS_PATH, 'utf8').match(/\/\*\*[\s\S]*?\*\//)?.[0] || '';
  const projectsOutput = `${projectsHeader}

const PROJECTS = ${JSON.stringify(projects, null, 2)};

export default PROJECTS;
`;

  fs.writeFileSync(PROJECTS_PATH, projectsOutput);
  console.log(`  Updated projects.js (${(projectsOutput.length / 1024).toFixed(1)} KB)`);

  // Write updated linkedTerms.js
  const termsOutput = `/**
 * Tessera Linked Terms \u2014 Auto-generated with cross-references
 * Generated: ${new Date().toISOString()}
 * ${termKeys.length} terms tracked across ${projects.length} projects
 * ${totalDetections} cross-references detected
 */

const LINKED_TERMS = ${JSON.stringify(terms, null, 2)};

export default LINKED_TERMS;
`;

  fs.writeFileSync(TERMS_PATH, termsOutput);
  console.log(`  Updated linkedTerms.js (${(termsOutput.length / 1024).toFixed(1)} KB)`);
}

if (require.main === module) {
  scanCrossRefs().catch(err => {
    console.error('Scan failed:', err);
    process.exit(1);
  });
}

module.exports = { scanCrossRefs };
