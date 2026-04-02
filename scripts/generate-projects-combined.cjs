/**
 * Combined project generator — merges Purpose of Schools (from imported-paragraphs.json),
 * Axiometric Calculus (from ac-imported.json), and Ontological Dictionary (from od-imported.json)
 * into a single projects.js.
 *
 * Output: src/data/projects.js
 */

const fs = require('fs');
const path = require('path');

// Load Purpose of Schools paragraph data
const imported = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'imported-paragraphs.json'), 'utf8'));

// Merge section-7-proposal into s7-1 (same as original script)
if (imported['section-7-proposal'] && imported['s7-1']) {
  imported['s7-1'] = [...imported['section-7-proposal'], ...imported['s7-1']];
}
delete imported['section-7-proposal'];

// Load AC and OD imported data
const acProject = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'ac-imported.json'), 'utf8'));
const odProject = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'od-imported.json'), 'utf8'));

// --- Purpose of Schools helpers (copied from generate-projects.cjs) ---

function parasFor(id) {
  return imported[id] || [];
}

function statusFor(id) {
  const paras = parasFor(id);
  if (paras.length === 0) return 'brainstorm';
  const noteCount = paras.filter(p => p.text.startsWith('[') || p.text.startsWith('(') || p.text.length < 30).length;
  if (noteCount > paras.length / 2) return 'brainstorm';
  return 'drafting';
}

function sec(id, title, spine, children, extraStatus) {
  const paras = parasFor(id);
  const status = extraStatus || (paras.length > 0 ? statusFor(id) : (children.length > 0 ? 'drafting' : 'brainstorm'));
  return { id, title, spine, status, children, paragraphs: paras };
}

// --- Purpose of Schools project (identical mapping to original) ---

const purposeOfSchools = {
  id: 'purpose-of-schools',
  name: 'Purpose of Schools',
  icon: '\u{1F4D6}',
  color: '#2A5F7C',
  parts: [
    {
      id: 'part-1',
      title: 'Part I: Philosophy & Rationale',
      subtitle: 'The foundation \u2014 why, what, and who',
      children: [
        sec('why', 'WHY', 'The current system is broken because it has always prioritized content over cognition.', [
          sec('introduction', 'Introduction', 'Content is the least stable element of the modern world; the foundation of curriculum must shift from what to learn to how to learn.', [], 'revised'),
          sec('strong-scaffolds', 'Strong Scaffolds on a Crooked Building', 'Reformers kept reinforcing a structure whose foundation was never sound.', [
            sec('renovations', 'Renovations Instead of Reconstruction', '', []),
            sec('bridges-bolted', 'Bridges Bolted to Cracked Walls', '', []),
            sec('scaffolds-pretend', 'When Scaffolds Pretend to Be Buildings', '', []),
          ], 'revised'),
          sec('pyramids', 'Pyramids Built on Quicksand', 'Every dominant sequence model reveals a deeper failure to anchor curriculum in cognition.', [
            sec('hierarchy', 'Hierarchy: The Long Staircase', '', []),
            sec('taxonomy', 'Taxonomy: Ladders Mistaken for Maps', '', []),
            sec('cyclical', 'Cyclical: Loops That Forget the Landscape', '', []),
            sec('orrery', 'Knowledge Orrery: Orbiting a Moving Center', '', []),
            sec('knowledge-graph', 'Knowledge Graph', '', [], 'drafting'),
            sec('oversimplifying', 'Oversimplifying Oversimplifications', '', []),
          ], 'revised'),
          sec('thermometers', 'Thermometers That Control the Weather', 'Assessment has become a self-fulfilling system that defines the reality it claims to measure.', [
            sec('microscopes', 'Microscopes and Satellites', '', []),
            sec('one-key', 'One Key for Every Door', '', []),
            sec('two-radios', 'Two Radios, One Frequency', '', [], 'drafting'),
            sec('compass', 'When the Compass Mistakes North for the Only Way Forward', '', []),
          ], 'revised'),
        ], 'revised'),
        sec('what', 'WHAT', 'Curriculum is not a thing but a relational space \u2014 a contexture.', [
          sec('intermission', 'Intermission: Snowflakes and Snowstorms', '', [], 'done'),
          sec('curriculum-concept', 'Curriculum as a Concept', 'Curriculum is not a thing to be defined but a relational space \u2014 a contexture \u2014 that bends depending on who enters it.', [
            sec('fracture', 'Curriculum in Pieces (Fracture, Not Failure)', '', []),
            sec('factorials', 'Fracturing Factorials', '', []),
          ], 'revised'),
        ], 'revised'),
        sec('who', 'WHO', 'Power flows through curriculum \u2014 who designs it, who enforces it, and who is excluded by it.', [
          sec('who-in-charge', 'Who Is in Charge? Who Enacts Change? Who Has the Power?', 'Theorists create frameworks, society absorbs and distorts their ideas, and conservative/progressive forces push and pull for control.', [
            sec('tides', 'Tides of Change', '', []),
            sec('corporate', 'Corporate Era', '', []),
            sec('gender-reform', 'How Corporations Inspired Gender Reform', '', []),
            sec('right-way', '"Educating the Right Way" \u2014 Tool of Change', '', []),
            sec('left-rest', "What's 'Left' for the Rest? \u2014 Force of Change", '', []),
            sec('so-what-power', 'So... What?', '', []),
          ]),
          sec('who-no-power', 'Who Does Not Have the Power?', 'Oppression is what happens when your reality is defined for you.', [
            sec('who-oppressed', 'Who Is Oppressed?', '', [
              sec('a-place-in-time', 'A Place in Time', '', []),
              sec('reality-of-race', "On the Reality of Race: It's Not Black and White", '', []),
              sec('group-ideology', 'Group-Based Ideology', '', []),
              sec('cognitive-oppression', 'Cognitive Oppression', '', []),
            ]),
          ]),
        ], 'drafting'),
      ],
    },
    {
      id: 'part-2',
      title: 'Part II: Implementation',
      subtitle: 'The proposal \u2014 rethinking, designing, scaling',
      children: [
        sec('section-5', "Rethinking Oppression: From 'Marginalized Groups' to Underexplored Minds", '', [
          sec('s5-1', "The Limit of 'Normal vs. Marginalized'", '', []),
          sec('s5-2', 'Your Pivot: Overexploration & Underexploration', '', []),
          sec('s5-3', 'Everyone Is Oppressed', '', []),
          sec('s5-4', 'Predestination + Cognition', '', []),
        ]),
        sec('section-6', 'Currere: Positionality, Identity, and the Self Under Construction', '', [
          sec('s6-1', 'Autobiographical Formation', '', []),
          sec('s6-2', 'Product and Rebel Against Your Time', '', []),
          sec('s6-3', 'Connect to Pinar', '', []),
        ]),
        sec('section-7', 'Designing a Metacognitive Curriculum', 'The school is a contexture where students develop six metacognitive habits, assessed by the dimensionality of their thinking.', [
          sec('illusion-diff', 'The Illusion of Difference', '', []),
          sec('communication', 'Communication', '', []),
          sec('metacognition', 'Metacognition', '', []),
          sec('school-implementation', 'School Implementation of Metacognition', '', [
            sec('endospection-impl', 'Endospection: Self-Identity', '', []),
            sec('omnipere-impl', 'Omnipere: Exploration and Curiosity', '', [
              sec('curriculum-fences', 'Curriculum Fences and the Role of Structure', '', []),
              sec('omnipere-practice', 'Omnipere in Practice: From Welding to Worlds', '', []),
              sec('autonomy-power', 'Autonomy, Power, and the Expansion of Exospection', '', []),
              sec('noema-constellations', 'Noema and Constellations', '', []),
            ]),
            sec('constellare-impl', 'Constellare: Research, Purposeful Organization of Noema', '', [
              sec('constellare-opp', 'Constellare in an Opportunity-Centered Curriculum', '', []),
              sec('constellare-design', 'Designing Constellare-First Opportunities', '', []),
            ]),
            sec('critical-thinking', 'Critical Thinking/Reflection', '', []),
            sec('exospection-impl', 'Exospection', '', []),
            sec('synthesis-impl', 'Synthesis', '', []),
          ]),
          sec('s7-1', 'Why Metacognition Is the Only Scalable Purpose', '', []),
          sec('s7-2', 'The Core Principles of Your Curriculum', '', []),
          sec('s7-3', 'How Existing Frameworks Fit Into It', '', []),
          sec('s7-4', 'Your Structure Using Your Five Sequence Models', '', []),
        ]),
        sec('section-8', 'Technology, Scalability, and the AI Tutor Ecosystem', '', [
          sec('s8-1', 'The Acceleration Problem', '', []),
          sec('s8-2', 'What AI Tutors Enable', '', []),
          sec('s8-3', 'Why AI Requires a Metacognitive Curriculum', '', []),
        ]),
        sec('section-9', 'So What: The Call to Action', '', [
          sec('s9-1', 'Why Theory Is Not Enough', '', []),
          sec('s9-2', 'Why This Curriculum Is Necessary NOW', '', []),
          sec('s9-3', 'Your Model as the Next Step in 250 Years of Discourse', '', []),
          sec('s9-4', 'Final Line', '', []),
        ]),
      ],
    },
    {
      id: 'conclusion',
      title: 'Conclusion',
      subtitle: '',
      children: [
        sec('conclusion-section', 'In Conclusion', '', []),
      ],
    },
    {
      id: 'working-notes',
      title: 'Working Notes',
      subtitle: 'Planning, meta-content, and editorial notes',
      children: [
        sec('summary-notes', 'Remaining Structure Notes', '', []),
      ],
    },
  ],
};

// --- Count totals ---

function countProject(project) {
  let sections = 0, paragraphs = 0;
  function walk(secs) {
    for (const s of secs) {
      sections++;
      paragraphs += (s.paragraphs || []).length;
      if (s.children) walk(s.children);
    }
  }
  for (const part of project.parts) {
    walk(part.children);
  }
  return { sections, paragraphs };
}

const posCounts = countProject(purposeOfSchools);
const acCounts = countProject(acProject);
const odCounts = countProject(odProject);

const totalParas = posCounts.paragraphs + acCounts.paragraphs + odCounts.paragraphs;
const totalSections = posCounts.sections + acCounts.sections + odCounts.sections;

// --- Assemble and write ---

const PROJECTS = [purposeOfSchools, acProject, odProject];

const output = `/**
 * Tessera Data \u2014 Auto-generated from all three project sources
 * Generated: ${new Date().toISOString()}
 *
 * Structure: Project \u2192 Part \u2192 Section (recursive) \u2192 Paragraphs
 *
 * Purpose of Schools: ${posCounts.paragraphs} paragraphs, ${posCounts.sections} sections (from docx)
 * Axiometric Calculus: ${acCounts.paragraphs} paragraphs, ${acCounts.sections} sections (from docx)
 * Ontological Dictionary: ${odCounts.paragraphs} paragraphs, ${odCounts.sections} sections (from docx)
 * Total: ${totalParas} paragraphs across ${totalSections} sections
 */

const PROJECTS = ${JSON.stringify(PROJECTS, null, 2)};

export default PROJECTS;
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'projects.js'), output);
console.log('Generated projects.js');
console.log(`  Purpose of Schools: ${posCounts.paragraphs} paragraphs, ${posCounts.sections} sections`);
console.log(`  Axiometric Calculus: ${acCounts.paragraphs} paragraphs, ${acCounts.sections} sections`);
console.log(`  Ontological Dictionary: ${odCounts.paragraphs} paragraphs, ${odCounts.sections} sections`);
console.log(`  Total: ${totalParas} paragraphs, ${totalSections} sections`);
console.log(`  File size: ${(output.length / 1024).toFixed(1)} KB`);
