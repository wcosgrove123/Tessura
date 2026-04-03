# Tessera — Known Issues & Bugs

## Critical (Data Integrity)

### 1. Citation Anchor Fragility
**Location**: `src/components/ParagraphEditor.jsx` (lines ~251-331)
**Issue**: Citation and comment `inlineRange { from, to }` positions become invalid after text edits. The re-anchoring logic tries to recover using `anchorText`, but fails if text has been significantly rewritten. No periodic re-validation occurs.
**Impact**: Footnote superscripts can appear at wrong positions or disappear entirely.
**Fix**: Store paragraph content hash alongside anchors; use diffing to track edits and adjust positions.

### 2. Footnote Number Misalignment
**Location**: `src/components/PrintPreview.jsx`, `src/components/Editor.jsx`
**Issue**: Footnote numbers in text `[1]`, `[2]` etc. are hardcoded at insertion time. No automatic re-numbering when citations are added, removed, or reordered. PrintPreview re-indexes on render, but draft view doesn't update.
**Impact**: Citation numbers can appear out of order in the editor. Print preview may show different numbers than draft.
**Fix**: Compute `noteIndexMap` dynamically from citations on every render; apply as superscripts in both draft and preview.

### 3. No Undo/Redo for Citations or Sources
**Location**: `src/hooks/useWorkspaceState.js`
**Issue**: Only `projects` state is captured in the undo stack. Citation add/remove, source add/remove, and note operations are not undoable.
**Impact**: User can accidentally delete a citation or source with no recovery except page refresh (if saved).
**Fix**: Extend `pushUndo()` to snapshot citations, sources, and notes alongside projects.

## Medium (UX / Functionality)

### 4. View State Not Persisted
**Location**: `src/hooks/useWorkspaceState.js` (line ~206)
**Issue**: The active view tab (`editor`/`brainstorm`/`argmap`/`calculus`/`dictionary`) resets to "editor" on page refresh. Same for `zenMode`.
**Impact**: User loses their place when refreshing.
**Fix**: Add `view` and `zenMode` to the `tessera-decisions` localStorage key.

### 5. Editor Sub-View Not Persisted
**Location**: `src/components/Editor.jsx`
**Issue**: `editorMode` state (`draft`/`outline`/`expanded`/`fulltext`) resets to "draft" on refresh.
**Impact**: User loses their preferred view mode on refresh.
**Fix**: Persist `editorMode` in `tessera-decisions`.

### 6. Comment Mark Low Visibility
**Location**: `src/components/ParagraphEditor.jsx`
**Issue**: Comment marks use 15% opacity background which is nearly invisible. No visual distinction between resolved and open comments. No threaded replies UI.
**Impact**: Hard to see comments in text; can't tell which are resolved.
**Fix**: Increase contrast, add resolved styling (e.g. strikethrough or green tint), consider thread UI.

### 7. Layout Shift on Paragraph Selection
**Location**: `src/components/Editor.jsx` (lines ~1064-1070)
**Issue**: When a paragraph is selected, padding/border changes cause surrounding paragraphs to shift.
**Impact**: Visual jitter during rapid clicking between paragraphs.
**Fix**: Use `outline` or `box-shadow` instead of `padding`/`border` changes, or reserve space with transparent borders.

### 8. Citation Popover Position Staleness
**Location**: `src/components/CitationPopover.jsx`
**Issue**: Popover position is stored as x/y coordinates. If the user resizes the viewport while the popover is open, position becomes stale.
**Impact**: Popover floats in wrong position after resize.
**Fix**: Store paragraph ID + text selection range instead of viewport coordinates; recompute position on resize.

## Low (Polish / Edge Cases)

### 9. Search Results Incomplete Navigation
**Location**: `src/components/TopBar.jsx` (line ~74)
**Issue**: Note search results try to navigate to linked section but check `r.note.linkedProjectId` which may not be set for all notes.
**Impact**: Clicking some note search results does nothing.
**Fix**: Fallback to showing note in brainstorm view if no linked section.

### 10. TermHighlight Performance
**Location**: `src/components/TermHighlight.jsx`
**Issue**: `renderTermLinks()` is O(n^2) — each term creates a regex and tests against remaining text. No caching of compiled regexes across renders. Only first occurrence of each term is highlighted.
**Impact**: Possible slowness on paragraphs with many terms; missed highlights on repeated terms.
**Fix**: Cache compiled regexes; highlight all occurrences.

### 11. DocImporter Footnote Symbol Assumption
**Location**: `src/components/DocImporter.jsx` (line ~70)
**Issue**: Footnote anchor removal expects "↑" back-link symbol, but Word may generate different symbols.
**Impact**: Some imported footnotes may retain back-link characters.
**Fix**: Use regex pattern matching for any common back-link symbols.

### 12. ArgumentMap No Search/Filter
**Location**: `src/components/ArgumentMap.jsx`
**Issue**: The argument map always shows ALL projects and ALL sections. No way to filter or search.
**Impact**: Graph becomes unwieldy with 255 sections across 3 projects.
**Fix**: Add project filter toggles and search input.

### 13. DictionaryView Term Matching Fragility
**Location**: `src/components/DictionaryView.jsx` (lines ~170-212)
**Issue**: Term name matching is regex-based and case-insensitive but doesn't handle plurals, verb forms, or hyphenated variants.
**Impact**: Some valid term connections may be missed in the constellation graph.
**Fix**: Use stemming or fuzzy matching for term detection.

### 14. No Diagram Support
**Issue**: The Word documents contain inline diagrams (Piaget's hierarchy, Fink's orrery, etc.) that are lost on import. No way to recreate or embed diagrams in Tessera.
**Impact**: Critical scholarly content is missing from the digital workspace.
**Fix**: Build diagram builder feature (see plan).
