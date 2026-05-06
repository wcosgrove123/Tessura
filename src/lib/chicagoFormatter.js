/**
 * Chicago Notes-Bibliography (17th ed.) formatter.
 * Handles book, article, chapter, website, video, lecture, legal.
 * This is the offline fallback — Zotero API provides pre-formatted HTML when connected.
 */

/**
 * Format author names for a footnote (first note).
 * Chicago: "First Last" for single, "First Last and First Last" for two,
 * "First Last et al." for three or more.
 */
function formatAuthorsNote(authors) {
  if (!authors?.length) return "";
  const names = authors.map((a) => `${a.given || ""} ${a.family || ""}`.trim());
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} et al.`;
}

/**
 * Format author names for a bibliography entry.
 * Chicago: "Last, First." for first author, "First Last" for subsequent.
 */
function formatAuthorsBib(authors) {
  if (!authors?.length) return "";
  const first = authors[0];
  const firstStr = first.family
    ? `${first.family}, ${first.given || ""}`.trim().replace(/,\s*$/, "")
    : first.given || "";

  if (authors.length === 1) return firstStr;
  if (authors.length === 2) {
    const second = `${authors[1].given || ""} ${authors[1].family || ""}`.trim();
    return `${firstStr}, and ${second}`;
  }
  return `${firstStr}, et al.`;
}

/**
 * Format a shortened footnote (for subsequent citations of the same source).
 * Chicago: "Last, Short Title, locator."
 */
export function formatShortenedNote(source, locator) {
  const lastName = source.authors?.[0]?.family || source.title?.split(" ")[0] || "Source";
  const shortTitle = source.title?.length > 40
    ? source.title.split(":")[0].trim()
    : source.title || "";

  let note = `${lastName}, ${shortTitle}`;
  if (locator?.value) {
    const abbrev = locator.type === "page" ? "" : `${locator.type} `;
    note += `, ${abbrev}${locator.value}`;
  }
  return note + ".";
}

/**
 * Format a full footnote for a given source and citation.
 * Chicago Notes style.
 */
export function formatFootnote(source, locator, isShortened = false) {
  if (isShortened) return formatShortenedNote(source, locator);

  const authors = formatAuthorsNote(source.authors);
  const title = source.title || "Untitled";
  const year = source.year || "n.d.";

  let note = "";

  switch (source.type) {
    case "article": {
      const journal = source.journal || "";
      const vol = source.volume ? ` ${source.volume}` : "";
      const iss = source.issue ? `, no. ${source.issue}` : "";
      note = `${authors}, "${title}," ${journal}${vol}${iss} (${year})`;
      if (source.pages) note += `: ${source.pages}`;
      break;
    }
    case "chapter": {
      const bookTitle = source.bookTitle || "";
      const editor = source.editor || "";
      note = `${authors}, "${title},"`;
      if (editor) note += ` in ${bookTitle}, ed. ${editor}`;
      else if (bookTitle) note += ` in ${bookTitle}`;
      note += ` (${source.publisher ? source.publisher + ", " : ""}${year})`;
      break;
    }
    case "website": {
      note = `${authors}${authors ? ", " : ""}"${title}"`;
      if (source.publisher) note += `, ${source.publisher}`;
      if (year !== "n.d.") note += `, ${year}`;
      if (source.url) note += `, ${source.url}`;
      break;
    }
    case "video": {
      note = `${authors}${authors ? ", " : ""}"${title}"`;
      if (source.publisher) note += `, ${source.publisher}`;
      if (year !== "n.d.") note += `, ${year}`;
      break;
    }
    case "lecture": {
      note = `${authors}, "${title}," lecture`;
      if (source.publisher) note += `, ${source.publisher}`;
      if (year !== "n.d.") note += `, ${year}`;
      break;
    }
    case "legal": {
      note = title;
      if (source.pages) note += `, ${source.pages}`;
      if (year !== "n.d.") note += ` (${year})`;
      break;
    }
    default: {
      // book (default)
      note = `${authors}, ${title}`;
      if (source.publisher) note += ` (${source.publisher}, ${year})`;
      else note += ` (${year})`;
      break;
    }
  }

  // Add locator
  if (locator?.value) {
    const abbrev = locator.type === "page" ? "" : `${locator.type} `;
    note += `, ${abbrev}${locator.value}`;
  }

  return note + ".";
}

/**
 * Format a bibliography entry for a source.
 * Chicago Bibliography style (inverted first author, period-separated).
 */
export function formatBibEntry(source) {
  const authors = formatAuthorsBib(source.authors);
  const title = source.title || "Untitled";
  const year = source.year || "n.d.";

  let entry = "";

  switch (source.type) {
    case "article": {
      const journal = source.journal || "";
      const vol = source.volume ? ` ${source.volume}` : "";
      const iss = source.issue ? `, no. ${source.issue}` : "";
      entry = `${authors}. "${title}." ${journal}${vol}${iss} (${year})`;
      if (source.pages) entry += `: ${source.pages}`;
      entry += ".";
      break;
    }
    case "chapter": {
      const bookTitle = source.bookTitle || "";
      const editor = source.editor || "";
      entry = `${authors}. "${title}."`;
      if (editor) entry += ` In ${bookTitle}, edited by ${editor}.`;
      else if (bookTitle) entry += ` In ${bookTitle}.`;
      if (source.publisher) entry += ` ${source.publisher}, ${year}.`;
      else entry += ` ${year}.`;
      break;
    }
    case "website": {
      entry = `${authors}${authors ? ". " : ""}"${title}."`;
      if (source.publisher) entry += ` ${source.publisher}.`;
      if (year !== "n.d.") entry += ` ${year}.`;
      if (source.url) entry += ` ${source.url}.`;
      break;
    }
    case "lecture": {
      entry = `${authors}. "${title}." Lecture`;
      if (source.publisher) entry += `, ${source.publisher}`;
      entry += `, ${year}.`;
      break;
    }
    default: {
      // book
      entry = `${authors}. ${title}.`;
      if (source.publisher) entry += ` ${source.publisher}, ${year}.`;
      else entry += ` ${year}.`;
      break;
    }
  }

  if (source.url && source.type !== "website") {
    entry += ` ${source.url}.`;
  }

  return entry;
}

/**
 * Format a display string for a source (for search results, cards, etc.)
 * Returns: "Dewey (1938) — Experience and Education"
 */
export function formatSourceShort(source) {
  const lastName = source.authors?.[0]?.family || "";
  const year = source.year || "n.d.";
  const title = source.title || "Untitled";
  return `${lastName}${lastName ? " " : ""}(${year}) — ${title}`;
}
