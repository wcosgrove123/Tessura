const fs = require('fs');
const imported = JSON.parse(fs.readFileSync('src/data/imported-paragraphs.json', 'utf8'));

// Merge section-7-proposal into s7-1
if (imported['section-7-proposal'] && imported['s7-1']) {
  imported['s7-1'] = [...imported['section-7-proposal'], ...imported['s7-1']];
}
delete imported['section-7-proposal'];

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

const PROJECTS = [
  {
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
  },
  {
    id: 'axiometric-calculus',
    name: 'Axiometric Calculus',
    icon: '\u2211',
    color: '#2D6B5A',
    parts: [
      {
        id: 'ac-main',
        title: 'Core System',
        subtitle: '',
        children: [
          {
            id: 'primitives', title: 'Primitives (P\u2080\u2013P\u2087)', status: 'revised',
            spine: 'Seven foundational claims that are unprovable but necessary for the system to operate.',
            children: [],
            paragraphs: [
              { id: 'ap1', text: 'P\u2080: \u03BD exists. A noema is any unit of meaning \u2014 a concept, belief, idea, moment, or unit of meaning held by a consciousness.', status: 'done', spineRole: 'claim', linkedTerms: ['noema'] },
              { id: 'ap2', text: 'P\u2081: \u03BA exists. Consciousness is the condition of experiencing noema. Without \u03BA, \u03BD has no container.', status: 'done', spineRole: 'claim' },
            ],
          },
          {
            id: 'axioms', title: 'Axioms & Operators', status: 'revised',
            spine: 'The axioms are mutually constitutive \u2014 each holds because the others hold.',
            children: [],
            paragraphs: [
              { id: 'ax1', text: 'A\u2080: (\u03BD\u2081 \u220B \u03BD\u2082) =* (\u03BD\u2082 \u220B \u03BD\u2081). Tesseractic equality: mutual containment. If A contains B, then B contains A. This is the foundational move.', status: 'done', spineRole: 'claim', linkedTerms: ['tesseractic', 'noema'] },
              { id: 'ax2', text: 'The operator =* replaces traditional equality. It asserts that the relationship between two noema is always bidirectional and constitutive.', status: 'done', spineRole: 'evidence', linkedTerms: ['tesseractic'] },
              { id: 'ax3', text: '\u03BA* \u225D endo(\u03BA): cogniscience is consciousness turned upon itself. This is the metacognitive moment \u2014 the instant you become aware of your own awareness.', status: 'revised', spineRole: 'claim', linkedTerms: ['cogniscience', 'endospection'] },
            ],
          },
          {
            id: 'versors', title: 'The Vers\u014Dr System', status: 'drafting',
            spine: 'Vers\u014Drs are prefix-functions that turn meaning toward a cognitive orientation.',
            children: [],
            paragraphs: [
              { id: 'v1', text: 'A vers\u014Dr is a prefix-function \u2014 endo(, exo(, koino(, nulo( \u2014 that transforms a verb into a metacognitive operation.', status: 'done', spineRole: 'claim' },
              { id: 'v2', text: 'The vers\u014Dr endo( turns any verb toward the self. endo(reflect) means to turn reflection upon itself. This is not merely introspection \u2014 it is the structural transformation of a cognitive act.', status: 'drafting', spineRole: 'evidence', linkedTerms: ['endospection'] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ontological-dictionary',
    name: 'Ontological Dictionary',
    icon: '\u{1F4D3}',
    color: '#9E5A2A',
    parts: [
      {
        id: 'od-main',
        title: 'Dictionary',
        subtitle: '',
        children: [
          {
            id: 'core-terms', title: 'Core Terms', status: 'revised',
            spine: 'Each term is defined relationally \u2014 meaning is constituted through connection, not isolation.',
            children: [],
            paragraphs: [
              { id: 'od1', text: 'Noema (\u03BD): Any unit of meaning \u2014 a concept, belief, idea, moment held by a consciousness. Endospectively personal, existing only within one\u2019s noemascape.', status: 'done', spineRole: 'definition', linkedTerms: ['noema'] },
              { id: 'od2', text: 'Noemata: Paradoxical noema that exist outside your noemascape \u2014 the impossible-to-access units of meaning in the exofield.', status: 'done', spineRole: 'definition', linkedTerms: ['noema'] },
              { id: 'od3', text: 'Schema (\u03C3): Noema you\u2019ve accepted as truth through metacognitive examination. Not passive knowledge, but trust within yourself that they are right.', status: 'done', spineRole: 'definition', linkedTerms: ['schema', 'noema'] },
            ],
          },
          {
            id: 'structures', title: 'Structures & Spaces', status: 'drafting',
            spine: 'The metacognitive architecture: endosphere, perifield, exofield, and the boundaries between them.',
            children: [],
            paragraphs: [
              { id: 'os1', text: 'Perifield (\u2118): From Greek peri (around) + field. The space within the noemascape where cogniscience happens \u2014 where metacognitive work is done.', status: 'done', spineRole: 'definition', linkedTerms: ['perifield', 'cogniscience'] },
              { id: 'os2', text: 'Outer Lens: The boundary between endosphere and perifield. Bends noema transitioning between pre-cognitive and metacognitive states.', status: 'drafting', spineRole: 'definition', linkedTerms: ['noema'] },
              { id: 'os3', text: 'Contexture: The structured relational space of a curriculum \u2014 not content, not framework, but the space that forms depending on who enters.', status: 'done', spineRole: 'definition', linkedTerms: ['contexture'] },
            ],
          },
          {
            id: 'habits', title: 'Metacognitive Habits', status: 'brainstorm',
            spine: 'Six habits that structure metacognitive development, each with a corresponding spatial metaphor.',
            children: [],
            paragraphs: [
              { id: 'oh1', text: 'Endospection (endo(reflect)): Turning awareness inward. The first and foundational habit. All metacognitive work begins with the capacity to observe one\u2019s own thinking.', status: 'done', spineRole: 'definition', linkedTerms: ['endospection'] },
              { id: 'oh2', text: 'Omniperegrination: Wandering through the perifield \u2014 the habit of exploration and curiosity without predetermined destination.', status: 'brainstorm', spineRole: 'definition', linkedTerms: ['perifield'] },
            ],
          },
        ],
      },
    ],
  },
];

const output = `/**
 * Tessera Data \u2014 Auto-generated from Purpose of Schools - expanded.docx
 * Generated: ${new Date().toISOString()}
 *
 * Structure: Project \u2192 Part \u2192 Section (recursive) \u2192 Paragraphs
 * 784 paragraphs across 72 sections imported from docx
 * 117 linked term references auto-detected
 */

const PROJECTS = ${JSON.stringify(PROJECTS, null, 2)};

export default PROJECTS;
`;

fs.writeFileSync('src/data/projects.js', output);
console.log('Generated projects.js');
console.log('File size:', (output.length / 1024).toFixed(1), 'KB');
