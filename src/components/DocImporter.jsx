import mammoth from "mammoth";

/**
 * Parse a .docx file into Tessera's section tree structure.
 * Detects headings and uses them to create subsections automatically.
 * Filters out meta-commentary, section summaries, and editorial scaffolding.
 * Extracts footnotes and preserves inline [N] markers.
 * Returns { title, children[], paragraphs[], notes[] }
 */

// ── Meta-commentary detection ───────────────────────────────────

const META_EXACT = new Set([
  "working draft",
  "section summary",
]);

const META_PREFIXES = [
  "draft for:",
  "what comes next",
  "this draft covers",
  "comments from your outline",
  "remaining open comments",
  "remaining items deferred",
  "transition into section",
  "section b fixes",
  "section c fixes",
  "section d fixes",
  "section e fixes",
  "two changes to make",
  "approximate paragraph count",
  "no instances of",
];

const META_PATTERNS = [
  /^comments?\s+\d+[\-–]\d+\s*:/i,            // "Comments 5–6: ..."
  /^comment\s+\d+\s*:/i,                       // "Comment 4: ..."
  /^comment\s+\d+\s+fix/i,                     // "Comment 7 fix ..."
  /^draft comment\s+\d+/i,                     // "Draft Comment 0 (from v3): ..."
  /^d\+e\.\d/i,                                // "D+E.1 (The Root System): ..."
  /^section [a-z] ends with/i,                 // "Section B ends with the question..."
  /^the transition sentence between/i,         // "The transition sentence between B and C..."
  /^axiometrica calculus/i,                     // deferred items list
  /^formal introduction of the six/i,
  /^assessment architecture for/i,
  /^communication as a core/i,
  /^banking logic embedded/i,
];

function isMetaCommentary(text) {
  const lower = text.toLowerCase().trim();
  if (META_EXACT.has(lower)) return true;
  if (META_PREFIXES.some((p) => lower.startsWith(p))) return true;
  if (META_PATTERNS.some((p) => p.test(text))) return true;
  if (lower.includes("purple-bordered notes throughout")) return true;
  return false;
}

// ── Footnote detection ──────────────────────────────────────────

function isFootnoteBody(el) {
  // Mammoth renders footnotes as <li id="footnote-N">
  if (el.tagName === "LI" && el.id?.startsWith("footnote-")) return true;
  return false;
}

function extractFootnoteText(el) {
  let text = el.textContent.trim();
  // Remove back-link arrow (↑)
  text = text.replace(/\s*↑\s*$/, "").trim();
  return text;
}

// ── Main parser ─────────────────────────────────────────────────

export async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  const parser = new DOMParser();
  const dom = parser.parseFromString(html, "text/html");
  const elements = dom.body.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, ol > li");

  const notes = [];
  const now = Date.now();
  let noteCounter = 0;
  let title = file.name.replace(/\.docx$/i, "");

  // First pass: collect all elements with their types
  const items = [];
  let lastParaId = null;

  elements.forEach((el, i) => {
    const text = el.textContent.trim();
    if (!text) return;

    // ── Footnote bodies → extract as notes, skip as paragraphs ──
    if (isFootnoteBody(el)) {
      const fnText = extractFootnoteText(el);
      if (fnText) {
        const fnNum = el.id.replace("footnote-", "");
        noteCounter++;
        notes.push({
          id: `imp-note-${now}-${noteCounter}`,
          category: "idea",
          text: fnText,
          tags: ["imported", "footnote", `fn${fnNum}`],
          linkedProjectId: null,
          linkedSectionId: null,
          linkedParagraphId: null,
          inlineRange: null,
          resolved: false,
          createdAt: now,
          updatedAt: now,
          _needsSection: true,
        });
      }
      return;
    }

    const headingMatch = el.tagName.match(/^H([1-6])$/);

    // ── NOTE: blocks → extract as notes, skip as paragraphs ──
    const noteMatch = text.match(/^NOTE:\s*(.+)$/s);
    if (noteMatch) {
      noteCounter++;
      notes.push({
        id: `imp-note-${now}-${noteCounter}`,
        category: "task",
        text: noteMatch[1].trim(),
        tags: ["imported", "editorial"],
        linkedProjectId: null,
        linkedSectionId: null,
        linkedParagraphId: lastParaId,
        inlineRange: null,
        resolved: false,
        createdAt: now,
        updatedAt: now,
        _needsSection: true,
      });
      return;
    }

    // ── Standalone comment reference blocks → notes ──
    const commentBlockMatch = text.match(/^Comments?\s*[\d,\-–]+\s*:\s*(.+)$/s);
    if (commentBlockMatch) {
      noteCounter++;
      notes.push({
        id: `imp-note-${now}-${noteCounter}`,
        category: "comment",
        text: commentBlockMatch[0].trim(),
        tags: ["imported", "word-comment"],
        linkedProjectId: null,
        linkedSectionId: null,
        linkedParagraphId: null,
        inlineRange: null,
        resolved: false,
        createdAt: now,
        updatedAt: now,
        _needsSection: true,
      });
      return;
    }

    // ── Meta-commentary → extract as notes, skip as paragraphs ──
    if (isMetaCommentary(text)) {
      noteCounter++;
      notes.push({
        id: `imp-note-${now}-${noteCounter}`,
        category: "task",
        text: text,
        tags: ["imported", "meta-commentary"],
        linkedProjectId: null,
        linkedSectionId: null,
        linkedParagraphId: lastParaId,
        inlineRange: null,
        resolved: false,
        createdAt: now,
        updatedAt: now,
        _needsSection: true,
      });
      return;
    }

    if (headingMatch) {
      items.push({ type: "heading", level: parseInt(headingMatch[1]), text, index: i });
    } else {
      // Detect bold-only paragraphs as potential sub-headings (like "Kumashiro's Contributions")
      const strongEl = el.querySelector("strong");
      const isBoldOnly = strongEl &&
        el.textContent.trim() === strongEl.textContent.trim() &&
        text.length < 100;

      // But only treat as heading if it's not meta-commentary
      if (isBoldOnly && isMetaCommentary(text)) {
        // Bold meta-commentary (like "SECTION SUMMARY") → note, not heading
        noteCounter++;
        notes.push({
          id: `imp-note-${now}-${noteCounter}`,
          category: "task",
          text: text,
          tags: ["imported", "meta-commentary"],
          linkedProjectId: null,
          linkedSectionId: null,
          linkedParagraphId: lastParaId,
          inlineRange: null,
          resolved: false,
          createdAt: now,
          updatedAt: now,
          _needsSection: true,
        });
        return;
      }

      if (!isBoldOnly) {
        lastParaId = `imp-${now}-${i}`; // track for note linking
      }
      items.push({ type: isBoldOnly ? "bold-heading" : "paragraph", text, index: i });
    }
  });

  // Use H1 as the section title
  if (items.length > 0 && items[0].type === "heading" && items[0].level === 1) {
    title = items[0].text;
    items.shift();
  }

  // ── Second pass: build recursive section tree from headings ──
  // Strategy: headings create sections at their appropriate nesting level
  // H1 (after title) and H2 → top-level children
  // H3 → children of current H2
  // H4 → children of current H3
  // Bold-only → treated as one level deeper than the current context

  const rootParagraphs = [];
  const children = [];
  // Stack tracks the current nesting: [H2 section, H3 section, H4 section, ...]
  const sectionStack = [];

  function currentSection() {
    return sectionStack.length > 0 ? sectionStack[sectionStack.length - 1] : null;
  }

  function makeSectionObj(item) {
    return {
      id: `sec-${now}-${item.index}`,
      title: item.text,
      spine: "",
      status: "drafting",
      children: [],
      paragraphs: [],
    };
  }

  for (const item of items) {
    if (item.type === "heading") {
      const level = item.level;
      const newSection = makeSectionObj(item);

      if (level <= 2) {
        // Top-level subsection: flush the entire stack
        while (sectionStack.length > 0) sectionStack.pop();
        children.push(newSection);
        sectionStack.push(newSection);
      } else {
        // Nested heading (H3, H4, H5, H6)
        // Target depth in stack: level - 2 (H3 → depth 1, H4 → depth 2, etc.)
        const targetDepth = level - 2;
        // Pop stack back to parent level
        while (sectionStack.length >= targetDepth + 1) sectionStack.pop();

        const parent = currentSection();
        if (parent) {
          parent.children.push(newSection);
        } else {
          // No parent → treat as top-level
          children.push(newSection);
        }
        sectionStack.push(newSection);
      }
    } else if (item.type === "bold-heading") {
      // Bold-only paragraph → sub-section one level deeper than current
      const newSection = makeSectionObj(item);
      const parent = currentSection();
      if (parent) {
        parent.children.push(newSection);
        sectionStack.push(newSection);
      } else {
        children.push(newSection);
        sectionStack.push(newSection);
      }
    } else {
      // Regular paragraph
      const paraId = `imp-${now}-${item.index}`;
      const lower = item.text.toLowerCase();

      let spineRole = "claim";
      if (lower.startsWith("for example") || lower.startsWith("consider")) spineRole = "evidence";
      else if (lower.startsWith("in summary") || lower.startsWith("therefore") || lower.startsWith("thus")) spineRole = "synthesis";
      else if (lower.startsWith("this leads") || lower.startsWith("moving") || lower.startsWith("turning")) spineRole = "bridge";

      const para = {
        id: paraId,
        text: item.text,
        status: "drafting",
        spineRole,
        linkedTerms: [],
      };

      // Track which section this paragraph belongs to
      const ownerSection = currentSection();
      const ownerSectionId = ownerSection?.id || null;

      // Check for inline comment references
      const inlineCommentRefs = item.text.match(/\(Comment \d+\)/g);
      if (inlineCommentRefs) {
        for (const ref of inlineCommentRefs) {
          noteCounter++;
          notes.push({
            id: `imp-note-${now}-${noteCounter}`,
            category: "comment",
            text: `Word ${ref} — referenced in this paragraph. Check original .docx for full comment text.`,
            tags: ["imported", "word-comment"],
            linkedProjectId: null,
            linkedSectionId: ownerSectionId,
            linkedParagraphId: paraId,
            inlineRange: null,
            resolved: false,
            createdAt: now,
            updatedAt: now,
            _needsSection: !ownerSectionId,
          });
        }
      }

      // Add to the deepest current section
      if (ownerSection) {
        ownerSection.paragraphs.push(para);
      } else {
        rootParagraphs.push(para);
      }
    }
  }

  // ── Post-processing ───────────────────────────────────────────

  // Assign first paragraph in each section as "setup"
  function fixFirstParaRole(sections) {
    for (const sec of sections) {
      if (sec.paragraphs.length > 0 && sec.paragraphs[0].spineRole === "claim") {
        sec.paragraphs[0].spineRole = "setup";
      }
      if (sec.children?.length > 0) fixFirstParaRole(sec.children);
    }
  }
  if (rootParagraphs.length > 0 && rootParagraphs[0].spineRole === "claim") {
    rootParagraphs[0].spineRole = "setup";
  }
  fixFirstParaRole(children);

  // Remove empty leaf sections (no paragraphs AND no children)
  function pruneEmpty(sections) {
    return sections.filter((s) => {
      s.children = pruneEmpty(s.children || []);
      return s.paragraphs.length > 0 || s.children.length > 0;
    });
  }
  const prunedChildren = pruneEmpty(children);

  // Build paragraph → section mapping for note linking
  const paraToSection = {};
  for (const p of rootParagraphs) paraToSection[p.id] = null;
  function mapParas(sections) {
    for (const sec of sections) {
      for (const p of sec.paragraphs) paraToSection[p.id] = sec.id;
      if (sec.children) mapParas(sec.children);
    }
  }
  mapParas(prunedChildren);

  // Assign section IDs to notes that need them
  for (const note of notes) {
    if (note._needsSection) {
      if (note.linkedParagraphId && paraToSection[note.linkedParagraphId] !== undefined) {
        note.linkedSectionId = paraToSection[note.linkedParagraphId];
      }
      delete note._needsSection;
    }
  }

  return { title, paragraphs: rootParagraphs, children: prunedChildren, notes };
}

/**
 * Detect linked terms in paragraphs (recursive for section trees).
 */
export function detectLinkedTerms(paragraphs, linkedTerms) {
  const termNames = Object.keys(linkedTerms);
  // Build word-boundary regexes for accurate matching
  const termRegexes = termNames.map((t) => ({
    name: t,
    regex: new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
  }));
  return paragraphs.map((p) => {
    const found = termRegexes
      .filter((tr) => tr.regex.test(p.text))
      .map((tr) => tr.name);
    return { ...p, linkedTerms: found };
  });
}

function enrichSection(section, linkedTerms) {
  return {
    ...section,
    paragraphs: detectLinkedTerms(section.paragraphs, linkedTerms),
    children: section.children?.map((c) => enrichSection(c, linkedTerms)) || [],
  };
}

/**
 * Import a .docx file as a new section with auto-detected subsections.
 * Returns a complete section object + extracted notes.
 */
export async function importDocxAsDocument(file, linkedTerms) {
  const { title, paragraphs, children, notes } = await parseDocx(file);

  const enrichedParas = detectLinkedTerms(paragraphs, linkedTerms);
  const enrichedChildren = children.map((c) => enrichSection(c, linkedTerms));

  return {
    id: `doc-${Date.now()}`,
    title,
    status: "drafting",
    spine: "",
    children: enrichedChildren,
    paragraphs: enrichedParas.length > 0 ? enrichedParas : (
      enrichedChildren.length > 0 ? [] : [
        { id: `p-${Date.now()}`, text: "", status: "brainstorm", spineRole: "claim", linkedTerms: [] },
      ]
    ),
    notes: notes || [],
  };
}
