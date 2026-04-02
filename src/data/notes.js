/**
 * Categorized notes extracted from Working Notes section.
 * Categories: idea, question, task, bibliography, comment
 */

const now = Date.now();

const NOTES = [
  // ── Ideas ──────────────────────────────────────────────
  { id: "n1", category: "idea", text: "Technology introduces new concepts. This is more in the AI section and the meta-effects of technology and AI. It creates new concepts and new realities. The earth being just another body in space rather than being the center of the universe caused the Pope to excommunicate a scientist. We didn't figure out how to create a nuclear bomb before understanding theoretical physics. The changing concepts and beliefs prove that our understanding is so limited.", linkedProjectId: "purpose-of-schools", linkedSectionId: "section-8", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["technology", "AI", "paradigm-shifts"] },
  { id: "n2", category: "idea", text: "Add in that the differentiation of classes (AP vs regular) harms the lower classes more than it helps. There should absolutely be different levels and differentiation, but it should be differentiation by opportunity, not differentiation by content.", linkedProjectId: "purpose-of-schools", linkedSectionId: "section-7", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["differentiation", "equity", "curriculum-design"] },
  { id: "n3", category: "idea", text: "AI and technology speed and change — It took 75% humanity's existence to develop consciousness. It wasn't for another 60,000 years until we figured out agriculture. The speed of change is accelerating. Content cannot keep up.", linkedProjectId: "purpose-of-schools", linkedSectionId: "s8-1", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["technology", "acceleration", "content-obsolescence"] },
  { id: "n4", category: "idea", text: "Anti-racist pedagogy focuses narrowly. How can you commit so much to a philosophy without an end goal? The goal can't just be anti-racism — that's a reactive stance. Metacognition is the proactive anchor.", linkedProjectId: "purpose-of-schools", linkedSectionId: "cognitive-oppression", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["anti-racism", "metacognition", "pedagogy"] },
  { id: "n5", category: "idea", text: "Homogeneity vs heterogeneity in schools. In a homogeneous school like a small Kansas town, shouldn't education center on students' lived experiences? But that risks reinforcing insularity.", linkedProjectId: "purpose-of-schools", linkedSectionId: "who-oppressed", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["homogeneity", "lived-experience", "cultural-emphasis"] },
  { id: "n6", category: "idea", text: "If an Armenian school emphasizes Armenian culture above all others, and a public school in Kansas doesn't mention the genocide — both are cognitive oppression. The framework applies universally.", linkedProjectId: "purpose-of-schools", linkedSectionId: "cognitive-oppression", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["cultural-emphasis", "cognitive-oppression", "universality"] },
  { id: "n7", category: "idea", text: "The remaining structure is clean, logical, defensible, and powerful: Defining Curriculum → Oppression/Overexploration & Underexploration → Currere/Positionality → Metacognitive Curriculum Proposal → Technology & AI → So What/Call to Action.", linkedProjectId: "purpose-of-schools", linkedSectionId: "part-2", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["structure", "outline", "validation"] },

  // ── Questions ──────────────────────────────────────────
  { id: "n8", category: "question", text: "How do we know to allow an emphasis on Armenian culture when there are a lot of Armenians, or have a school in Chinatown emphasize Chinese history — but then the moment we're in a homogeneous Kansas school, we suddenly need 'diverse perspectives'? What's the principle?", linkedProjectId: "purpose-of-schools", linkedSectionId: "who-oppressed", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["cultural-emphasis", "consistency", "principle"] },
  { id: "n9", category: "question", text: "Where does the focus lie in anti-racist pedagogy? How can you commit so much to a philosophy without an end goal? The goal can't just be 'not racist.'", linkedProjectId: "purpose-of-schools", linkedSectionId: "cognitive-oppression", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["anti-racism", "teleology"] },
  { id: "n10", category: "question", text: "Does a Black student in a predominantly Black school need the same anti-racist framework as a Black student in a predominantly white school? The answer depends on the cognitive framework, not the racial composition.", linkedProjectId: "purpose-of-schools", linkedSectionId: "who-oppressed", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["context-dependence", "framework"] },

  // ── Tasks / Editorial Notes ────────────────────────────
  { id: "n11", category: "task", text: "Talk about choosing an Armenian name for the autobiography section. Chose it intentionally to be anti-racist by default — picking a culture less represented in American discourse.", linkedProjectId: "purpose-of-schools", linkedSectionId: "s6-1", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["autobiography", "intentionality", "writing-choice"] },
  { id: "n12", category: "task", text: "Let me talk about myself, my beliefs, and what shapes me. Pinar says it's beyond critical to analyze your self identity. I agree with him. Here's what I believe about self identity and how my life shaped it.", linkedProjectId: "purpose-of-schools", linkedSectionId: "section-6", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["currere", "autobiography", "Pinar"] },
  { id: "n13", category: "task", text: "Connect the differentiation argument to the metacognitive curriculum: opportunity-centered, not content-centered differentiation.", linkedProjectId: "purpose-of-schools", linkedSectionId: "section-7", linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["differentiation", "integration"] },

  // ── Bibliography ───────────────────────────────────────
  { id: "b1", category: "bibliography", text: "Apple, Michael. Educating the \"Right\" Way: Markets, Standards, God, and Inequality. 2005.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["conservative", "markets", "curriculum-politics"] },
  { id: "b2", category: "bibliography", text: "Beard, Charles. An Economic Interpretation of the Constitution of the United States. 1st Edition. Dover Publications, 1913.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["history", "constitution", "economics"] },
  { id: "b3", category: "bibliography", text: "Bloom, Benjamin, ed. Taxonomy of Educational Objectives: The Classification of Educational Goals. David McKay Company, 1956.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["taxonomy", "assessment", "objectives"] },
  { id: "b4", category: "bibliography", text: "Bonhomme, Vincent, et al. \"General Anesthesia: A Probe to Explore Consciousness.\" Frontiers in Systems Neuroscience 13 (2019): 36.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["consciousness", "neuroscience"] },
  { id: "b5", category: "bibliography", text: "Burns, James P. \"The Tyler Rationale: A Reappraisal and Rereading.\" PROSPECTS 54, no. 1 (2024): 121–35.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["Tyler", "curriculum-theory"] },
  { id: "b6", category: "bibliography", text: "Clark, Kenneth B., and Mamie P. Clark. \"Emotional Factors in Racial Identification and Preference in Negro Children.\" The Journal of Negro Education 19, no. 3 (1950): 341–50.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["race", "identity", "doll-study"] },
  { id: "b7", category: "bibliography", text: "Dewey, John. How We Think. D.C. Heath, 1910.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["Dewey", "metacognition", "thinking"] },
  { id: "b8", category: "bibliography", text: "Dewey, John. \"The School and Society.\" 1899.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["Dewey", "progressive", "education"] },
  { id: "b9", category: "bibliography", text: "Fleming, Stephen M., et al. \"Prefrontal Contributions to Metacognition in Perceptual Decision Making.\" Journal of Neuroscience 32, no. 18 (2012).", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["metacognition", "neuroscience", "prefrontal"] },
  { id: "b10", category: "bibliography", text: "Gershon, Walter S., and Robert J. Helfenbein. \"Curriculum Matters: Educational Tools for Troubled Times.\" Journal of Curriculum Studies 55, no. 3 (2023).", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["curriculum", "contemporary"] },
  { id: "b11", category: "bibliography", text: "Harari, Yuval N. Sapiens: A Brief History of Humankind. 2014.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["history", "consciousness", "humanity"] },
  { id: "b12", category: "bibliography", text: "Hattie, John. Visible Learning: A Synthesis of over 800 Meta-Analyses Relating to Achievement. Routledge, 2010.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["meta-analysis", "achievement", "learning"] },
  { id: "b13", category: "bibliography", text: "Howard, Tyrone C., and Andrea C. Rodriguez-Minkoff. \"Culturally Relevant Pedagogy 20 Years Later: Progress or Pontificating?\" 2017.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["CRP", "culturally-relevant", "pedagogy"] },
  { id: "b14", category: "bibliography", text: "Jefferson, Thomas. \"Report of the Board of Commissioners for the University of Virginia General Assembly.\" 1818.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["Jefferson", "history", "education-founding"] },
  { id: "b15", category: "bibliography", text: "Kliebard, Herbert. The Struggle for the American Curriculum. 1986.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["curriculum-history", "American", "struggle"] },
  { id: "b16", category: "bibliography", text: "Kumashiro, Kevin. Troubling Education: Queer Activism and Antioppressive Pedagogy. Routledgefalmer, 2002.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["oppression", "queer", "pedagogy"] },
  { id: "b17", category: "bibliography", text: "Mann, Horace. \"Report No. 12 of the Massachusetts School Board.\" 1848.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["Mann", "common-school", "history"] },
  { id: "b18", category: "bibliography", text: "Metro Center, ed. \"CRE ELA Curriculum Scorecard 2.0.\" NYU Metro Center, 2023.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["CRE", "evaluation", "scorecard"] },
  { id: "b19", category: "bibliography", text: "Noushad, P. P. Cognitions about Cognitions: The Theory of Metacognition. 2008.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["metacognition", "theory"] },
  { id: "b20", category: "bibliography", text: "Schraw, Gregory, and Rayne Sperling Dennison. \"Assessing Metacognitive Awareness.\" Contemporary Educational Psychology 19, no. 4 (1994): 460–75.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["metacognition", "assessment", "awareness"] },
  { id: "b21", category: "bibliography", text: "Siclari, F., et al. \"The Neural Correlates of Dreaming.\" Nature Neuroscience 20, no. 6 (2017): 872–78.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["consciousness", "dreaming", "neuroscience"] },
  { id: "b22", category: "bibliography", text: "Tolan, Daniel Jonathan. \"The Contemplation of the Transcendent Heart: Tracing the Hegemonikon from the Stoics to Origen.\" Clare College, 2020.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["Stoics", "consciousness", "philosophy"] },
  { id: "b23", category: "bibliography", text: "Tyler, Ralph. Basic Principles of Curriculum and Instruction. 1949.", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["Tyler", "rationale", "curriculum-foundation"] },
  { id: "b24", category: "bibliography", text: "Veenman, Marcel V. J., et al. \"Metacognition and Learning: Conceptual and Methodological Considerations.\" Metacognition and Learning 1, no. 1 (2006).", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["metacognition", "methodology", "learning"] },
  { id: "b25", category: "bibliography", text: "Santoro, Giuseppe, et al. \"The Anatomic Location of the Soul from the Heart, through the Brain, to the Whole Body, and beyond.\" Child's Nervous System 25, no. 10 (2009).", linkedProjectId: null, linkedSectionId: null, linkedParagraphId: null, inlineRange: null, resolved: false, createdAt: now, updatedAt: now, tags: ["soul", "anatomy", "consciousness-history"] },
];

export default NOTES;

export const NOTE_CATEGORIES = {
  idea: { label: "Ideas", color: "#2D6B5A", icon: "💡", description: "Concepts and arguments to incorporate" },
  question: { label: "Questions", color: "#2A5F7C", icon: "❓", description: "Open questions to resolve" },
  task: { label: "Tasks", color: "#8B4513", icon: "📌", description: "Writing tasks and editorial notes" },
  comment: { label: "Comments", color: "#943D3D", icon: "💬", description: "Inline comments on specific text" },
  bibliography: { label: "Bibliography", color: "#6B3A6E", icon: "📚", description: "Sources and citations" },
};

/** Migrate old note format (linkedSection) to new format (linkedSectionId etc.) */
export function migrateNote(note) {
  if (note.linkedSectionId !== undefined) return note; // already new format
  const now = Date.now();
  return {
    ...note,
    linkedProjectId: note.linkedSection ? "purpose-of-schools" : null,
    linkedSectionId: note.linkedSection || null,
    linkedParagraphId: null,
    inlineRange: null,
    resolved: note.resolved ?? false,
    createdAt: note.createdAt || now,
    updatedAt: note.updatedAt || now,
  };
}

/** Migrate an array of notes */
export function migrateNotes(notes) {
  return notes.map(migrateNote);
}
