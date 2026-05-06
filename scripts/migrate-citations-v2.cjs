/**
 * migrate-citations-v2.cjs
 *
 * Pragmatic approach: Extract ALL raw citation text, group by likely source,
 * then generate a review file where Wil can correct/confirm each source.
 *
 * Output: docs/citation-migration-review.md — a correctable review document
 *         src/data/migrated-sources.json — structured sources ready to load
 */

const mammoth = require("mammoth");
const path = require("path");
const fs = require("fs");

const DOCX_PATH = path.resolve(__dirname, "../docs/writings/Purpose of School/Purpose of Schools - expanded.docx");

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
}

// ── Known sources: hand-curated from Wil's bibliography + footnotes ──
// This is the authoritative list. The script matches raw text to these.

const KNOWN_SOURCES = [
  { citationKey: "jefferson1818", type: "legal", authors: [{ given: "Thomas", family: "Jefferson" }], title: "Report of the Board of Commissioners for the University of Virginia General Assembly", year: "1818", url: "https://founders.archives.gov/" },
  { citationKey: "jefferson1779", type: "legal", authors: [{ given: "Thomas", family: "Jefferson" }], title: "A Bill for the More General Diffusion of Knowledge", year: "1779", url: "https://www.loc.gov/exhibits/jefferson/images/vc64.jpg" },
  { citationKey: "northwest1789", type: "legal", authors: [], title: "Ordinance for the Government of the Territory of the United States North-West of the River Ohio", year: "1789" },
  { citationKey: "mann1848", type: "book", authors: [{ given: "Horace", family: "Mann" }], title: "Report No. 12 of the Massachusetts School Board", year: "1848" },
  { citationKey: "kliebard1986", type: "book", authors: [{ given: "Herbert", family: "Kliebard" }], title: "The Struggle for the American Curriculum", year: "1986" },
  { citationKey: "dewey1899", type: "book", authors: [{ given: "John", family: "Dewey" }], title: "The School and Society", year: "1899", url: "https://www.gutenberg.org/files/53910/53910-h/53910-h.htm" },
  { citationKey: "dewey1910", type: "book", authors: [{ given: "John", family: "Dewey" }], title: "How We Think", year: "1910", publisher: "D.C. Heath" },
  { citationKey: "dewey1938", type: "book", authors: [{ given: "John", family: "Dewey" }], title: "Experience and Education", year: "1938", publisher: "Kappa Delta Pi" },
  { citationKey: "burns2024", type: "article", authors: [{ given: "James P.", family: "Burns" }], title: "The Tyler Rationale: A Reappraisal and Rereading", year: "2024", journal: "PROSPECTS", volume: "54", issue: "1", pages: "121-135", doi: "10.1007/s11125-023-09" },
  { citationKey: "bloom1956", type: "book", authors: [{ given: "Benjamin", family: "Bloom" }], title: "Taxonomy of Educational Objectives: The Classification of Educational Goals", year: "1956", publisher: "David McKay Company" },
  { citationKey: "sikorski2025", type: "lecture", authors: [{ given: "Tiffany", family: "Sikorski" }], title: "Why Evaluate Curriculum", year: "2025", publisher: "George Washington University, CPED 6801" },
  { citationKey: "beard1913", type: "book", authors: [{ given: "Charles", family: "Beard" }], title: "An Economic Interpretation of the Constitution of the United States", year: "1913", publisher: "Dover Publications" },
  { citationKey: "tyler1949", type: "book", authors: [{ given: "Ralph", family: "Tyler" }], title: "Basic Principles of Curriculum and Instruction", year: "1949" },
  { citationKey: "apple2005", type: "book", authors: [{ given: "Michael", family: "Apple" }], title: 'Educating the "Right" Way: Markets, Standards, God, and Inequality', year: "2005" },
  { citationKey: "howard2017", type: "article", authors: [{ given: "Tyrone C.", family: "Howard" }, { given: "Andrea C.", family: "Rodriguez-Minkoff" }], title: "Culturally Relevant Pedagogy 20 Years Later: Progress or Pontificating?", year: "2017" },
  { citationKey: "gershon2023", type: "article", authors: [{ given: "Walter S.", family: "Gershon" }, { given: "Robert J.", family: "Helfenbein" }], title: "Curriculum Matters: Educational Tools for Troubled Times", year: "2023", journal: "Journal of Curriculum Studies", volume: "55", issue: "3" },
  { citationKey: "metrocenter2023", type: "website", authors: [{ given: "", family: "Metro Center" }], title: "CRE ELA Curriculum Scorecard 2.0", year: "2023", publisher: "NYU Metro Center" },
  { citationKey: "kumashiro2002", type: "book", authors: [{ given: "Kevin", family: "Kumashiro" }], title: "Troubling Education: Queer Activism and Antioppressive Pedagogy", year: "2002", publisher: "Routledgefalmer" },
  { citationKey: "harari2014", type: "book", authors: [{ given: "Yuval N.", family: "Harari" }], title: "Sapiens: A Brief History of Humankind", year: "2014" },
  { citationKey: "hattie2010", type: "book", authors: [{ given: "John", family: "Hattie" }], title: "Visible Learning: A Synthesis of over 800 Meta-Analyses Relating to Achievement", year: "2010", publisher: "Routledge" },
  { citationKey: "noushad2008", type: "book", authors: [{ given: "P. P.", family: "Noushad" }], title: "Cognitions about Cognitions: The Theory of Metacognition", year: "2008" },
  { citationKey: "schraw1994", type: "article", authors: [{ given: "Gregory", family: "Schraw" }, { given: "Rayne Sperling", family: "Dennison" }], title: "Assessing Metacognitive Awareness", year: "1994", journal: "Contemporary Educational Psychology", volume: "19", issue: "4", pages: "460-475" },
  { citationKey: "fleming2012", type: "article", authors: [{ given: "Stephen M.", family: "Fleming" }], title: "Prefrontal Contributions to Metacognition in Perceptual Decision Making", year: "2012", journal: "Journal of Neuroscience", volume: "32", issue: "18" },
  { citationKey: "veenman2006", type: "article", authors: [{ given: "Marcel V. J.", family: "Veenman" }], title: "Metacognition and Learning: Conceptual and Methodological Considerations", year: "2006", journal: "Metacognition and Learning", volume: "1", issue: "1" },
  { citationKey: "siclari2017", type: "article", authors: [{ given: "F.", family: "Siclari" }], title: "The Neural Correlates of Dreaming", year: "2017", journal: "Nature Neuroscience", volume: "20", issue: "6", pages: "872-878" },
  { citationKey: "bonhomme2019", type: "article", authors: [{ given: "Vincent", family: "Bonhomme" }], title: "General Anesthesia: A Probe to Explore Consciousness", year: "2019", journal: "Frontiers in Systems Neuroscience", volume: "13", pages: "36" },
  { citationKey: "tolan2020", type: "book", authors: [{ given: "Daniel Jonathan", family: "Tolan" }], title: "The Contemplation of the Transcendent Heart: Tracing the Hegemonikon from the Stoics to Origen", year: "2020", publisher: "Clare College" },
  { citationKey: "santoro2009", type: "article", authors: [{ given: "Giuseppe", family: "Santoro" }], title: "The Anatomic Location of the Soul from the Heart, through the Brain, to the Whole Body, and beyond", year: "2009", journal: "Child's Nervous System", volume: "25", issue: "10" },
  { citationKey: "clark1950", type: "article", authors: [{ given: "Kenneth B.", family: "Clark" }, { given: "Mamie P.", family: "Clark" }], title: "Emotional Factors in Racial Identification and Preference in Negro Children", year: "1950", journal: "The Journal of Negro Education", volume: "19", issue: "3", pages: "341-350" },
  { citationKey: "bunnin2004", type: "book", authors: [{ given: "Nicholas", family: "Bunnin" }, { given: "Jiyuan", family: "Yu" }], title: "The Blackwell Dictionary of Western Philosophy", year: "2004" },
  { citationKey: "silverstein2018", type: "video", authors: [{ given: "Jake", family: "Silverstein" }], title: "The 1619 Project (Pantheon TV)", year: "2018" },
  // Sources cited inline but missing from bibliography
  { citationKey: "wiggins2005", type: "book", authors: [{ given: "Grant", family: "Wiggins" }, { given: "Jay", family: "McTighe" }], title: "Understanding by Design", year: "2005" },
  { citationKey: "bartlett1932", type: "book", authors: [{ given: "Frederic", family: "Bartlett" }], title: "Remembering: A Study in Experimental and Social Psychology", year: "1932", publisher: "Cambridge University Press" },
  { citationKey: "rumelhart1986", type: "article", authors: [{ given: "David E.", family: "Rumelhart" }], title: "Schemata and the Cognitive System", year: "1986" },
  { citationKey: "anderson1983", type: "article", authors: [{ given: "Richard C.", family: "Anderson" }], title: "The Architecture of Cognition", year: "1983" },
  { citationKey: "stanford2020", type: "website", authors: [{ given: "", family: "Stanford Encyclopedia of Philosophy" }], title: "Stanford Encyclopedia of Philosophy", year: "2020", url: "https://plato.stanford.edu/" },
  { citationKey: "siemens2005", type: "article", authors: [{ given: "George", family: "Siemens" }], title: "Connectivism: A Learning Theory for the Digital Age", year: "2005" },
  { citationKey: "bloom2000", type: "book", authors: [{ given: "Paul", family: "Bloom" }], title: "How Children Learn the Meanings of Words", year: "2000", publisher: "MIT Press" },
  { citationKey: "sullivan2023", type: "article", authors: [{ given: "", family: "Sullivan" }], title: "[NEEDS FULL TITLE — assessment validity]", year: "2023" },
  { citationKey: "edreports2024", type: "website", authors: [{ given: "", family: "EdReports" }], title: "EdReports Curriculum Reviews", year: "2024", url: "https://www.edreports.org/" },
  { citationKey: "castles2018", type: "article", authors: [{ given: "Anne", family: "Castles" }, { given: "Kathleen", family: "Rastle" }, { given: "Kate", family: "Nation" }], title: "Ending the Reading Wars", year: "2018" },
  { citationKey: "wiggins1998", type: "book", authors: [{ given: "Grant", family: "Wiggins" }], title: "Educative Assessment", year: "1998" },
  { citationKey: "ornstein2016", type: "book", authors: [{ given: "Allan C.", family: "Ornstein" }, { given: "Francis P.", family: "Hunkins" }], title: "Curriculum: Foundations, Principles, and Issues", year: "2016" },
  { citationKey: "pinar2012", type: "book", authors: [{ given: "William F.", family: "Pinar" }], title: "What Is Curriculum Theory?", year: "2012" },
];

async function main() {
  console.log("Parsing docx...\n");

  const result = await mammoth.convertToHtml({ path: DOCX_PATH });
  const html = result.value;
  const rawResult = await mammoth.extractRawText({ path: DOCX_PATH });
  const rawText = rawResult.value;

  // Extract footnotes
  const footnotes = [];
  const fnRegex = /<li\s+id="footnote-(\d+)">([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = fnRegex.exec(html)) !== null) {
    footnotes.push({ num: parseInt(m[1]), text: stripHtml(m[2]) });
  }

  // Extract inline citations
  const inlineCites = [];
  const inlineRegex = /\(([A-Z][a-zA-Z'&\s]+,?\s*(?:19|20)\d{2}[^)]*)\)/g;
  const lines = rawText.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    let im;
    while ((im = inlineRegex.exec(lines[i])) !== null) {
      inlineCites.push({ text: im[1].trim(), line: i + 1 });
    }
  }

  // Classify footnotes
  const explanatory = [];
  const citationFootnotes = [];
  for (const fn of footnotes) {
    const t = fn.text;
    const wordCount = t.split(/\s+/).length;
    const hasYear = /\b(?:19|20)\d{2}\b/.test(t);
    const startsWithCap = /^[A-Z]/.test(t);
    const isLongProse = wordCount > 35 && !/^[A-Z][a-zA-Z.'-]+\s[A-Z]/.test(t);

    if (isLongProse && !t.match(/^[A-Z][a-zA-Z.]+,?\s/)) {
      explanatory.push(fn);
    } else {
      citationFootnotes.push(fn);
    }
  }

  // Build output
  const sources = KNOWN_SOURCES.map((s, i) => ({
    id: `src-${Date.now()}-${i}`,
    ...s,
    abstract: "",
    usageNotes: [],
    tags: [],
    category: "referenced", // will be upgraded to "cited" below
    zoteroKey: null,
    formattedBib: null,
    cslJson: null,
    publisher: s.publisher || null,
    journal: s.journal || null,
    volume: s.volume || null,
    issue: s.issue || null,
    pages: s.pages || null,
    url: s.url || null,
    doi: s.doi || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  // Match footnotes to sources
  const footnoteMatches = [];
  for (const fn of citationFootnotes) {
    const t = fn.text.toLowerCase();
    let matched = null;
    for (const src of sources) {
      const lastName = src.authors?.[0]?.family?.toLowerCase() || "";
      const titleWord = src.title?.toLowerCase().split(/\s+/).slice(0, 3).join(" ") || "";
      if (lastName && t.includes(lastName) && (t.includes(src.year) || t.includes(titleWord.slice(0, 15)))) {
        matched = src;
        src.category = "cited";
        break;
      }
    }
    footnoteMatches.push({ footnoteNum: fn.num, text: fn.text.slice(0, 120), matchedSource: matched?.citationKey || "UNMATCHED" });
  }

  // Match inline citations to sources
  const inlineMatches = [];
  for (const ic of inlineCites) {
    const t = ic.text.toLowerCase();
    let matched = null;
    for (const src of sources) {
      const lastName = src.authors?.[0]?.family?.toLowerCase() || "";
      if (lastName && t.includes(lastName) && t.includes(src.year)) {
        matched = src;
        src.category = "cited";
        break;
      }
    }
    inlineMatches.push({ text: ic.text, line: ic.line, matchedSource: matched?.citationKey || "UNMATCHED" });
  }

  // ── Generate review ──────────────────────────────────────

  let md = "# Citation Migration Review\n\n";
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **${sources.length} sources** (hand-curated master list)\n`;
  md += `- **${sources.filter(s => s.category === "cited").length} cited** (matched to footnotes/inline)\n`;
  md += `- **${sources.filter(s => s.category === "referenced").length} referenced** (in bibliography but no citations found)\n`;
  md += `- **${footnotes.length} footnotes** (${citationFootnotes.length} citations + ${explanatory.length} explanatory)\n`;
  md += `- **${inlineCites.length} inline citations**\n`;
  md += `- **${footnoteMatches.filter(m => m.matchedSource === "UNMATCHED").length} unmatched footnotes**\n`;
  md += `- **${inlineMatches.filter(m => m.matchedSource === "UNMATCHED").length} unmatched inline citations**\n\n`;

  md += `## Master Source List (${sources.length})\n\n`;
  md += `| # | Key | Author | Title | Year | Type | Status |\n`;
  md += `|---|-----|--------|-------|------|------|--------|\n`;
  sources.forEach((s, i) => {
    const author = s.authors.map(a => a.family).join(", ") || "?";
    const title = s.title.length > 50 ? s.title.slice(0, 47) + "..." : s.title;
    const flag = s.title.includes("[NEEDS") ? " **[!]**" : "";
    md += `| ${i + 1} | ${s.citationKey} | ${author} | ${title}${flag} | ${s.year} | ${s.type} | ${s.category} |\n`;
  });

  md += `\n## Footnote Matches (${citationFootnotes.length})\n\n`;
  for (const fm of footnoteMatches) {
    const status = fm.matchedSource === "UNMATCHED" ? "**UNMATCHED**" : `\`${fm.matchedSource}\``;
    md += `- **fn${fm.footnoteNum}** → ${status}: ${fm.text}...\n`;
  }

  md += `\n## Inline Citation Matches (${inlineCites.length})\n\n`;
  for (const im of inlineMatches) {
    const status = im.matchedSource === "UNMATCHED" ? "**UNMATCHED**" : `\`${im.matchedSource}\``;
    md += `- (${im.text}) → ${status}\n`;
  }

  md += `\n## Explanatory Footnotes → Notes (${explanatory.length})\n\n`;
  for (const fn of explanatory) {
    md += `- **fn${fn.num}**: ${fn.text.slice(0, 150)}${fn.text.length > 150 ? "..." : ""}\n`;
  }

  fs.writeFileSync(path.resolve(__dirname, "../docs/citation-migration-review.md"), md);
  fs.writeFileSync(path.resolve(__dirname, "../src/data/migrated-sources.json"), JSON.stringify(sources, null, 2));

  console.log("DONE!");
  console.log(`  ${sources.length} sources in master list`);
  console.log(`  ${sources.filter(s => s.category === "cited").length} matched to citations`);
  console.log(`  ${footnoteMatches.filter(m => m.matchedSource === "UNMATCHED").length} unmatched footnotes`);
  console.log(`  ${inlineMatches.filter(m => m.matchedSource === "UNMATCHED").length} unmatched inline citations`);
  console.log(`  ${explanatory.length} explanatory footnotes → notes`);
  console.log(`\nReview: docs/citation-migration-review.md`);
  console.log(`Sources: src/data/migrated-sources.json`);
}

main().catch(console.error);
