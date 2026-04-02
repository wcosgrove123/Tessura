# CLAUDE.md — Project Context for Claude Code

## What This Is

Tessera is a scholarly writing workspace for Wil Cosgrove, a master's student in Curriculum Design & Pedagogy at GW. He's writing an interconnected academic project spanning three subprojects:

1. **Purpose of Schools — Expanded**: A book-length thesis arguing that K-12 curriculum should shift from content-first to metacognition-first. Traces 250 years of curriculum history, analyzes power structures, introduces a cognitive oppression framework, and proposes a complete school restructure.

2. **The Axiometric Calculus**: A formal symbolic system (like a mathematical notation) for expressing relational meaning. Core insight: A =* B means mutual containment — meaning is always bidirectional.

3. **The Ontological Dictionary**: A relational dictionary where each term is defined as an equation of other terms. Terms include noema, schema, perifield, contexture, cogniscience, endospection, etc.

These three projects are deeply interconnected — terms from the Dictionary appear throughout the book, the Calculus provides the formal notation, and the book's arguments depend on concepts formalized in both.

## How Wil Works

- His writing process is a web, not a chain. He expands ideas outward, then compresses into a "spine" (single thesis sentence).
- He stops mid-draft to brainstorm, make maps, find the spine, then restructure everything around it.
- He iterates through conversation — the reasoning trail matters as much as the final draft.
- Every section has a spine sentence. Every paragraph has a role (setup, claim, evidence, bridge, synthesis).
- Cross-project linking is the #1 priority — terms used across all three projects need to be traceable.

## Current Architecture (v0.3)

### Data Model: Recursive Section Tree
```
Project → Part → Section (recursive, nests indefinitely) → Paragraphs
```
Full documentation: `docs/architecture/data-model.md`

### Component Structure
```
TesseraWorkspace
├── TopBar (search, view tabs, import)
├── Sidebar (collapsible tree navigator)
├── Editor (TipTap rich text, breadcrumbs, spine editing)
│   └── ParagraphEditor (per-paragraph TipTap instance)
├── Brainstorm (categorized notes with tags)
├── ArgumentMap (React Flow interactive graph)
└── CrossRefPanel (linked terms + spines)
```
Full documentation: `docs/architecture/components.md`

### Key Libraries
- **TipTap** — Rich text editing (bold, italic, underline, highlight, lists)
- **React Flow** (@xyflow/react) — Interactive argument map
- **mammoth** — .docx import
- **Lucide React** — Icons

### Data Files
- `src/data/projects.js` — All content (784 paragraphs, 72 sections, auto-generated from docx)
- `src/data/linkedTerms.js` — 8 cross-project terms with symbols, definitions, refs
- `src/data/constants.js` — Status/role/palette constants
- `src/data/notes.js` — 38 categorized brainstorm notes (ideas, questions, tasks, bibliography)

### State & Persistence
- Central state in `src/hooks/useWorkspaceState.js` with tree traversal helpers
- localStorage auto-save (500ms debounce): `tessera-workspace`, `tessera-notes`, `tessera-decisions`
- Old flat data model auto-detected and reset to defaults

## Design Language

- Warm parchment/library aesthetic (NOT dark mode, NOT generic tech)
- Cormorant Garamond for headings, Spectral for body, IBM Plex Mono for UI
- Background: #FAF7F2 (warm cream), Text: #2C2418 (dark walnut), Accent: #8B4513 (saddlebrown)
- Project colors: Purpose of Schools = #2A5F7C (slate blue), Calculus = #2D6B5A (forest green), Dictionary = #9E5A2A (burnt sienna)
- Status colors use soft botanical tones with visible borders
- The top bar stays dark (#2C2418) for contrast

## Commands

```bash
npm run dev    # Start dev server on port 8345
npm run build  # Production build
```

## Purpose of Schools — Document Structure

The main thesis (787 paragraphs) is organized as:
- **Part I: Philosophy & Rationale** (written, polished)
  - **WHY**: Introduction → Strong Scaffolds → Pyramids Built on Quicksand → Thermometers
  - **WHAT**: Intermission → Curriculum as a Concept
  - **WHO**: Who Is in Charge → Who Does Not Have the Power
- **Part II: Implementation** (outline stage)
  - Sections 5-9: Rethinking Oppression → Currere → Metacognitive Curriculum (4 levels deep) → Technology & AI → Call to Action
- **Conclusion** + **Working Notes**

## Writing Source Files

Located at `docs/writings/Purpose of School/`:
- `Purpose of Schools - expanded.docx` — Main thesis (imported)
- `Axiometric Calculus/` — 2 .docx files (NOT YET IMPORTED)
- `Ontological Dictionary/` — 2 .docx + 1 .xlsx (NOT YET IMPORTED)
- `Early Drafts/` — Older drafts, feedback, oppression section drafts

Import guides: `docs/import-guides/axiometric-calculus.md`, `docs/import-guides/ontological-dictionary.md`

## Import Script

`scripts/generate-projects.cjs` — Node script that:
1. Reads `imported-paragraphs.json` (generated from mammoth)
2. Maps paragraphs to section IDs in the tree
3. Generates `src/data/projects.js` with full content

To re-import or extend: modify the section mapping in the script, run `node scripts/generate-projects.cjs`

## Priority Order for Next Features

1. **Import Axiometric Calculus** from .docx files (see `docs/import-guides/axiometric-calculus.md`)
2. **Import Ontological Dictionary** from .docx + .xlsx (see `docs/import-guides/ontological-dictionary.md`)
3. **Expand linked terms** — Dictionary will define 20-50+ terms; all need cross-refs
4. **Diagram builder** — Visual concept maps (Mermaid, D2, or custom React)
5. **Zotero API** — Citation management
6. **Spine validation view** — Read-through showing only spine + first/last sentences

Full TODO: `docs/TODO.md`
