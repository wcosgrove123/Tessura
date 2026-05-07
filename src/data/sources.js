/**
 * Source schema and defaults for the citation system.
 * A Source is a bibliographic entry (book, article, website, etc.)
 */

// Source types
export const SOURCE_TYPES = {
  book: { label: "Book", icon: "B" },
  article: { label: "Article", icon: "A" },
  chapter: { label: "Chapter", icon: "Ch" },
  website: { label: "Website", icon: "W" },
  video: { label: "Video", icon: "V" },
  lecture: { label: "Lecture", icon: "L" },
  legal: { label: "Legal", icon: "Le" },
  other: { label: "Other", icon: "?" },
};

export const SOURCE_TYPE_VALUES = Object.keys(SOURCE_TYPES);

// Locator types for citations
export const LOCATOR_TYPES = {
  page: { label: "Page", abbrev: "p." },
  chapter: { label: "Chapter", abbrev: "ch." },
  section: { label: "Section", abbrev: "sec." },
  paragraph: { label: "Paragraph", abbrev: "para." },
  timestamp: { label: "Timestamp", abbrev: "" },
  line: { label: "Line", abbrev: "l." },
};

/**
 * Create a new Source with defaults.
 */
export function createSource(data = {}) {
  const now = Date.now();
  return {
    id: `src-${now}`,
    citationKey: "",
    type: "book",
    authors: [], // [{given, family}]
    title: "",
    year: "",
    publisher: null,
    journal: null,
    volume: null,
    issue: null,
    pages: null,
    url: null,
    doi: null,
    abstract: "",
    usageNotes: [], // [{id, text, date}]
    tags: [],
    category: "referenced", // "cited" | "referenced" | "consulted"
    zoteroKey: null,
    formattedBib: null,
    cslJson: null,
    createdAt: now,
    updatedAt: now,
    ...data,
  };
}

/**
 * Generate a citation key from author + year: "dewey1938"
 */
export function generateCitationKey(authors, year) {
  const lastName = authors?.[0]?.family || "unknown";
  const y = year || "nd";
  return (lastName.toLowerCase().replace(/[^a-z]/g, "") + y).slice(0, 30);
}

/**
 * Best-effort parser for Chicago-style bibliography strings.
 * Handles: "Author, First. Title. Publisher, Year."
 * and: "Author, First. \"Article Title.\" Journal Vol, no. Issue (Year): Pages."
 */
export function parseChicagoBibEntry(text) {
  const source = { type: "book", authors: [], title: "", year: "", publisher: null, journal: null };

  if (!text || typeof text !== "string") return source;

  // Try to extract year
  const yearMatch = text.match(/\b(1[5-9]\d{2}|20[0-2]\d)\b/);
  if (yearMatch) source.year = yearMatch[1];

  // Try to split on first period after author name
  // Pattern: "LastName, FirstName." or "LastName, FirstName, and ..."
  const authorEnd = text.indexOf(". ");
  if (authorEnd > 0 && authorEnd < 80) {
    const authorStr = text.slice(0, authorEnd);
    const rest = text.slice(authorEnd + 2);

    // Parse authors (handle "LastName, FirstName" and "LastName, FirstName, and SecondAuthor")
    const authorParts = authorStr.split(/,\s*and\s+|;\s*/);
    for (const part of authorParts) {
      const comma = part.indexOf(",");
      if (comma > 0) {
        source.authors.push({
          family: part.slice(0, comma).trim(),
          given: part.slice(comma + 1).trim().replace(/\.$/, ""),
        });
      } else if (part.trim()) {
        source.authors.push({ family: part.trim(), given: "" });
      }
    }

    // Detect article vs book by looking for quoted title
    const quotedMatch = rest.match(/^"([^"]+)"\s*[.,]/);
    if (quotedMatch) {
      source.type = "article";
      source.title = quotedMatch[1];
      // Try to extract journal name after the article title
      const afterTitle = rest.slice(quotedMatch[0].length).trim();
      const journalMatch = afterTitle.match(/^([^,]+)/);
      if (journalMatch) source.journal = journalMatch[1].trim();
    } else {
      // Book title: everything up to the next period or publisher
      const titleMatch = rest.match(/^([^.]+)\./);
      if (titleMatch) {
        source.title = titleMatch[1].replace(/\*|_/g, "").trim();
      }
    }

    // Try to extract publisher
    const pubMatch = rest.match(/([A-Z][^,]+(?:Press|Publishing|Books|University|Inc\.|Ltd\.|Company|Routledge|Springer))/i);
    if (pubMatch) source.publisher = pubMatch[1].trim();
  } else {
    // Fallback: use the whole text as title
    source.title = text.replace(/\.$/, "").trim();
  }

  // Generate citation key
  source.citationKey = generateCitationKey(source.authors, source.year);

  return source;
}

/**
 * Migrate existing bibliography notes to Source objects.
 */
export function migrateBibNotesToSources(notes) {
  return notes
    .filter((n) => n.category === "bibliography")
    .map((n) => {
      const parsed = parseChicagoBibEntry(n.text);
      return createSource({
        id: `src-${n.id}`, // deterministic ID from note ID
        ...parsed,
        tags: n.tags || [],
        category: "referenced",
        createdAt: n.createdAt || Date.now(),
        updatedAt: n.updatedAt || Date.now(),
      });
    });
}

// Load the hand-curated sources from the migration. The file is generated
// locally (see scripts/load-clean-sources.cjs) and gitignored, so use Vite's
// glob import to fall back to an empty list when it isn't present (e.g. CI).
const migratedSourcesModules = import.meta.glob("./migrated-sources.json", { eager: true });
const MIGRATED_SOURCES = migratedSourcesModules["./migrated-sources.json"]?.default ?? [];

// Strip internal tracking fields (_footnotes, _inlineCitations, etc.)
export const DEFAULT_SOURCES = MIGRATED_SOURCES.map((s) => {
  const { _footnotes, _inlineCitations, _locators, _needsResolution, ...clean } = s;
  return clean;
});
