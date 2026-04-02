import mammoth from "mammoth";

/**
 * Parse a .docx file into Tessera's section tree structure.
 * Detects headings and uses them to create subsections automatically.
 * Returns { title, children[], paragraphs[], notes[] }
 */
export async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  const parser = new DOMParser();
  const dom = parser.parseFromString(html, "text/html");
  const elements = dom.body.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li");

  const notes = [];
  const now = Date.now();
  let noteCounter = 0;
  let title = file.name.replace(/\.docx$/i, "");

  // First pass: collect all elements with their types
  // We track a "current section id" so notes know which section they belong to
  const items = [];
  let pendingNotes = []; // notes waiting to be assigned a section
  let lastParaId = null;

  elements.forEach((el, i) => {
    const text = el.textContent.trim();
    if (!text) return;

    const headingMatch = el.tagName.match(/^H([1-6])$/);

    // Detect NOTE: blocks → extract as notes, skip as paragraphs
    const noteMatch = text.match(/^NOTE:\s*(.+)$/s);
    if (noteMatch) {
      noteCounter++;
      notes.push({
        id: `imp-note-${now}-${noteCounter}`,
        category: "task",
        text: noteMatch[1].trim(),
        tags: ["imported", "editorial"],
        linkedProjectId: null,
        linkedSectionId: null, // will be set in second pass
        linkedParagraphId: lastParaId,
        inlineRange: null,
        resolved: false,
        createdAt: now,
        updatedAt: now,
        _needsSection: true,
      });
      return;
    }

    // Detect standalone comment reference blocks
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

    // Skip meta-paragraphs
    const lower = text.toLowerCase();
    if (lower === "working draft") return;
    if (lower.startsWith("draft for:")) return;
    if (lower.startsWith("what comes next")) return;
    if (lower.includes("purple-bordered notes throughout")) return;

    if (headingMatch) {
      items.push({ type: "heading", level: parseInt(headingMatch[1]), text, index: i });
    } else {
      // Detect bold-only paragraphs as potential sub-headings (like "Kumashiro's Contributions")
      const isBoldOnly = el.querySelector("strong") &&
        el.textContent.trim() === el.querySelector("strong")?.textContent.trim() &&
        text.length < 100;

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

  // Second pass: build section tree from headings
  // Strategy: H2 and bold-only headings create child sections
  // Everything else is paragraphs in the current section

  const rootParagraphs = []; // paragraphs before any subsection heading
  const children = [];       // subsection objects
  let currentChild = null;   // current subsection being built
  let subChild = null;       // current sub-subsection (for H3+)

  for (const item of items) {
    if (item.type === "heading" && item.level <= 2) {
      // H2 or H1 (after the title) → new top-level subsection
      if (subChild && currentChild) {
        currentChild.children.push(subChild);
        subChild = null;
      }
      if (currentChild) children.push(currentChild);
      currentChild = {
        id: `sec-${now}-${item.index}`,
        title: item.text,
        spine: "",
        status: "drafting",
        children: [],
        paragraphs: [],
      };
    } else if ((item.type === "heading" && item.level >= 3) || item.type === "bold-heading") {
      // H3+ or bold-only paragraph → sub-subsection within current child
      if (currentChild) {
        if (subChild) {
          currentChild.children.push(subChild);
        }
        subChild = {
          id: `sec-${now}-${item.index}`,
          title: item.text,
          spine: "",
          status: "drafting",
          children: [],
          paragraphs: [],
        };
      } else {
        // No parent subsection yet → create one
        currentChild = {
          id: `sec-${now}-${item.index}`,
          title: item.text,
          spine: "",
          status: "drafting",
          children: [],
          paragraphs: [],
        };
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
      const ownerSectionId = subChild?.id || currentChild?.id || null;

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
      if (subChild) {
        subChild.paragraphs.push(para);
      } else if (currentChild) {
        currentChild.paragraphs.push(para);
      } else {
        rootParagraphs.push(para);
      }
    }
  }

  // Flush remaining
  if (subChild && currentChild) currentChild.children.push(subChild);
  if (currentChild) children.push(currentChild);

  // Assign first paragraphs as "setup" in each section
  for (const sec of [{ paragraphs: rootParagraphs }, ...children]) {
    if (sec.paragraphs.length > 0 && sec.paragraphs[0].spineRole === "claim") {
      sec.paragraphs[0].spineRole = "setup";
    }
  }

  // Build paragraph → section mapping for note linking
  const paraToSection = {};
  for (const p of rootParagraphs) paraToSection[p.id] = null; // root level
  for (const child of children) {
    for (const p of child.paragraphs) paraToSection[p.id] = child.id;
    for (const sub of child.children || []) {
      for (const p of sub.paragraphs) paraToSection[p.id] = sub.id;
    }
  }

  // Assign section IDs to notes that need them
  for (const note of notes) {
    if (note._needsSection) {
      if (note.linkedParagraphId && paraToSection[note.linkedParagraphId] !== undefined) {
        note.linkedSectionId = paraToSection[note.linkedParagraphId];
      }
      delete note._needsSection;
    }
  }

  return { title, paragraphs: rootParagraphs, children, notes };
}

/**
 * Detect linked terms in paragraphs (recursive for section trees).
 */
export function detectLinkedTerms(paragraphs, linkedTerms) {
  const termNames = Object.keys(linkedTerms);
  return paragraphs.map((p) => {
    const found = termNames.filter((t) =>
      p.text.toLowerCase().includes(t.toLowerCase())
    );
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
