/**
 * Shared utilities for importing .docx files into Tessera's data model.
 * Used by import-axiometric-calculus.cjs and import-ontological-dictionary.cjs.
 */

const mammoth = require('mammoth');
const cheerio = require('cheerio');

/**
 * Convert a .docx file to HTML via mammoth.
 * @param {string} filePath
 * @returns {Promise<string>} HTML string
 */
async function docxToHtml(filePath) {
  const result = await mammoth.convertToHtml({ path: filePath });
  if (result.messages.length > 0) {
    console.warn(`mammoth warnings for ${filePath}:`, result.messages);
  }
  return result.value;
}

/**
 * Split HTML into chunks at heading boundaries.
 * Returns array of { title, content } where content is the HTML between headings.
 * @param {string} html - Full HTML string
 * @param {string} tag - Heading tag to split on ('h1', 'h2', 'h3')
 * @returns {Array<{title: string, content: string}>}
 */
function splitByHeading(html, tag) {
  const $ = cheerio.load(html, null, false);
  const root = $.root();
  const children = root.children().toArray();

  const chunks = [];
  let currentTitle = null;
  let currentElements = [];

  for (const el of children) {
    const tagName = el.tagName?.toLowerCase();
    if (tagName === tag) {
      // Save previous chunk
      if (currentTitle !== null) {
        chunks.push({
          title: currentTitle,
          content: currentElements.map(e => $.html(e)).join('')
        });
      }
      currentTitle = $(el).text().trim();
      currentElements = [];
    } else {
      if (currentTitle !== null) {
        currentElements.push(el);
      }
      // Elements before the first heading are preamble — stored as title=null chunk
      else if (chunks.length === 0 && currentTitle === null) {
        if (!chunks._preamble) chunks._preamble = [];
        chunks._preamble = chunks._preamble || [];
        chunks._preamble.push(el);
      }
    }
  }

  // Save final chunk
  if (currentTitle !== null) {
    chunks.push({
      title: currentTitle,
      content: currentElements.map(e => $.html(e)).join('')
    });
  }

  // Attach preamble if any
  if (chunks._preamble) {
    chunks.preamble = chunks._preamble.map(e => $.html(e)).join('');
    delete chunks._preamble;
  }

  return chunks;
}

/**
 * Extract elements from HTML content, returning paragraph/table info.
 * @param {string} html
 * @returns {Array<{type: string, tag: string, html: string, text: string}>}
 */
function elementsFromHtml(html) {
  const $ = cheerio.load(html, null, false);
  const results = [];

  $.root().children().each((_, el) => {
    const tagName = el.tagName?.toLowerCase();
    if (!tagName) return;

    if (tagName === 'p') {
      const text = $(el).text().trim();
      if (text.length === 0) return; // skip empty paragraphs
      results.push({
        type: 'paragraph',
        tag: tagName,
        html: $(el).html(),
        text
      });
    } else if (tagName === 'table') {
      results.push({
        type: 'table',
        tag: tagName,
        html: $.html(el),
        text: $(el).text().trim()
      });
    } else if (tagName === 'ul' || tagName === 'ol') {
      // Convert lists to paragraph text
      const items = [];
      $(el).find('li').each((_, li) => {
        items.push($(li).html());
      });
      const listHtml = items.map((item, i) => {
        const bullet = tagName === 'ol' ? `${i + 1}. ` : '• ';
        return bullet + item;
      }).join('<br>');
      results.push({
        type: 'paragraph',
        tag: tagName,
        html: listHtml,
        text: $(el).text().trim()
      });
    } else if (['h1', 'h2', 'h3', 'h4'].includes(tagName)) {
      results.push({
        type: 'heading',
        tag: tagName,
        html: $(el).html(),
        text: $(el).text().trim()
      });
    }
  });

  return results;
}

/**
 * Convert a table HTML to an array of paragraph objects.
 * Header row → setup paragraph. Data rows → definition paragraphs.
 * @param {string} tableHtml
 * @param {string} idPrefix - ID prefix for generated paragraphs
 * @param {number} startIndex - Starting index for paragraph IDs
 * @returns {Array<Object>} paragraph objects
 */
function tableToParas(tableHtml, idPrefix, startIndex = 0) {
  const $ = cheerio.load(tableHtml, null, false);
  const paras = [];
  let idx = startIndex;

  // Get header columns
  const headers = [];
  $('thead th, thead td').each((_, th) => {
    headers.push($(th).text().trim());
  });

  // If no thead, try first row
  if (headers.length === 0) {
    $('tr').first().find('th, td').each((_, cell) => {
      headers.push($(cell).text().trim());
    });
  }

  // Data rows
  const rows = $('tbody tr').toArray();
  // If no tbody, use all rows except first (header)
  const dataRows = rows.length > 0 ? rows : $('tr').toArray().slice(1);

  for (const row of dataRows) {
    const cells = [];
    $(row).find('td, th').each((i, cell) => {
      const header = headers[i] || `Col${i + 1}`;
      const val = stripTags($(cell).html());
      cells.push(`${header}: ${val}`);
    });
    if (cells.length > 0) {
      idx++;
      paras.push(makePara(
        `${idPrefix}-t${idx}`,
        cells.join(' | '),
        'definition',
        []
      ));
    }
  }

  return paras;
}

/**
 * Strip all HTML tags, converting to plain text.
 * TipTap paragraph system uses plain text, not HTML.
 * @param {string} html
 * @returns {string}
 */
function stripTags(html) {
  if (!html) return '';
  return html
    // Convert <br> to space
    .replace(/<br\s*\/?>/gi, ' ')
    // Strip all tags
    .replace(/<[^>]+>/g, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect linked terms in text.
 * @param {string} text - Plain or light-HTML text
 * @param {string[]} termKeys - Array of term keys to scan for
 * @returns {string[]} Matching term keys
 */
function detectTerms(text, termKeys) {
  if (!text) return [];
  const plainText = text.replace(/<[^>]+>/g, '').toLowerCase();
  const matched = [];

  // Sort by length descending to match longer terms first
  const sorted = [...termKeys].sort((a, b) => b.length - a.length);

  for (const key of sorted) {
    // Handle multi-word terms and special chars
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Use word boundary for normal terms
    const regex = new RegExp(`\\b${escapedKey}\\b`, 'i');
    if (regex.test(plainText)) {
      matched.push(key);
    }
  }

  return matched;
}

/**
 * Auto-detect spine role from paragraph text.
 * @param {string} text
 * @returns {string}
 */
function autoSpineRole(text) {
  const plain = text.replace(/<[^>]+>/g, '');
  if (/^(Definition:|Part of Speech:)/i.test(plain)) return 'definition';
  if (/[≝=\*∋∴⊢↝⇒↔∀∃]/.test(plain)) return 'claim';
  if (/^(P[₀-₇]|A[₀-₄]|C[₀-₂]|T[₀-₅])[\s(:]/.test(plain)) return 'claim';
  if (/^(Rationale|Dependencies|Implications|The crucial|The formal|The connection)/i.test(plain)) return 'evidence';
  if (/^(Example|Note|Key)/i.test(plain)) return 'evidence';
  if (plain.length < 30) return 'setup';
  return 'claim';
}

/**
 * Create a paragraph object.
 */
function makePara(id, text, spineRole, linkedTerms) {
  return {
    id,
    text: text || '',
    status: 'revised',
    spineRole: spineRole || 'claim',
    linkedTerms: linkedTerms || []
  };
}

/**
 * Create a section object.
 */
function makeSec(id, title, spine, status, children, paragraphs) {
  return {
    id,
    title: title || '',
    spine: spine || '',
    status: status || 'revised',
    children: children || [],
    paragraphs: paragraphs || []
  };
}

/**
 * Generate a slug from a title string.
 * @param {string} title
 * @param {string} prefix
 * @returns {string}
 */
function slugify(title, prefix) {
  const slug = title
    .toLowerCase()
    .replace(/[₀-₉]/g, (c) => String(c.codePointAt(0) - 0x2080)) // subscript digits to regular
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);
  return prefix ? `${prefix}-${slug}` : slug;
}

/**
 * Extract the first sentence from text (up to 150 chars) for use as a spine.
 * @param {string} text
 * @returns {string}
 */
function firstSentence(text) {
  const plain = text.replace(/<[^>]+>/g, '');
  const match = plain.match(/^[^.!?]+[.!?]/);
  const sentence = match ? match[0].trim() : plain.substring(0, 150).trim();
  return sentence.length > 150 ? sentence.substring(0, 147) + '...' : sentence;
}

module.exports = {
  docxToHtml,
  splitByHeading,
  elementsFromHtml,
  tableToParas,
  stripTags,
  detectTerms,
  autoSpineRole,
  makePara,
  makeSec,
  slugify,
  firstSentence
};
