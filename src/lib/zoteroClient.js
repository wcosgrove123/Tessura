/**
 * Zotero Web API v3 client.
 * Plain fetch wrapper — no npm package needed.
 * Docs: https://www.zotero.org/support/dev/web_api/v3/basics
 */

const BASE = "https://api.zotero.org";

function headers(apiKey) {
  return {
    "Zotero-API-Key": apiKey,
    "Zotero-API-Version": "3",
  };
}

/**
 * Test the connection by fetching 1 item.
 * Returns { ok: true, username } on success, { ok: false, error } on failure.
 */
export async function testConnection(userId, apiKey) {
  try {
    const res = await fetch(`${BASE}/users/${userId}/items?limit=1&format=json`, {
      headers: headers(apiKey),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Search the user's Zotero library.
 * Returns an array of Source-shaped objects (converted from Zotero format).
 */
export async function searchLibrary(userId, apiKey, query, style = "chicago-note-bibliography") {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    include: "data,bib,citation",
    style,
    limit: "15",
  });
  const res = await fetch(`${BASE}/users/${userId}/items?${params}`, {
    headers: headers(apiKey),
  });
  if (!res.ok) throw new Error(`Zotero API error: ${res.status}`);
  const items = await res.json();
  return items
    .filter((item) => item.data?.itemType && item.data.itemType !== "attachment" && item.data.itemType !== "note")
    .map((item) => zoteroItemToSource(item));
}

/**
 * Get a single Zotero item by key.
 */
export async function getItem(userId, apiKey, itemKey, style = "chicago-note-bibliography") {
  const params = new URLSearchParams({
    format: "json",
    include: "data,bib,citation",
    style,
  });
  const res = await fetch(`${BASE}/users/${userId}/items/${itemKey}?${params}`, {
    headers: headers(apiKey),
  });
  if (!res.ok) throw new Error(`Zotero API error: ${res.status}`);
  const item = await res.json();
  return zoteroItemToSource(item);
}

/**
 * Map Zotero itemType to our Source type enum.
 */
function mapItemType(zoteroType) {
  const map = {
    book: "book",
    bookSection: "chapter",
    journalArticle: "article",
    magazineArticle: "article",
    newspaperArticle: "article",
    conferencePaper: "article",
    thesis: "book",
    report: "book",
    webpage: "website",
    blogPost: "website",
    videoRecording: "video",
    film: "video",
    podcast: "video",
    presentation: "lecture",
    statute: "legal",
    case: "legal",
    bill: "legal",
    hearing: "legal",
  };
  return map[zoteroType] || "other";
}

/**
 * Convert a Zotero API item to our Source shape.
 */
function zoteroItemToSource(item) {
  const data = item.data || {};
  const creators = (data.creators || []).filter((c) => c.creatorType === "author" || c.creatorType === "editor");

  const authors = creators.map((c) => ({
    given: c.firstName || "",
    family: c.lastName || "",
  }));

  // Extract year from date
  const dateStr = data.date || "";
  const yearMatch = dateStr.match(/\b(1[5-9]\d{2}|20[0-2]\d)\b/);
  const year = yearMatch ? yearMatch[1] : dateStr.slice(0, 4) || "";

  // Citation key
  const lastName = authors[0]?.family || "unknown";
  const citationKey = (lastName.toLowerCase().replace(/[^a-z]/g, "") + year).slice(0, 30);

  return {
    id: `src-zotero-${item.key || Date.now()}`,
    citationKey,
    type: mapItemType(data.itemType),
    authors,
    title: data.title || "",
    year,
    publisher: data.publisher || data.university || null,
    journal: data.publicationTitle || null,
    volume: data.volume || null,
    issue: data.issue || null,
    pages: data.pages || null,
    url: data.url || null,
    doi: data.DOI || null,
    abstract: data.abstractNote || "",
    usageNotes: [],
    tags: (data.tags || []).map((t) => t.tag),
    category: "referenced",
    zoteroKey: item.key,
    formattedBib: item.bib || null,
    cslJson: data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    _isNew: true, // signal to the caller to persist this
  };
}

/**
 * Load Zotero settings from localStorage.
 */
export function loadZoteroSettings() {
  try {
    const raw = localStorage.getItem("tessera-zotero");
    return raw ? JSON.parse(raw) : { userId: "", apiKey: "", connected: false };
  } catch {
    return { userId: "", apiKey: "", connected: false };
  }
}

/**
 * Save Zotero settings to localStorage.
 */
export function saveZoteroSettings(settings) {
  localStorage.setItem("tessera-zotero", JSON.stringify(settings));
}
